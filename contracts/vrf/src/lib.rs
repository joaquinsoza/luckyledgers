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
    /// Request random number - returns request ID without callback
    /// In production, an off-chain oracle would listen for this event and call fulfill()
    pub fn request_random(env: Env, _requester: Address) -> u64 {
        // Generate a request ID (in production this would be stored/tracked)
        env.prng().gen()
    }

    /// Fulfill a random number request by calling back to the requester
    /// In production, this would be called by the VRF oracle with verifiable randomness
    /// In tests/dev, this can be called manually with a generated random number
    pub fn fulfill(env: Env, requester: Address, random_value: u64) {
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

    /// Get a random number (utility for testing)
    pub fn get_random(env: Env) -> u64 {
        env.prng().gen()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, symbol_short};

    // Mock raffle contract for testing VRF callbacks
    #[contract]
    pub struct MockRaffleContract;

    #[contractimpl]
    impl MockRaffleContract {
        pub fn fulfill_random(_env: Env, _vrf: Address, random_value: u64) -> u64 {
            // Store the random value in storage for verification
            _env.storage()
                .instance()
                .set(&symbol_short!("random"), &random_value);
            random_value
        }

        pub fn get_stored_random(env: Env) -> Option<u64> {
            env.storage().instance().get(&symbol_short!("random"))
        }
    }

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
    fn test_get_random_generates_different_values() {
        let env = Env::default();
        let contract_id = env.register(MockVRF, ());
        let client = MockVRFClient::new(&env, &contract_id);

        let random1 = client.get_random();
        let random2 = client.get_random();
        let random3 = client.get_random();

        // At least two should be different (statistically almost certain)
        assert!(random1 != random2 || random2 != random3);
    }

    #[test]
    fn test_request_random_returns_request_id() {
        let env = Env::default();
        env.mock_all_auths();

        let vrf_id = env.register(MockVRF, ());
        let vrf_client = MockVRFClient::new(&env, &vrf_id);

        let raffle_id = env.register(MockRaffleContract, ());

        // Request random number - should return a request ID without callback
        let request_id = vrf_client.request_random(&raffle_id);

        // Verify we got a request ID
        assert!(request_id > 0);
    }

    #[test]
    fn test_fulfill_calls_callback() {
        let env = Env::default();
        env.mock_all_auths();

        let vrf_id = env.register(MockVRF, ());
        let vrf_client = MockVRFClient::new(&env, &vrf_id);

        let raffle_id = env.register(MockRaffleContract, ());
        let raffle_client = MockRaffleContractClient::new(&env, &raffle_id);

        // Generate a random number and fulfill manually
        let random_value = vrf_client.get_random();
        vrf_client.fulfill(&raffle_id, &random_value);

        // Verify the callback was invoked with the correct value
        let stored = raffle_client.get_stored_random();
        assert_eq!(stored, Some(random_value));
    }
}
