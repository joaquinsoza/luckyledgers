#!/bin/bash

# Raffle Contract Deployment Script
# Deploys the LuckyLedgers Raffle contract to Stellar network

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SOURCE_ACCOUNT="lucky"
WASM_NAME="raffle"
CONTRACT_NAME="raffle_3"
NETWORK="${NETWORK:-testnet}"  # Default to testnet, override with NETWORK env var

# Constructor arguments
VRF_CONTRACT="CCD5LKJMSWE55ZLTAKYF4EPNOF7XAJFBA6Q6EOGF6EHL2OXTSTX6IRYO"
UNDERLYING_TOKEN="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"  # XLM on testnet
TICKET_PRICE="100000000"  # 10 XLM per ticket
TARGET_TICKETS="250"        # Total tickets needed to trigger draw
MAX_TICKETS_PER_PARTICIPANT="10"  # Max tickets per wallet

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Raffle Contract Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Network: ${YELLOW}${NETWORK}${NC}"
echo -e "Source Account: ${YELLOW}${SOURCE_ACCOUNT}${NC}"
echo -e "WASM Name: ${YELLOW}${WASM_NAME}${NC}"
echo -e "Contract Name: ${YELLOW}${CONTRACT_NAME}${NC}"
echo ""
echo -e "Constructor Arguments:"
echo -e "  VRF Contract: ${YELLOW}${VRF_CONTRACT}${NC}"
echo -e "  Underlying Token: ${YELLOW}${UNDERLYING_TOKEN}${NC}"
echo -e "  Ticket Price: ${YELLOW}${TICKET_PRICE}${NC} (1000 XLM)"
echo -e "  Target Tickets: ${YELLOW}${TARGET_TICKETS}${NC}"
echo -e "  Max Tickets Per Participant: ${YELLOW}${MAX_TICKETS_PER_PARTICIPANT}${NC}"
echo ""

# Step 1: Build the contract
echo -e "${YELLOW}Step 1: Building contracts...${NC}"
cd "$(dirname "$0")/.."
make build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN} Build successful${NC}"
echo ""

# Step 2: Get admin address from lucky account
echo -e "${YELLOW}Step 2: Getting admin address...${NC}"
ADMIN_ADDRESS=$(stellar keys address ${SOURCE_ACCOUNT})

if [ -z "$ADMIN_ADDRESS" ]; then
    echo -e "${RED}Failed to retrieve admin address!${NC}"
    exit 1
fi
echo -e "${GREEN} Admin address: ${ADMIN_ADDRESS}${NC}"
echo ""

# Step 3: Publish to registry
echo -e "${YELLOW}Step 3: Publishing Raffle contract to registry...${NC}"
stellar registry publish \
    --wasm target/wasm32v1-none/release/raffle.wasm \
    --source-account ${SOURCE_ACCOUNT} \
    --wasm-name ${WASM_NAME} \
    --binver "1.2.0"

if [ $? -ne 0 ]; then
    echo -e "${RED}Publish failed!${NC}"
    exit 1
fi
echo -e "${GREEN} Published to registry${NC}"
echo ""

# Step 4: Deploy instance with constructor arguments
echo -e "${YELLOW}Step 4: Deploying Raffle contract instance...${NC}"
stellar registry deploy \
    --contract-name ${CONTRACT_NAME} \
    --wasm-name ${WASM_NAME} \
    --source-account ${SOURCE_ACCOUNT} \
    --network ${NETWORK} \
    -- \
    --admin ${ADMIN_ADDRESS} \
    --vrf_contract ${VRF_CONTRACT} \
    --underlying_token ${UNDERLYING_TOKEN} \
    --ticket_price ${TICKET_PRICE} \
    --target_tickets ${TARGET_TICKETS} \
    --max_tickets_per_participant ${MAX_TICKETS_PER_PARTICIPANT}

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN} Contract deployed${NC}"
echo ""

# Step 5: Create local alias
echo -e "${YELLOW}Step 5: Creating local alias...${NC}"
stellar registry create-alias \
    --source-account ${SOURCE_ACCOUNT} \
    --network ${NETWORK} \
    ${CONTRACT_NAME}

if [ $? -ne 0 ]; then
    echo -e "${RED}Alias creation failed!${NC}"
    exit 1
fi
echo -e "${GREEN} Alias created${NC}"
echo ""

# Success summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete! ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Raffle Contract ID: ${YELLOW}${CONTRACT_ID}${NC}"
echo ""
echo -e "Configuration:"
echo -e "  Admin: ${YELLOW}${ADMIN_ADDRESS}${NC}"
echo -e "  VRF Contract: ${YELLOW}${VRF_CONTRACT}${NC}"
echo -e "  Token: ${YELLOW}${UNDERLYING_TOKEN}${NC} (XLM)"
echo -e "  Ticket Price: ${YELLOW}1000 XLM${NC}"
echo -e "  Target Tickets: ${YELLOW}${TARGET_TICKETS}${NC}"
echo -e "  Max Tickets Per Participant: ${YELLOW}${MAX_TICKETS_PER_PARTICIPANT}${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Users can buy up to ${YELLOW}${MAX_TICKETS_PER_PARTICIPANT}${NC} tickets each with ${YELLOW}raffle.enter()${NC}"
echo -e "  2. When ${YELLOW}${TARGET_TICKETS}${NC} tickets are purchased, call ${YELLOW}raffle.request_draw()${NC}"
echo -e "  3. Oracle will call ${YELLOW}vrf.fulfill()${NC} to complete the draw"
echo ""
echo -e "${GREEN}Deployment successful!${NC}"
