use soroban_sdk::{Address, contracttype};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum State {
    OPEN,
    CLOSED
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Config {
    pub vrf_contract: Address,
    pub underlying_token: Address,
    pub ticket_price: i128,
    pub target_participants: u32
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Round {
    pub round: u32,
    pub state: State,
    pub picking_winner: bool,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Storage {
    Admin,
    Config,
    TotalRounds,
    Round(u32)
}