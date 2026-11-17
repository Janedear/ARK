# ARK Crisis Suite — VPS Setup Guide
# arks.solutions on your Hostinger VPS

This is the **one-time setup** an agent needs to run to get `arks.solutions` live on the VPS.
After this, every push to `for-hostinger` auto-deploys via GitHub Actions.

---

## What goes where

```
/var/www/arks.solutions/
├── ARK.php                    ← the entire app (deployed by CI)
└── ark-data/
    ├── bugs/                  ← bug reports land here (auto-created by PHP)
    └── patches/
        └── latest.json        ← hot-patch file (auto-created by PHP)
```

---

## 1. Install PHP-FPM (if not already installed)

```bash
apt update
apt install -y php8.2-fpm php8.2-cli
systemctl enable php8.2-fpm
systemctl start php8.2-fpm
```

Verify socket exists:
```bash
ls /run/php/php8.2-fpm.sock
```

---

## 2. Install Caddy (if not already installed)

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
```

---

## 3. Configure Caddy for arks.solutions

Copy the site block:
```bash
cp /opt/halosuite/ark/deploy/arks.solutions.caddy /etc/caddy/sites-enabled/arks.solutions.caddy
```

If Caddy uses a single Caddyfile (no sites-enabled), append the contents of `arks.solutions.caddy` to `/etc/caddy/Caddyfile`.

Reload:
```bash
caddy reload --config /etc/caddy/Caddyfile
# OR
systemctl reload caddy
```

---

## 4. Create web root and deploy ARK.php

```bash
mkdir -p /var/www/arks.solutions/ark-data/bugs
mkdir -p /var/www/arks.solutions/ark-data/patches
cp /opt/halosuite/ark/ARK.php /var/www/arks.solutions/ARK.php
echo '{"active":false}' > /var/www/arks.solutions/ark-data/patches/latest.json
chown -R www-data:www-data /var/www/arks.solutions/
chmod 644 /var/www/arks.solutions/ARK.php
```

---

## 5. DNS

Point `arks.solutions` A record → VPS IP address.
If using Cloudflare: set to **DNS only** (grey cloud) until confirmed working, then proxy.

---

## 6. Verify

```bash
curl -I https://arks.solutions/ARK.php
# Expect: HTTP/2 200
```

Open in browser: `https://arks.solutions/ARK.php`
Should see warm cream background (tan/beige), not green.

---

## 7. GitHub Actions auto-deploy

Every push to `for-hostinger` branch auto-deploys via `.github/workflows/deploy.yml`.

Required GitHub secrets (repo → Settings → Secrets → Actions):
| Secret | Value |
|--------|-------|
| `HALO_SSH_PRIVATE_KEY` | Private SSH key for VPS access |
| `HALO_KNOWN_HOSTS` | Output of: `ssh-keyscan -H <VPS_IP>` |
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH user (halo or root) |

Manual trigger: GitHub → Actions → "Deploy ARK" → Run workflow

---

## Endpoints after deploy

| URL | What |
|-----|------|
| `https://arks.solutions/ARK.php` | The app |
| `https://arks.solutions/ARK.php?admin` | Admin panel |
| `https://arks.solutions/ARK.php?patches` | Patch API (GET) |
| `https://arks.solutions/ARK.php?bugs` | Bug intake (POST) |

Admin password: `ARK-admin-2024`
