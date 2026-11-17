#!/usr/bin/env bash
# ARK Crisis Suite — manual deploy to VPS (arks.solutions)
#
# Usage (from the ARK repo root):
#   bash deploy/deploy.sh
#
# Requirements:
#   - SSH access to the VPS (key-based, halo user or root)
#   - rsync installed locally
#
# What this does:
#   1. Copies ARK.php to /var/www/arks.solutions/ on the VPS
#   2. Creates ark-data directories (bug reports + patches)
#   3. Reloads Caddy

set -euo pipefail

VPS_HOST="${ARK_VPS_HOST:-halo@31.220.104.240}"
WEB_ROOT="/var/www/arks.solutions"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "▶ ARK deploy — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "  Source : $REPO_ROOT/ARK.php"
echo "  Target : $VPS_HOST:$WEB_ROOT/ARK.php"
echo ""

# 1. Ensure directories exist
ssh "$VPS_HOST" "mkdir -p $WEB_ROOT/ark-data/bugs $WEB_ROOT/ark-data/patches"

# 2. Upload ARK.php
rsync -avz \
  "$REPO_ROOT/ARK.php" \
  "$VPS_HOST:$WEB_ROOT/ARK.php"

# 3. Permissions
ssh "$VPS_HOST" "chmod 644 $WEB_ROOT/ARK.php && chown -R www-data:www-data $WEB_ROOT/ 2>/dev/null || true"

# 4. Initialize patch file
ssh "$VPS_HOST" "[ -f $WEB_ROOT/ark-data/patches/latest.json ] || echo '{\"active\":false}' > $WEB_ROOT/ark-data/patches/latest.json"

# 5. Reload Caddy
echo "▶ Reloading Caddy…"
ssh "$VPS_HOST" \
  "caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || \
   systemctl reload caddy 2>/dev/null || \
   docker compose -f /opt/halosuite/app/deploy/docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || \
   echo 'Caddy reload skipped — reload manually'"

echo ""
echo "✓ Deployed."
echo "  App:   https://arks.solutions/ARK.php"
echo "  Admin: https://arks.solutions/ARK.php?admin  (password: ARK-admin-2024)"
echo ""
echo "  First-time checklist:"
echo "  [ ] DNS A record arks.solutions → $VPS_HOST"
echo "  [ ] Caddy config: deploy/arks.solutions.caddy installed in /etc/caddy/sites-enabled/"
echo "  [ ] PHP-FPM running: systemctl status php8.2-fpm"
echo "  [ ] PHP socket path matches arks.solutions.caddy (php8.2-fpm.sock)"
