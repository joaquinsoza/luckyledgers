use soroban_sdk::{Address, Vec, contracttype};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum State {
    OPEN,      // Accepting ticket purchases
    DRAWING,   // VRF requested, waiting for callback
    COMPLETED  // Winner selected and round finished
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Config {
    pub vrf_contract: Address,
    pub underlying_token: Address,
    pub ticket_price: i128,
    pub target_tickets: u32,
    pub max_tickets_per_participant: u32
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Round {
    pub round: u32,
    pub state: State,
    pub vrf_request_id: Option<u64>,  // VRF request tracking
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RoundStats {
    pub total_tickets: u32,
    pub total_participants: u32,
    pub prize_pool: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct WinnerRecord {
    pub winner: Address,
    pub round: u32,
    pub amount: i128,
    pub claimed: bool,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct ParticipantBucket {
    pub participants: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Storage {
    Admin,
    Config,
    TotalRounds,
    CurrentRound,                    // Current active round number
    Round(u32),                      // Round data by round number
    RoundStats(u32),                 // Stats for each round
    UserTickets(u32, Address),       // (round, user) -> ticket count
    ParticipantBucket(u32, u32),     // (round, bucket_idx) -> ParticipantBucket
    WinnerRecord(u32),               // round -> WinnerRecord
    UserWinningRounds(Address),      // user -> Vec<u32> of winning rounds
}