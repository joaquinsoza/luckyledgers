use soroban_sdk::{Address, Env, TryFromVal, Val, Vec};

use crate::{error::Error, types::{Config, ParticipantBucket, Round, RoundStats, State, Storage, WinnerRecord}};

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

const PERSISTENT_BUMP_AMOUNT: u32 = 120 * DAY_IN_LEDGERS;
const PERSISTENT_LIFETIME_THRESHOLD: u32 = PERSISTENT_BUMP_AMOUNT - 20 * DAY_IN_LEDGERS;

pub const BUCKET_SIZE: u32 = 100;

pub fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

/// Fetch an entry in persistent storage that has a default value if it doesn't exist
fn get_persistent_extend_or_error<V: TryFromVal<Env, Val>>(
    env: &Env,
    key: &Storage,
    error: Error,
) -> Result<V, Error> {
    if let Some(result) = env.storage().persistent().get(key) {
        env.storage().persistent().extend_ttl(
            key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );
        result
    } else {
        return Err(error);
    }
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&Storage::Admin, admin);
}

pub fn get_admin(env: &Env) -> Result<Address, Error> {
    env.storage().instance().get(&Storage::Admin).ok_or(Error::AdminNotFound)?
}

// Config
pub fn set_config(e: &Env, config: Config) {
    e.storage().instance().set(&Storage::Config, &config);
}

pub fn get_config(env: &Env) -> Result<Config, Error> {
    env.storage().instance().get(&Storage::Config).ok_or(Error::ConfigNotFound)?
}

// Round
pub fn create_new_round(env: &Env) {
    let total_rounds = get_total_rounds(env);

    let round: Round = Round {
        round: total_rounds,
        state: State::OPEN,
        vrf_request_id: None,
    };

    let key = Storage::Round(total_rounds);
    env.storage().persistent().set(&key, &round);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);

    // Initialize round stats
    let stats = RoundStats {
        total_tickets: 0,
        total_participants: 0,
        prize_pool: 0,
    };
    let stats_key = Storage::RoundStats(total_rounds);
    env.storage().persistent().set(&stats_key, &stats);
    env.storage()
        .persistent()
        .extend_ttl(&stats_key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);

    set_total_rounds(env, total_rounds.checked_add(1).unwrap());
    set_current_round(env, total_rounds);
}

// Rounds
pub fn get_total_rounds(env: &Env) -> u32 {
    env.storage().instance().get(&Storage::TotalRounds).unwrap_or(0)
}

pub fn set_total_rounds(env: &Env, n: u32) {
    env.storage().instance().set(&Storage::TotalRounds, &n);
}

pub fn get_round_by_index(env: &Env, n: u32) -> Result<Round, Error> {
    let key = Storage::Round(n);
    get_persistent_extend_or_error(&env, &key, Error::RoundNotFound)
}

pub fn get_current_round(env: &Env) -> Result<Round, Error> {
    let current_round_num = get_current_round_number(env);
    let key = Storage::Round(current_round_num);
    get_persistent_extend_or_error(&env, &key, Error::RoundNotFound)
}

// Current Round Number
pub fn set_current_round(env: &Env, round_num: u32) {
    env.storage().instance().set(&Storage::CurrentRound, &round_num);
}

pub fn get_current_round_number(env: &Env) -> u32 {
    env.storage().instance().get(&Storage::CurrentRound).unwrap_or(0)
}

