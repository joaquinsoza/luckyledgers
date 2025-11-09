use soroban_sdk::{Address, Env, TryFromVal, Val};

use crate::{error::Error, types::{Config, Round, State, Storage}};

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

const PERSISTENT_BUMP_AMOUNT: u32 = 120 * DAY_IN_LEDGERS;
const PERSISTENT_LIFETIME_THRESHOLD: u32 = PERSISTENT_BUMP_AMOUNT - 20 * DAY_IN_LEDGERS;

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
        picking_winner: false 
    };
    
    let key = Storage::Round(total_rounds);
    env.storage().persistent().set(&key, &round);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);

    set_total_rounds(env, total_rounds.checked_add(1).unwrap());
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
    let total_rounds = get_total_rounds(env);

    let key = Storage::Round(total_rounds);
    get_persistent_extend_or_error(&env, &key, Error::RoundNotFound)
}
