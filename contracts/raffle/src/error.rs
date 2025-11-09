#[soroban_sdk::contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Storage Errors
    AdminNotFound = 401,
    ConfigNotFound = 402,
    RoundNotFound = 403,
    RoundStatsNotFound = 404,
    WinnerNotFound = 405,

    // State Errors
    RoundNotOpen = 500,
    InvalidState = 501,
    TargetNotMet = 502,

    // Prize/Winner Errors
    AlreadyClaimed = 600,
    NotWinner = 601,
    InsufficientTickets = 602,

    // VRF Errors
    UnauthorizedVRF = 700,
    VRFRequestFailed = 701,

    // Transfer Errors
    FailedToTransferToWinner = 800,
    FailedToTransferFromUser = 801,
    NoBalanceToTransfer = 802,
}
