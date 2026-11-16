#!/usr/bin/env bash
# ARK Crisis Suite — deploy to ark.halosuite.ai
#
# Usage (from the ARK repo root):
#   bash deploy/deploy.sh
#
# Requirements:
#   - SSH access to the HaloSuite VPS as the halo user (key-based)
#   - rsync installed locally
#   - The VPS /opt/halosuite/ark directory exists (created on first run)
#   - The ark.caddy site block is in place (HaloSuiteMain/deploy/caddy/sites-enabled/ark.caddy)
#   - DNS A record ark.halosuite.ai → 31.220.104.240 (Proxied) is live in Cloudflare
#
# What this does:
#   1. rsync all public files to /opt/halosuite/ark on the VPS
#   2. Reloads Caddy so the new service-worker cache version takes effect
#   3. Prints the live URL

set -euo pipefail

VPS_HOST="${ARK_VPS_HOST:-halo@31.220.104.240}"
VPS_DIR="/opt/halosuite/ark"
COMPOSE_FILE="/opt/halosuite/app/deploy/docker-compose.prod.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "▶ ARK deploy — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "  Source : $REPO_ROOT"
echo "  Target : $VPS_HOST:$VPS_DIR"
echo ""

# ── 1. Ensure target directory exists ─────────────────────────────────────────
ssh "$VPS_HOST" "mkdir -p $VPS_DIR"

# ── 2. rsync public files (exclude dev-only files) ────────────────────────────
# Transferred:
#   ARK-CRISIS-SUITE.html   the main offline app
#   landing.html            the web landing page
#   index.html              / → landing.html redirect
#   manifest.json           PWA manifest
#   service-worker.js       offline service worker
#   og-image.png            social sharing image (1200×630)
#   icons/                  PWA icons
# Not transferred:
#   src/                    hub/toolkit server code — deployed separately
#   BACKLOG.md, PROTOCOL.md, README.md — docs only
#   deploy/                 this script
#   .git/                   git history
rsync -avz --delete \
  --exclude='.git/' \
  --exclude='deploy/' \
  --exclude='src/' \
  --exclude='BACKLOG.md' \
  --exclude='PROTOCOL.md' \
  --exclude='README.md' \
  --exclude='.gitignore' \
  "$REPO_ROOT/" \
  "$VPS_HOST:$VPS_DIR/"

echo ""
echo "▶ Reloading Caddy to bust service-worker cache…"
ssh "$VPS_HOST" \
  "docker compose -f $COMPOSE_FILE exec caddy caddy reload --config /etc/caddy/Caddyfile 2>&1 || echo 'Caddy reload skipped (may not be running yet)'"

echo ""
echo "✓ ARK deployed."
echo "  Live at: https://ark.halosuite.ai/"
echo "  App:     https://ark.halosuite.ai/ARK-CRISIS-SUITE.html"
echo ""
echo "  First-time checklist:"
echo "  [ ] DNS A record ark.halosuite.ai → 31.220.104.240 (Cloudflare, Proxied)"
echo "  [ ] ark.caddy mounted in Caddy container (docker-compose.prod.yml volumes)"
echo "  [ ] /srv/ark bind-mount added to caddy service"
