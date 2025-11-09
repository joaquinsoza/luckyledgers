#!/bin/bash

# VRF Contract Deployment Script
# Deploys the MockVRF contract to Stellar network

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SOURCE_ACCOUNT="lucky"
WASM_NAME="vrf"
CONTRACT_NAME="vrf"
NETWORK="${NETWORK:-testnet}"  # Default to testnet, override with NETWORK env var

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}VRF Contract Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Network: ${YELLOW}${NETWORK}${NC}"
echo -e "Source Account: ${YELLOW}${SOURCE_ACCOUNT}${NC}"
echo -e "WASM Name: ${YELLOW}${WASM_NAME}${NC}"
echo -e "Contract Name: ${YELLOW}${CONTRACT_NAME}${NC}"
echo ""

# Step 1: Build the contract
echo -e "${YELLOW}Step 1: Building contracts...${NC}"
cd "$(dirname "$0")/.."
make build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 2: Publish to registry
echo -e "${YELLOW}Step 2: Publishing VRF contract to registry...${NC}"
stellar registry publish \
    --wasm target/wasm32v1-none/release/vrf.wasm \
    --source-account ${SOURCE_ACCOUNT} \
    --wasm-name ${WASM_NAME} \
    --binver "1.0.0"

if [ $? -ne 0 ]; then
    echo -e "${RED}Publish failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Published to registry${NC}"
echo ""

# Step 3: Deploy instance (VRF has no constructor parameters)
echo -e "${YELLOW}Step 3: Deploying VRF contract instance...${NC}"
stellar registry deploy \
    --contract-name ${CONTRACT_NAME} \
    --wasm-name ${WASM_NAME} \
    --source-account ${SOURCE_ACCOUNT} \
    --network ${NETWORK}

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Contract deployed${NC}"
echo ""

# Step 4: Create local alias
echo -e "${YELLOW}Step 4: Creating local alias...${NC}"
stellar registry create-alias \
    --source-account ${SOURCE_ACCOUNT} \
    --network ${NETWORK} \
    ${CONTRACT_NAME}

if [ $? -ne 0 ]; then
    echo -e "${RED}Alias creation failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Alias created${NC}"
echo ""

# Success summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete! ✓${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "VRF Contract ID: ${YELLOW}${CONTRACT_ID}${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Use this VRF contract ID when deploying the raffle contract"
echo -e "  2. Set up your Node.js oracle to call ${YELLOW}${CONTRACT_NAME}.fulfill()${NC}"
echo ""
echo -e "${GREEN}Deployment successful!${NC}"
