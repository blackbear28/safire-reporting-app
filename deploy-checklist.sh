#!/bin/bash
# Deployment checklist and automation script for SAFIRE Moderation System
# Run this to verify everything is ready and guide you through deployment

echo "=========================================="
echo "SAFIRE AI Moderation Deployment Checklist"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Firebase CLI installed
echo "1. Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
  echo -e "${GREEN}✓ Firebase CLI is installed${NC}"
else
  echo -e "${RED}✗ Firebase CLI not found${NC}"
  echo "  Install with: npm install -g firebase-tools"
  exit 1
fi

# Check 2: Node version
echo ""
echo "2. Checking Node.js version..."
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node version: $NODE_VERSION${NC}"

# Check 3: Firebase project configured
echo ""
echo "3. Checking Firebase project..."
if [ -f ".firebaserc" ]; then
  PROJECT=$(cat .firebaserc | grep '"default"' | awk -F'"' '{print $4}')
  echo -e "${GREEN}✓ Firebase project: $PROJECT${NC}"
else
  echo -e "${RED}✗ .firebaserc not found${NC}"
  echo "  Run: firebase init"
  exit 1
fi

# Check 4: Functions directory exists
echo ""
echo "4. Checking functions directory..."
if [ -d "functions" ]; then
  echo -e "${GREEN}✓ Functions directory exists${NC}"
  if [ -f "functions/moderationAnalyze.js" ]; then
    echo -e "${GREEN}✓ moderationAnalyze.js found${NC}"
  else
    echo -e "${RED}✗ moderationAnalyze.js not found${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ Functions directory not found${NC}"
  exit 1
fi

# Check 5: API keys status
echo ""
echo "5. Checking API Keys..."
echo -e "${YELLOW}! API keys need to be configured in Firebase Functions config${NC}"
echo "  You will be prompted to enter them in the next step"

# Check 6: Environment files
echo ""
echo "6. Checking environment files..."
if [ -f ".env" ]; then
  echo -e "${GREEN}✓ Root .env file exists${NC}"
else
  echo -e "${YELLOW}! Root .env file not found (you'll need to create it)${NC}"
fi

if [ -f "admin-web/.env" ]; then
  echo -e "${GREEN}✓ Admin .env file exists${NC}"
else
  echo -e "${YELLOW}! Admin .env file not found (you'll need to create it)${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "Pre-deployment checks complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Prepare your API keys:"
echo "   - Gemini API Key: Get from https://makersuite.google.com/app/apikey"
echo "   - HuggingFace Token: Get from https://huggingface.co/settings/tokens"
echo ""
echo "2. Set Firebase Functions config (you'll be prompted for keys):"
echo "   firebase functions:config:set moderation.gemini_key='YOUR_KEY' moderation.hf_token='YOUR_HF_TOKEN'"
echo ""
echo "3. Deploy Cloud Function:"
echo "   cd functions"
echo "   npm install"
echo "   firebase deploy --only functions"
echo ""
echo "4. Copy function URL from deploy output and update .env files"
echo ""
echo "5. Restart apps to apply changes"
echo ""
echo "For detailed instructions, see DEPLOY_MODERATION.md"
