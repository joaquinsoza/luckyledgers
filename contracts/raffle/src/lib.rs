#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, Symbol};

mod error;
mod types;
mod storage;

use types::{Round, Config, State};
use error::Error;

#[contract]
pub struct LuckyLedgersRaffle;

#[contractimpl]
impl LuckyLedgersRaffle {
    /// Constructor to initialize the contract with an admin and a random number
    pub fn __constructor(
        env: &Env, 
        admin: Address,
        vrf_contract: Address,       // MockVRF address
        underlying_token: Address,          // Underlying Token address
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

    /// Guess a number between 1 and 10
    pub fn enter(env: &Env, caller: Address, num_tickets: u32) -> Result<u32, Error> {
        let config = storage::get_config(env)?;
        let round = storage::get_current_round(env)?;
        let token_client = Self::token_client(env, config.underlying_token);

        if round.state == State::OPEN {
            let amount = (num_tickets as i128).checked_mul(config.ticket_price).unwrap();
            // TODO: Requires total_tickets + num_tickets <= target_participants * MAX_TICKETS_PER_PLAYER (prevent one player buying all)
            // Requires !picking_winner (critical race condition check!)

            token_client.transfer(&caller, env.current_contract_address(), &amount);
            // Store the tickets per caller? and how many tickets have been bought on the round
        }

        storage::extend_instance_ttl(env);
        Ok(1u32)
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

    /// Private helper function to require auth from the admin
    fn require_admin(env: &Env) {
        let admin = storage::get_admin(env).unwrap();
        admin.require_auth();
    }

    fn token_client<'a>(env: &Env, contract_id: Address) -> soroban_sdk::token::TokenClient<'a> {
        soroban_sdk::token::TokenClient::new(env, &contract_id)
    }
}

// mod test;