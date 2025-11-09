#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient as StellarAssetAdmin},
    Address, Env,
};

// Mock VRF for integration tests - does NOT callback immediately to avoid re-entrance
mod mock_vrf {
    use soroban_sdk::{contract, contractimpl, Address, Env, IntoVal, Symbol, Val, Vec};

    #[contract]
    pub struct MockVRF;

    #[contractimpl]
    impl MockVRF {
        /// Simulates VRF request_random WITHOUT immediate callback
        /// Returns request ID without calling back
        pub fn request_random(env: Env, _requester: Address) -> u64 {
            // Generate request ID using env.prng()
            env.prng().gen()
        }

        /// Fulfill a random number request by calling back to the requester
        /// This simulates what a Node.js oracle would do in production
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
}

// Helper function to create a test token
fn create_token<'a>(env: &Env) -> (Address, TokenClient<'a>, StellarAssetAdmin<'a>) {
    let admin = Address::generate(env);
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = TokenClient::new(env, &token_id.address());
    let admin_client = StellarAssetAdmin::new(env, &token_id.address());

    (token_id.address(), token_client, admin_client)
}

// Helper function to setup integration test environment
fn setup_integration_test<'a>(
    env: &Env,
) -> (Address, LuckyLedgersRaffleClient<'a>, Address, TokenClient<'a>, StellarAssetAdmin<'a>, Address) {
    let admin = Address::generate(env);
    let (token_id, token_client, token_admin) = create_token(env);

    // Register REAL mock VRF with callback functionality
    let vrf_id = env.register(mock_vrf::MockVRF, ());

    let ticket_price = 1_000_000i128; // 0.1 tokens
    let target_participants = 3u32; // Small target for testing

    // Register raffle contract with constructor arguments
    let raffle_id = env.register(
        LuckyLedgersRaffle,
        (&admin, &vrf_id, &token_id, &ticket_price, &target_participants),
    );
    let raffle_client = LuckyLedgersRaffleClient::new(env, &raffle_id);

    (raffle_id, raffle_client, token_id, token_client, token_admin, vrf_id)
}

#[test]
fn test_full_raffle_flow() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, token_client, token_admin, vrf_id) = setup_integration_test(&env);
    env.mock_all_auths();

    // Create 3 users
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Mint tokens to users
    token_admin.mint(&alice, &100_000_000i128);
    token_admin.mint(&bob, &100_000_000i128);
    token_admin.mint(&charlie, &100_000_000i128);

    // Users enter raffle (round 1)
    raffle_client.enter(&alice, &2);
    raffle_client.enter(&bob, &1);
    raffle_client.enter(&charlie, &1);

    // Verify round 1 stats
    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_participants, 3);
    assert_eq!(stats.total_tickets, 4);
    assert_eq!(stats.prize_pool, 4_000_000i128);

    // Should be ready to draw
    assert!(raffle_client.is_ready_to_draw());

    // Request draw - this will call VRF and transition to DRAWING state
    let _request_id = raffle_client.request_draw();

    // Simulate VRF oracle: generate random number and fulfill (in production, a Node.js listener would do this)
    let vrf_client = mock_vrf::MockVRFClient::new(&env, &vrf_id);
    let random_value = vrf_client.get_random();
    vrf_client.fulfill(&raffle_id, &random_value);

    // Verify round 1 is now COMPLETED
    let round1_info = raffle_client.get_round_info(&1);
    assert_eq!(round1_info.state, State::COMPLETED);

    // Verify a winner was selected
    let winner_record = raffle_client.get_winner(&1).unwrap();
    assert_eq!(winner_record.round, 1);
    assert_eq!(winner_record.amount, 4_000_000i128);
    assert!(!winner_record.claimed);

    // Verify auto-restart: round 2 should be created
    let current_round = raffle_client.get_current_round_number();
    assert_eq!(current_round, 2);

    // Verify round 2 is OPEN
    let round2_info = raffle_client.get_round_info(&2);
    assert_eq!(round2_info.state, State::OPEN);
}

