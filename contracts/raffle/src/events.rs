use soroban_sdk::{contractevent, Address, Env};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PlayerEntered {
    #[topic]
    pub round: u32,
    #[topic]
    pub player: Address,
    pub num_tickets: u32,
    pub total_tickets: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReadyToDraw {
    #[topic]
    pub round: u32,
    pub total_participants: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DrawRequested {
    #[topic]
    pub round: u32,
    pub vrf_request_id: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WinnerSelected {
    #[topic]
    pub round: u32,
    #[topic]
    pub winner: Address,
    pub prize_amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoundStarted {
    #[topic]
    pub round: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PrizeClaimed {
    #[topic]
    pub round: u32,
    #[topic]
    pub winner: Address,
    pub amount: i128,
}

/// Emitted when a player enters the raffle
pub fn emit_player_entered(env: &Env, round: u32, player: &Address, num_tickets: u32, total_tickets: u32) {
    PlayerEntered {
        round,
        player: player.clone(),
        num_tickets,
        total_tickets,
    }
    .publish(env);
}

/// Emitted when target participants reached and ready to draw
pub fn emit_ready_to_draw(env: &Env, round: u32, total_participants: u32) {
    ReadyToDraw {
        round,
        total_participants,
    }
    .publish(env);
}

/// Emitted when draw is requested
pub fn emit_draw_requested(env: &Env, round: u32, vrf_request_id: u64) {
    DrawRequested {
        round,
        vrf_request_id,
    }
    .publish(env);
}

/// Emitted when winner is selected
pub fn emit_winner_selected(env: &Env, round: u32, winner: &Address, prize_amount: i128) {
    WinnerSelected {
        round,
        winner: winner.clone(),
        prize_amount,
    }
    .publish(env);
}

/// Emitted when a new round starts
pub fn emit_round_started(env: &Env, round: u32) {
    RoundStarted { round }.publish(env);
}

/// Emitted when prize is claimed
pub fn emit_prize_claimed(env: &Env, round: u32, winner: &Address, amount: i128) {
    PrizeClaimed {
        round,
        winner: winner.clone(),
        amount,
    }
    .publish(env);
}
