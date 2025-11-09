#[soroban_sdk::contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AdminNotFound = 401,
    ConfigNotFound = 402,
    RoundNotFound = 403,

    /// The contract failed to transfer XLM to the guesser
    FailedToTransferToGuesser = 6,
    /// The guesser failed to transfer XLM to the contract
    FailedToTransferFromGuesser = 2,
    /// The contract has no balance to transfer to the guesser
    NoBalanceToTransfer = 3,
    
}
