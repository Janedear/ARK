# ARK Backend — Deploy Guide

## Prerequisites

1. **Cloudflare account** (free tier works)
2. **API Token** — create one at https://dash.cloudflare.com/profile/api-tokens
   - Use template: "Edit Cloudflare Workers"
   - Permissions: Workers Scripts (Edit), Workers KV Storage (Edit), Account Settings (Read)

## One-command deploy

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
export CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Optional — enables email notifications for bug reports:
export SENDGRID_API_KEY=SG.your_sendgrid_key

cd /path/to/ark-worker
bash deploy.sh
```

The script will:
1. Install npm deps
2. Create a KV namespace (`ARK_KV`)
3. Generate a random admin secret
4. Set secrets via `wrangler secret put`
5. Deploy the Worker
6. Print your live URLs + admin secret

## Endpoints after deploy

| Endpoint | Description |
|----------|-------------|
| `POST https://ark-backend.<sub>.workers.dev/halo/bugs` | Receives bug reports from ARK |
| `GET  https://ark-backend.<sub>.workers.dev/halo/patches/latest.json` | Serves active patch (or 204) |
| `GET  https://ark-backend.<sub>.workers.dev/admin` | Admin dashboard UI |

## Update ARK constants

After deploy, update these two lines in `ARK-CRISIS-SUITE.html` (around line 5786–5787):

```javascript
PATCH_URL: 'https://ark-backend.<YOUR_SUBDOMAIN>.workers.dev/halo/patches/latest.json',
BUG_URL:   'https://ark-backend.<YOUR_SUBDOMAIN>.workers.dev/halo/bugs',
```

Your subdomain is the slug after `//` in the Worker URL wrangler prints.

## Admin dashboard

Visit `https://ark-backend.<sub>.workers.dev/admin` and enter the admin secret
printed during deploy. From there you can:
- View incoming bug reports, change status (new → reviewing → patched)
- Create patches with the patch op editor
- Publish / deactivate patches (live instantly, cached 10 min)

## Sending a test bug report

```bash
curl -X POST https://ark-backend.<sub>.workers.dev/halo/bugs \
  -H "Content-Type: application/json" \
  -d '{"bug":"Test bug from curl","appVersion":"8.7.0","online":true}'
```

## Creating a patch via API

```bash
curl -X POST https://ark-backend.<sub>.workers.dev/admin/patches \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: YOUR_SECRET" \
  -d '{
    "version": "1.0.1",
    "summary": "Fix typo in evacuation guide",
    "patches": [
      {
        "action": "set_text",
        "selector": "#evac-step-1",
        "text": "Grab go-bag and exit immediately"
      }
    ]
  }'

# Then publish it:
curl -X POST https://ark-backend.<sub>.workers.dev/admin/patches/PATCH_ID/publish \
  -H "X-Admin-Secret: YOUR_SECRET"
```