#[test]
fn test_claim_prize() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, token_client, token_admin, vrf_id) = setup_integration_test(&env);
    env.mock_all_auths();

    // Create users
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Mint tokens
    token_admin.mint(&alice, &100_000_000i128);
    token_admin.mint(&bob, &100_000_000i128);
    token_admin.mint(&charlie, &100_000_000i128);

    // Enter raffle
    raffle_client.enter(&alice, &10); // Alice has 10 tickets
    raffle_client.enter(&bob, &1);
    raffle_client.enter(&charlie, &1);

    // Request draw and manually fulfill
    let _request_id = raffle_client.request_draw();
    let vrf_client = mock_vrf::MockVRFClient::new(&env, &vrf_id);
    let random_value = vrf_client.get_random();
    vrf_client.fulfill(&raffle_id, &random_value);

    // Get winner
    let winner_record = raffle_client.get_winner(&1).unwrap();
    let winner = winner_record.winner.clone();
    let prize_amount = winner_record.amount;

    // Get winner's balance before claim
    let balance_before = token_client.balance(&winner);

    // Winner claims prize
    let claimed_amount = raffle_client.claim_prize(&winner, &1);
    assert_eq!(claimed_amount, prize_amount);

    // Verify balance increased
    let balance_after = token_client.balance(&winner);
    assert_eq!(balance_after, balance_before + prize_amount);

    // Verify winner record is marked as claimed
    let winner_record_after = raffle_client.get_winner(&1).unwrap();
    assert!(winner_record_after.claimed);

    // Try to claim again - should fail
    let result = raffle_client.try_claim_prize(&winner, &1);
    assert!(result.is_err());
}

#[test]
fn test_multiple_rounds() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, token_client, token_admin, vrf_id) = setup_integration_test(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    token_admin.mint(&alice, &1_000_000_000i128);
    token_admin.mint(&bob, &1_000_000_000i128);
    token_admin.mint(&charlie, &1_000_000_000i128);

    // Run 3 rounds
    for round in 1..=3 {
        // Enter raffle
        raffle_client.enter(&alice, &1);
        raffle_client.enter(&bob, &1);
        raffle_client.enter(&charlie, &1);

        // Request draw and manually fulfill
        let _request_id = raffle_client.request_draw();
        let vrf_client = mock_vrf::MockVRFClient::new(&env, &vrf_id);
        let random_value = vrf_client.get_random();
        vrf_client.fulfill(&raffle_id, &random_value);

        // Verify round completed
        let round_info = raffle_client.get_round_info(&round);
        assert_eq!(round_info.state, State::COMPLETED);

        // Verify winner exists
        assert!(raffle_client.get_winner(&round).is_some());
    }

    // Verify we're on round 4 now
    assert_eq!(raffle_client.get_current_round_number(), 4);
}

#[test]
fn test_claim_all_prizes() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, token_client, token_admin, vrf_id) = setup_integration_test(&env);
    env.mock_all_auths();

    // Only Alice will participate - she'll win every round
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    token_admin.mint(&alice, &1_000_000_000i128);
    token_admin.mint(&bob, &1_000_000_000i128);
    token_admin.mint(&charlie, &1_000_000_000i128);

    // Run 3 rounds where Alice dominates
    for _ in 1..=3 {
        raffle_client.enter(&alice, &100);
        raffle_client.enter(&bob, &1);
        raffle_client.enter(&charlie, &1);
        let _request_id = raffle_client.request_draw();
        let vrf_client = mock_vrf::MockVRFClient::new(&env, &vrf_id);
        let random_value = vrf_client.get_random();
        vrf_client.fulfill(&raffle_id, &random_value);
    }

    // Check how many rounds Alice won
    let _alice_winning_rounds = raffle_client.get_user_winning_rounds(&alice);

    // Get Alice's unclaimed prizes
    let unclaimed_prizes = raffle_client.get_unclaimed_prizes(&alice);
    let num_unclaimed = unclaimed_prizes.len();

    if num_unclaimed > 0 {
        // Claim all prizes at once
        let balance_before = token_client.balance(&alice);
        let total_claimed = raffle_client.claim_all_prizes(&alice);
        let balance_after = token_client.balance(&alice);

        assert_eq!(balance_after, balance_before + total_claimed);

        // Verify all prizes are now claimed
        let unclaimed_after = raffle_client.get_unclaimed_prizes(&alice);
        assert_eq!(unclaimed_after.len(), 0);
    }
}

