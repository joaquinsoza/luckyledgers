#![no_std]

//! ⚠️ WARNING: MOCK VRF - NOT FOR PRODUCTION USE! ⚠️
//!
//! Uses env.prng() which is PREDICTABLE and can be manipulated by validators.
//! For production, use Chainlink VRF, DIA xRandom, or other verifiable randomness.

use soroban_sdk::{Address, Env, Symbol, Val, IntoVal, Vec, contract, contractimpl};

#[contract]
pub struct MockVRF;

#[contractimpl]
impl MockVRF {
    /// Request random number and immediately call back (INSECURE - for testing only)
    /// In production this would be done by a VRF protocol fulfilling in a separated call
    ///
    /// Generates pseudo-random u64 using env.prng() and immediately calls
    /// requester.fulfill_random(vrf_address, random_value)
    pub fn request_random(env: Env, requester: Address) -> u64 {
        let random_value: u64 = env.prng().gen();

        let callback_args: Vec<Val> = (
            env.current_contract_address(),
            random_value,
        )
            .into_val(&env);

        let _: Val = env.invoke_contract(
            &requester,
            &Symbol::new(&env, "fulfill_random"),
            callback_args,
        );

        random_value
    }

    /// Manually trigger callback with specific random value (for testing)
    /// For production this should be guarded by an admin
    pub fn fulfill_manual(env: Env, requester: Address, random_value: u64) {
        let callback_args: Vec<Val> = (
            env.current_contract_address(),
            random_value,
        )
            .into_val(&env);

        let _: Val = env.invoke_contract(
            &requester,
            &Symbol::new(&env, "fulfill_random"),
            callback_args,
        );
    }

    /// Get a random number without calling back (for testing)
    pub fn get_random(env: Env) -> u64 {
        env.prng().gen()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, testutils::Address as _};

    #[test]
    fn test_get_random_works() {
        let env = Env::default();
        let contract_id = env.register(MockVRF, ());
        let client = MockVRFClient::new(&env, &contract_id);

        let random1 = client.get_random();
        let random2 = client.get_random();

        assert!(random1 > 0 || random2 > 0);
    }

    #[test]
    fn test_manual_fulfill_doesnt_panic() {
        let env = Env::default();
        let contract_id = env.register(MockVRF, ());
        let client = MockVRFClient::new(&env, &contract_id);
        let requester = Address::generate(&env);

        client.fulfill_manual(&requester, &12345);
    }
}
