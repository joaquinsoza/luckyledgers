#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _},
    token::{Client as TokenClient, StellarAssetClient as StellarAssetAdmin},
    Address, Env,
};

mod mock_vrf {
    use soroban_sdk::{contract, contractimpl, Address, Env};

    #[contract]
    pub struct MockVRF;

    #[contractimpl]
    impl MockVRF {
        pub fn request_random(_env: Env, _requester: Address) -> u64 {
            // Return a predictable value for unit testing
            42
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

// Helper function to initialize raffle contract for testing
fn setup_raffle<'a>(env: &Env) -> (Address, LuckyLedgersRaffleClient<'a>, Address, TokenClient<'a>, StellarAssetAdmin<'a>) {
    let admin = Address::generate(env);
    let (token_id, token_client, token_admin) = create_token(env);

    // Register mock VRF
    let vrf_id = env.register(mock_vrf::MockVRF, ());

    let ticket_price = 1_000_000i128; // 0.1 tokens (7 decimals)
    let target_tickets = 25u32; // Total tickets needed to trigger draw
    let max_tickets_per_participant = 10u32; // Max 10 tickets per wallet

    // Register raffle contract with constructor arguments
    let raffle_id = env.register(
        LuckyLedgersRaffle,
        (&admin, &vrf_id, &token_id, &ticket_price, &target_tickets, &max_tickets_per_participant),
    );
    let raffle_client = LuckyLedgersRaffleClient::new(env, &raffle_id);

    (raffle_id, raffle_client, token_id, token_client, token_admin)
}

#[test]
fn test_constructor_initializes_correctly() {
    let env = Env::default();
    let (_raffle_id, raffle_client, token_id, _, _) = setup_raffle(&env);

    // Verify admin is set
    let _admin = raffle_client.admin();

    // Verify config is set
    let config = raffle_client.get_config();
    assert_eq!(config.underlying_token, token_id);
    assert_eq!(config.ticket_price, 1_000_000i128);
    assert_eq!(config.target_tickets, 25);
    assert_eq!(config.max_tickets_per_participant, 10);

    // Verify initial round is created
    let current_round = raffle_client.get_current_round_number();
    assert_eq!(current_round, 1);

    // Verify round is in OPEN state
    let round_info = raffle_client.get_round_info(&1);
    assert_eq!(round_info.state, State::OPEN);
}

#[test]
fn test_enter_raffle_single_ticket() {
    let env = Env::default();
    let (_raffle_id, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    token_admin.mint(&alice, &10_000_000i128);

    // Enter with 1 ticket
    let result = raffle_client.enter(&alice, &1);
    assert_eq!(result, 1);

    // Verify ticket count
    let tickets = raffle_client.get_user_tickets(&1, &alice);
    assert_eq!(tickets, 1);

    // Verify round stats
    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_tickets, 1);
    assert_eq!(stats.total_participants, 1);
    assert_eq!(stats.prize_pool, 1_000_000i128);
}

#[test]
fn test_enter_raffle_multiple_tickets() {
    let env = Env::default();
    let (_, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    token_admin.mint(&alice, &100_000_000i128);

    // Enter with 5 tickets
    let result = raffle_client.enter(&alice, &5);
    assert_eq!(result, 5);

    // Verify stats
    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_tickets, 5);
    assert_eq!(stats.prize_pool, 5_000_000i128);
}

#[test]
fn test_enter_raffle_multiple_users() {
    let env = Env::default();
    let (_, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    token_admin.mint(&alice, &10_000_000i128);
    token_admin.mint(&bob, &10_000_000i128);
    token_admin.mint(&charlie, &10_000_000i128);

    raffle_client.enter(&alice, &2);
    raffle_client.enter(&bob, &3);
    raffle_client.enter(&charlie, &1);

    // Verify individual tickets
    assert_eq!(raffle_client.get_user_tickets(&1, &alice), 2);
    assert_eq!(raffle_client.get_user_tickets(&1, &bob), 3);
    assert_eq!(raffle_client.get_user_tickets(&1, &charlie), 1);

    // Verify stats
    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_participants, 3);
    assert_eq!(stats.total_tickets, 6);
    assert_eq!(stats.prize_pool, 6_000_000i128);
}

#[test]
fn test_enter_twice_same_user() {
    let env = Env::default();
    let (_, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    token_admin.mint(&alice, &100_000_000i128);

    raffle_client.enter(&alice, &2);
    raffle_client.enter(&alice, &3);

    // Should accumulate tickets
    assert_eq!(raffle_client.get_user_tickets(&1, &alice), 5);

    // Should only count as one participant
    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_participants, 1);
    assert_eq!(stats.total_tickets, 5);
}

#[test]
fn test_is_ready_to_draw() {
    let env = Env::default();
    let (_, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    // Not ready with 0 tickets
    assert_eq!(raffle_client.is_ready_to_draw(), false);

    // Add 24 tickets (target is 25)
    // User 1 buys 10 tickets (max)
    let user1 = Address::generate(&env);
    token_admin.mint(&user1, &100_000_000i128);
    raffle_client.enter(&user1, &10);

    // User 2 buys 10 tickets (max)
    let user2 = Address::generate(&env);
    token_admin.mint(&user2, &100_000_000i128);
    raffle_client.enter(&user2, &10);

    // User 3 buys 4 tickets (total now 24)
    let user3 = Address::generate(&env);
    token_admin.mint(&user3, &100_000_000i128);
    raffle_client.enter(&user3, &4);

    // Still not ready (24 < 25)
    assert_eq!(raffle_client.is_ready_to_draw(), false);

    // User 4 buys 1 ticket (total now 25, reaches target)
    let user4 = Address::generate(&env);
    token_admin.mint(&user4, &10_000_000i128);
    raffle_client.enter(&user4, &1);

    // Now ready
    assert_eq!(raffle_client.is_ready_to_draw(), true);
}

#[test]
fn test_get_participants() {
    let env = Env::default();
    let (_, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    token_admin.mint(&alice, &10_000_000i128);
    token_admin.mint(&bob, &10_000_000i128);

    raffle_client.enter(&alice, &2);
    raffle_client.enter(&bob, &3);

    let participants = raffle_client.get_participants(&1);
    assert_eq!(participants.len(), 2);
}

#[test]
fn test_admin_functions() {
    let env = Env::default();
    let (_, raffle_client, _, _, _) = setup_raffle(&env);
    env.mock_all_auths();

    let new_admin = Address::generate(&env);

    // Set new admin
    raffle_client.set_new_admin(&new_admin);

    // Verify admin changed
    assert_eq!(raffle_client.admin(), new_admin);
}

#[test]
fn test_enter_raffle_not_open() {
    let env = Env::default();
    let (raffle_id, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    token_admin.mint(&alice, &100_000_000i128);

    // Manually set round to COMPLETED state for testing
    env.as_contract(&raffle_id, || {
        storage::set_round_state(&env, 1, State::COMPLETED);
    });

    // Try to enter - should fail
    let result = raffle_client.try_enter(&alice, &1);
    assert!(result.is_err());
}

#[test]
fn test_ticket_cap_enforcement() {
    let env = Env::default();
    let (_, raffle_client, _, _, token_admin) = setup_raffle(&env);
    env.mock_all_auths();

    let alice = Address::generate(&env);
    token_admin.mint(&alice, &200_000_000i128);

    // Buy 8 tickets (under max of 10)
    let result = raffle_client.enter(&alice, &8);
    assert_eq!(result, 8);

    // Try to buy 5 more tickets (would exceed max of 10)
    // Should auto-cap to only 2 tickets (remaining allowance)
    let result = raffle_client.enter(&alice, &5);
    assert_eq!(result, 10); // Total should be capped at 10

    // Verify user has exactly 10 tickets
    let tickets = raffle_client.get_user_tickets(&1, &alice);
    assert_eq!(tickets, 10);

    // Verify stats show correct totals
    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_tickets, 10);
    assert_eq!(stats.prize_pool, 10_000_000i128);

    // Try to buy more - should return current total without buying
    let result = raffle_client.enter(&alice, &1);
    assert_eq!(result, 10); // Still at cap

    // Verify no additional tickets or payment
    let stats = raffle_client.get_round_stats(&1);
    assert_eq!(stats.total_tickets, 10); // Unchanged
    assert_eq!(stats.prize_pool, 10_000_000i128); // Unchanged
}