#[test]
fn test_winner_selection_fairness() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, token_client, token_admin, vrf_id) = setup_integration_test(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    token_admin.mint(&alice, &100_000_000i128);
    token_admin.mint(&bob, &100_000_000i128);
    token_admin.mint(&charlie, &100_000_000i128);

    // Alice gets 10 tickets, Bob gets 1, Charlie gets 1
    // Alice has 10/12 = 83% chance of winning
    raffle_client.enter(&alice, &10);
    raffle_client.enter(&bob, &1);
    raffle_client.enter(&charlie, &1);

    let _request_id = raffle_client.request_draw();
    let vrf_client = mock_vrf::MockVRFClient::new(&env, &vrf_id);
    let random_value = vrf_client.get_random();
    vrf_client.fulfill(&raffle_id, &random_value);

    let winner = raffle_client.get_winner(&1).unwrap().winner;

    // Verify winner is one of the participants
    assert!(winner == alice || winner == bob || winner == charlie);

    // Statistically, Alice should win most of the time
    // But we can't guarantee in a single test, just verify mechanism works
}

#[test]
fn test_cannot_draw_before_target_met() {
    let env = Env::default();
    let (_raffle_id, raffle_client, _, _token_client, token_admin, _vrf_id) = setup_integration_test(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    token_admin.mint(&alice, &100_000_000i128);
    token_admin.mint(&bob, &100_000_000i128);

    // Only 2 participants (target is 3)
    raffle_client.enter(&alice, &5);
    raffle_client.enter(&bob, &3);

    // Should not be ready
    assert!(!raffle_client.is_ready_to_draw());

    // Try to request draw - should fail
    let result = raffle_client.try_request_draw();
    assert!(result.is_err());
}

#[test]
fn test_round_state_transitions() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, _token_client, token_admin, vrf_id) = setup_integration_test(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    token_admin.mint(&alice, &100_000_000i128);
    token_admin.mint(&bob, &100_000_000i128);
    token_admin.mint(&charlie, &100_000_000i128);

    // Initial state: OPEN
    let round_info = raffle_client.get_round_info(&1);
    assert_eq!(round_info.state, State::OPEN);

    // Enter raffle
    raffle_client.enter(&alice, &1);
    raffle_client.enter(&bob, &1);
    raffle_client.enter(&charlie, &1);

    // Still OPEN
    let round_info = raffle_client.get_round_info(&1);
    assert_eq!(round_info.state, State::OPEN);

    // Request draw - state goes OPEN -> DRAWING
    let _request_id = raffle_client.request_draw();

    // Verify state is DRAWING
    let round_info = raffle_client.get_round_info(&1);
    assert_eq!(round_info.state, State::DRAWING);

    // Manually fulfill - state goes DRAWING -> COMPLETED
    let vrf_client = mock_vrf::MockVRFClient::new(&env, &vrf_id);
    let random_value = vrf_client.get_random();
    vrf_client.fulfill(&raffle_id, &random_value);

    // After VRF callback completes, state is COMPLETED
    let round_info = raffle_client.get_round_info(&1);
    assert_eq!(round_info.state, State::COMPLETED);
}

#[test]
fn test_bucket_pattern_many_participants() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, token_client, token_admin, _) = setup_integration_test(&env);
    env.mock_all_auths();

    // Create 10 participants (bucket size is 100, so this tests single bucket)
    for _ in 0..10 {
        let user = Address::generate(&env);
        token_admin.mint(&user, &100_000_000i128);
        raffle_client.enter(&user, &1);
    }

    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_participants, 10);
    assert_eq!(stats.total_tickets, 10);

    let participants = raffle_client.get_participants(&1);
    assert_eq!(participants.len(), 10);
}
