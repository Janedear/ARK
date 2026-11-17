#!/usr/bin/env bash
# ARK Backend — Cloudflare Worker deploy script
# Usage: bash deploy.sh
# Requires: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in env
set -euo pipefail

WORKER_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$WORKER_DIR"

echo "==> Installing dependencies..."
npm install --silent

echo "==> Creating KV namespace (or reusing existing)..."
# Create KV namespace and extract its ID
KV_OUTPUT=$(npx wrangler kv namespace create "ARK_KV" 2>&1 || true)
echo "$KV_OUTPUT"

# Extract the KV ID from the output
KV_ID=$(echo "$KV_OUTPUT" | grep -oE 'id = "[a-f0-9]+"' | head -1 | grep -oE '[a-f0-9]{30,}' || true)

# If creation failed (already exists), list to get the existing ID
if [ -z "$KV_ID" ]; then
  echo "==> KV namespace may already exist, listing..."
  LIST_OUTPUT=$(npx wrangler kv namespace list 2>&1)
  echo "$LIST_OUTPUT"
  KV_ID=$(echo "$LIST_OUTPUT" | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  for ns in data:
    if ns.get('title') in ['ark-backend-ARK_KV', 'ARK_KV']:
      print(ns['id'])
      break
except: pass
" 2>/dev/null || true)
fi

if [ -z "$KV_ID" ]; then
  echo "ERROR: Could not create or find KV namespace. Check Cloudflare permissions."
  exit 1
fi

echo "==> Using KV namespace ID: $KV_ID"

# Patch wrangler.toml with real KV ID
sed -i "s/PLACEHOLDER_KV_ID/$KV_ID/" wrangler.toml

echo "==> Generating admin secret..."
ADMIN_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
echo ""
echo "============================================"
echo "  ADMIN SECRET (save this!): $ADMIN_SECRET"
echo "============================================"
echo ""

# Write secrets to wrangler
echo "$ADMIN_SECRET" | npx wrangler secret put ADMIN_SECRET

# Optional: set SendGrid key if provided in env
if [ -n "${SENDGRID_API_KEY:-}" ]; then
  echo "$SENDGRID_API_KEY" | npx wrangler secret put SENDGRID_API_KEY
  echo "hello@halosuite.ai" | npx wrangler secret put BUG_NOTIFY_EMAIL
  echo "==> SendGrid key configured"
fi

echo "==> Deploying Worker..."
npx wrangler deploy

echo ""
echo "==> Done! Your ARK backend is live."
echo ""
echo "Endpoints:"
WORKER_URL=$(npx wrangler deployments list 2>&1 | grep "workers.dev" | head -1 | grep -oE 'https://[^ ]+' || true)
if [ -n "$WORKER_URL" ]; then
  echo "  Bug reports:  POST $WORKER_URL/halo/bugs"
  echo "  Latest patch: GET  $WORKER_URL/halo/patches/latest.json"
  echo "  Admin UI:     $WORKER_URL/admin"
else
  echo "  Bug reports:  POST https://ark-backend.<subdomain>.workers.dev/halo/bugs"
  echo "  Latest patch: GET  https://ark-backend.<subdomain>.workers.dev/halo/patches/latest.json"
  echo "  Admin UI:     https://ark-backend.<subdomain>.workers.dev/admin"
fi
echo ""
echo "  Admin secret: $ADMIN_SECRET"
echo ""