// Update Round State
pub fn set_round_state(env: &Env, round: u32, state: State) {
    let mut round_data = get_round_by_index(env, round).unwrap();
    round_data.state = state;
    let key = Storage::Round(round);
    env.storage().persistent().set(&key, &round_data);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

pub fn set_round_vrf_request(env: &Env, round: u32, request_id: u64) {
    let mut round_data = get_round_by_index(env, round).unwrap();
    round_data.vrf_request_id = Some(request_id);
    let key = Storage::Round(round);
    env.storage().persistent().set(&key, &round_data);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

// Round Stats
pub fn get_round_stats(env: &Env, round: u32) -> Result<RoundStats, Error> {
    let key = Storage::RoundStats(round);
    get_persistent_extend_or_error(env, &key, Error::RoundStatsNotFound)
}

pub fn set_round_stats(env: &Env, round: u32, stats: &RoundStats) {
    let key = Storage::RoundStats(round);
    env.storage().persistent().set(&key, stats);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

// User Tickets
pub fn get_user_tickets(env: &Env, round: u32, user: &Address) -> u32 {
    let key = Storage::UserTickets(round, user.clone());
    env.storage().persistent().get(&key).unwrap_or(0)
}

pub fn add_user_tickets(env: &Env, round: u32, user: &Address, num_tickets: u32) {
    let current = get_user_tickets(env, round, user);
    let new_total = current.checked_add(num_tickets).unwrap();
    let key = Storage::UserTickets(round, user.clone());
    env.storage().persistent().set(&key, &new_total);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

// Participant Buckets
pub fn get_participant_bucket(env: &Env, round: u32, bucket_idx: u32) -> ParticipantBucket {
    let key = Storage::ParticipantBucket(round, bucket_idx);
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or(ParticipantBucket {
            participants: Vec::new(env),
        })
}

pub fn set_participant_bucket(env: &Env, round: u32, bucket_idx: u32, bucket: &ParticipantBucket) {
    let key = Storage::ParticipantBucket(round, bucket_idx);
    env.storage().persistent().set(&key, bucket);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

pub fn add_participant(env: &Env, round: u32, participant: &Address) {
    let mut stats = get_round_stats(env, round).unwrap();
    let bucket_idx = stats.total_participants / BUCKET_SIZE;

    let mut bucket = get_participant_bucket(env, round, bucket_idx);
    bucket.participants.push_back(participant.clone());
    set_participant_bucket(env, round, bucket_idx, &bucket);

    stats.total_participants = stats.total_participants.checked_add(1).unwrap();
    set_round_stats(env, round, &stats);
}

pub fn get_all_participants(env: &Env, round: u32) -> Vec<Address> {
    let stats = get_round_stats(env, round).unwrap();
    let total_buckets = (stats.total_participants + BUCKET_SIZE - 1) / BUCKET_SIZE;

    let mut all_participants = Vec::new(env);
    for bucket_idx in 0..total_buckets {
        let bucket = get_participant_bucket(env, round, bucket_idx);
        for participant in bucket.participants.iter() {
            all_participants.push_back(participant);
        }
    }
    all_participants
}

// Winner Records
pub fn set_winner_record(env: &Env, round: u32, record: &WinnerRecord) {
    let key = Storage::WinnerRecord(round);
    env.storage().persistent().set(&key, record);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);

    // Track user's winning rounds
    let winner = &record.winner;
    let mut winning_rounds = get_user_winning_rounds(env, winner);
    winning_rounds.push_back(round);
    set_user_winning_rounds(env, winner, &winning_rounds);
}

pub fn get_winner_record(env: &Env, round: u32) -> Option<WinnerRecord> {
    let key = Storage::WinnerRecord(round);
    env.storage().persistent().get(&key)
}

pub fn update_winner_claimed(env: &Env, round: u32) -> Result<(), Error> {
    let mut record = get_winner_record(env, round).ok_or(Error::WinnerNotFound)?;
    record.claimed = true;
    set_winner_record(env, round, &record);
    Ok(())
}

// User Winning Rounds
pub fn get_user_winning_rounds(env: &Env, user: &Address) -> Vec<u32> {
    let key = Storage::UserWinningRounds(user.clone());
    env.storage().persistent().get(&key).unwrap_or(Vec::new(env))
}

pub fn set_user_winning_rounds(env: &Env, user: &Address, rounds: &Vec<u32>) {
    let key = Storage::UserWinningRounds(user.clone());
    env.storage().persistent().set(&key, rounds);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}
