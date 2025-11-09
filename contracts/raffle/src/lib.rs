#![no_std]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, IntoVal, Symbol, Val, Vec};

mod error;
mod events;
mod storage;
mod types;

use error::Error;
use types::{Config, Round, RoundStats, State, WinnerRecord};

#[contract]
pub struct LuckyLedgersRaffle;

#[contractimpl]
impl LuckyLedgersRaffle {
    pub fn __constructor(
        env: &Env, 
        admin: Address,
        vrf_contract: Address,       // MockVRF address
        underlying_token: Address,   // Underlying Token address
        ticket_price: i128,          // e.g., 5_000_000 = 0.5 XLM
        target_participants: u32     // e.g., 10 players triggers draw
    ) {
        // Set the admin in storage
        storage::set_admin(env, &admin);

        let config: Config = Config {
            vrf_contract,
            underlying_token,
            ticket_price,
            target_participants
        };

        storage::set_config(env, config);
        storage::create_new_round(env);
    }

    /// Enter the current raffle round by buying tickets
    pub fn enter(env: Env, caller: Address, num_tickets: u32) -> Result<u32, Error> {
        caller.require_auth();

        let config = storage::get_config(&env)?;
        let round = storage::get_current_round(&env)?;
        let round_num = round.round;

        // Validate round state
        if round.state != State::OPEN {
            return Err(Error::RoundNotOpen);
        }

        // Get current round stats
        let mut stats = storage::get_round_stats(&env, round_num)?;

        // Calculate payment amount
        let amount = (num_tickets as i128)
            .checked_mul(config.ticket_price)
            .unwrap();

        // Transfer tokens from caller to contract
        let token_client = Self::token_client(&env, config.underlying_token.clone());
        token_client.transfer(&caller, &env.current_contract_address(), &amount);

        // Here the transfered amount could be deposited into Blend or DeFindex

        // Check if this is user's first entry (new participant)
        let previous_tickets = storage::get_user_tickets(&env, round_num, &caller);
        let is_new_participant = previous_tickets == 0;

        // Add tickets for user
        storage::add_user_tickets(&env, round_num, &caller, num_tickets);
        let user_total_tickets = previous_tickets + num_tickets;

        // If new participant, add to participant bucket
        if is_new_participant {
            storage::add_participant(&env, round_num, &caller);
        }

        // Update round stats
        stats.total_tickets = stats.total_tickets.checked_add(num_tickets).unwrap();
        stats.prize_pool = stats.prize_pool.checked_add(amount).unwrap();
        storage::set_round_stats(&env, round_num, &stats);

        // Emit event
        events::emit_player_entered(&env, round_num, &caller, num_tickets, stats.total_tickets);

        // Check if we've reached target participants
        if stats.total_participants >= config.target_participants {
            events::emit_ready_to_draw(&env, round_num, stats.total_participants);
        }

        storage::extend_instance_ttl(&env);
        Ok(user_total_tickets)
    }

    /// Request a random number draw (anyone can call once target met)
    pub fn request_draw(env: Env) -> Result<u64, Error> {
        let config = storage::get_config(&env)?;
        let round = storage::get_current_round(&env)?;
        let round_num = round.round;

        // Validate round state
        if round.state != State::OPEN {
            return Err(Error::InvalidState);
        }

        // Check if target participants met
        let stats = storage::get_round_stats(&env, round_num)?;
        if stats.total_participants < config.target_participants {
            return Err(Error::TargetNotMet);
        }

        // Transition to DRAWING state
        storage::set_round_state(&env, round_num, State::DRAWING);

        // Call VRF contract to request random number
        let vrf_args: Vec<Val> = (env.current_contract_address(),).into_val(&env);

        let random_value: u64 = env.invoke_contract(
            &config.vrf_contract,
            &Symbol::new(&env, "request_random"),
            vrf_args,
        );

        // Store the random value (VRF immediately calls back with fulfill_random)
        storage::set_round_vrf_request(&env, round_num, random_value);

        // Emit event
        events::emit_draw_requested(&env, round_num, random_value);

        storage::extend_instance_ttl(&env);
        Ok(random_value)
    }

    /// VRF callback to fulfill randomness and select winner (AUTO-RESTART!)
    pub fn fulfill_random(env: Env, vrf: Address, random_value: u64) -> Result<(), Error> {
        let config = storage::get_config(&env)?;

        // CRITICAL: Verify caller is VRF contract
        if vrf != config.vrf_contract {
            return Err(Error::UnauthorizedVRF);
        }

        let round = storage::get_current_round(&env)?;
        let round_num = round.round;

        // Validate round state
        if round.state != State::DRAWING {
            return Err(Error::InvalidState);
        }

        // Get round stats to select winner
        let stats = storage::get_round_stats(&env, round_num)?;

        // Select winning ticket: random_value % total_tickets
        let winning_ticket = (random_value % stats.total_tickets as u64) as u32;

        // Find winner by iterating through participants' tickets
        let winner = Self::find_winner_by_ticket(&env, round_num, winning_ticket, &stats)?;

        // Store winner record
        let winner_record = WinnerRecord {
            winner: winner.clone(),
            round: round_num,
            amount: stats.prize_pool,
            claimed: false,
        };
        storage::set_winner_record(&env, round_num, &winner_record);

        // Mark round as COMPLETED
        storage::set_round_state(&env, round_num, State::COMPLETED);

        // Emit winner selected event
        events::emit_winner_selected(&env, round_num, &winner, stats.prize_pool);

        // **AUTO-RESTART: Create next round**
        storage::create_new_round(&env);
        let next_round = storage::get_current_round_number(&env);
        events::emit_round_started(&env, next_round);

        storage::extend_instance_ttl(&env);
        Ok(())
    }

    /// Claim prize for a specific round (CEI pattern for re-entrancy safety)
    pub fn claim_prize(env: Env, claimer: Address, round: u32) -> Result<i128, Error> {
        claimer.require_auth();

        // CHECKS: Validate winner record exists
        let winner_record = storage::get_winner_record(&env, round)
            .ok_or(Error::WinnerNotFound)?;

        // Validate claimer is the winner
        if claimer != winner_record.winner {
            return Err(Error::NotWinner);
        }

        // Validate not already claimed
        if winner_record.claimed {
            return Err(Error::AlreadyClaimed);
        }

        let prize_amount = winner_record.amount;

        // EFFECTS: Update state BEFORE external calls
        storage::update_winner_claimed(&env, round)?;

        // INTERACTIONS: Transfer tokens (external call LAST)
        let config = storage::get_config(&env)?;
        let token_client = Self::token_client(&env, config.underlying_token);
        token_client.transfer(&env.current_contract_address(), &claimer, &prize_amount);

        // Emit event
        events::emit_prize_claimed(&env, round, &claimer, prize_amount);

        storage::extend_instance_ttl(&env);
        Ok(prize_amount)
    }

    /// Claim all unclaimed prizes for a user across all rounds
    pub fn claim_all_prizes(env: Env, claimer: Address) -> Result<i128, Error> {
        claimer.require_auth();

        let winning_rounds = storage::get_user_winning_rounds(&env, &claimer);
        let mut total_claimed: i128 = 0;

        for round in winning_rounds.iter() {
            let winner_record = storage::get_winner_record(&env, round);

            if let Some(record) = winner_record {
                if !record.claimed {
                    // Claim this prize (re-use claim logic)
                    let amount = Self::claim_prize(env.clone(), claimer.clone(), round)?;
                    total_claimed = total_claimed.checked_add(amount).unwrap();
                }
            }
        }

        Ok(total_claimed)
    }

    /// Upgrade the contract to new wasm. Only callable by admin.
    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
        Self::require_admin(env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// Get current admin
    pub fn admin(env: &Env) -> Result<Address, Error> {
        storage::get_admin(env)
    }

    /// Set a new admin. Only callable by admin.
    pub fn set_new_admin(env: &Env, admin: Address) {
        Self::require_admin(env);
        storage::extend_instance_ttl(env);
        storage::set_admin(env, &admin);
    }

    // ========== VIEW/QUERY FUNCTIONS ==========

    /// Get current round number
    pub fn get_current_round_number(env: Env) -> u32 {
        storage::get_current_round_number(&env)
    }

    /// Get round information
    pub fn get_round_info(env: Env, round: u32) -> Result<Round, Error> {
        storage::get_round_by_index(&env, round)
    }

    /// Get round statistics
    pub fn get_round_stats(env: Env, round: u32) -> Result<RoundStats, Error> {
        storage::get_round_stats(&env, round)
    }

    /// Get user's ticket count for a round
    pub fn get_user_tickets(env: Env, round: u32, user: Address) -> u32 {
        storage::get_user_tickets(&env, round, &user)
    }

    /// Get all participants for a round
    pub fn get_participants(env: Env, round: u32) -> Vec<Address> {
        storage::get_all_participants(&env, round)
    }

    /// Get winner record for a round
    pub fn get_winner(env: Env, round: u32) -> Option<WinnerRecord> {
        storage::get_winner_record(&env, round)
    }

    /// Get all rounds where a user won
    pub fn get_user_winning_rounds(env: Env, user: Address) -> Vec<u32> {
        storage::get_user_winning_rounds(&env, &user)
    }

    /// Get all unclaimed prizes for a user
    pub fn get_unclaimed_prizes(env: Env, user: Address) -> Vec<WinnerRecord> {
        let winning_rounds = storage::get_user_winning_rounds(&env, &user);
        let mut unclaimed = Vec::new(&env);

        for round in winning_rounds.iter() {
            if let Some(record) = storage::get_winner_record(&env, round) {
                if !record.claimed {
                    unclaimed.push_back(record);
                }
            }
        }

        unclaimed
    }

    /// Check if current round is ready to draw
    pub fn is_ready_to_draw(env: Env) -> Result<bool, Error> {
        let config = storage::get_config(&env)?;
        let round = storage::get_current_round(&env)?;
        let stats = storage::get_round_stats(&env, round.round)?;

        Ok(round.state == State::OPEN && stats.total_participants >= config.target_participants)
    }

    /// Get contract configuration
    pub fn get_config(env: Env) -> Result<Config, Error> {
        storage::get_config(&env)
    }

    // ========== PRIVATE HELPER FUNCTIONS ==========

    /// Private helper function to require auth from the admin
    fn require_admin(env: &Env) {
        let admin = storage::get_admin(env).unwrap();
        admin.require_auth();
    }

    fn token_client<'a>(env: &Env, contract_id: Address) -> soroban_sdk::token::TokenClient<'a> {
        soroban_sdk::token::TokenClient::new(env, &contract_id)
    }

    /// Find winner by iterating through participants' ticket allocations
    fn find_winner_by_ticket(
        env: &Env,
        round: u32,
        winning_ticket: u32,
        _stats: &RoundStats,
    ) -> Result<Address, Error> {
        let participants = storage::get_all_participants(env, round);
        let mut ticket_counter: u32 = 0;

        // Iterate through participants and count their tickets
        for participant in participants.iter() {
            let user_tickets = storage::get_user_tickets(env, round, &participant);
            let ticket_range_end = ticket_counter + user_tickets;

            // Check if winning ticket falls in this user's range
            if winning_ticket >= ticket_counter && winning_ticket < ticket_range_end {
                return Ok(participant);
            }

            ticket_counter = ticket_range_end;
        }

        // This should never happen if stats are correct
        Err(Error::WinnerNotFound)
    }
}

// mod test;