# Putting ARK on the web (Hostinger)

The live site is **https://arks.solutions**. Everything it needs is in one folder that the build
script makes for you. No database, no Node.js on the server, no Cloudflare.

## 1. Build

```bash
python scripts/build.py --with-node
```

This creates `build/public_html/` and the same thing zipped as `build/ARK-website.zip`.

## 2. Upload

1. Hostinger hPanel → **Websites** → arks.solutions → **File Manager**.
2. Open `public_html/`. Delete what is there **except** the `ark-data` folder (bug reports, the
   current patch and the admin password live in it).
3. Upload `ARK-website.zip`, right-click → **Extract** into `public_html/`, then delete the zip.

What ends up on the server:

```
public_html/
├── index.php               front door: welcome page, /app, ?patches, ?bugs, ?admin
├── landing.html            welcome page (shown at /)
├── ARK-CRISIS-SUITE.html   the app (shown at /app, and the file people save)
├── hub.html                hub download page (shown at /hub)
├── connect.html            "Connect to ARK" form for official services (shown at /connect)
├── site.css                styles shared by the three pages
├── .htaccess               https, clean addresses, security headers
├── service-worker.js       offline copy for people who visited once
├── manifest.json  robots.txt  og-image.png
├── icons/  brand/
└── ark-data/               created by the server; never served to visitors
```

## 3. Check

| Address | Should show |
|---|---|
| `https://arks.solutions/` | Welcome page with the Halo mascot |
| `https://arks.solutions/app` | The app |
| `https://arks.solutions/hub` | Hub download page |
| `https://arks.solutions/connect` | Connect to ARK form; sending it shows a reference number |
| `https://arks.solutions/?patches` | `{"version":"0.0.0","summary":"","patches":[]}` |
| `https://arks.solutions/ark-data/` | **403 Forbidden** (this must not open) |

If `/app` gives "not found", the host is ignoring `.htaccess`; the app still works at
`/ARK-CRISIS-SUITE.html`.

## Turn on the admin panel

The panel at `https://arks.solutions/?admin` lets you read bug reports and "Connect to ARK" requests
from official services, and publish a small fix to every running copy. It is **off** until a password exists on the server. The password is never
stored in this repository.

1. Pick a long password and keep it in a password manager.
2. Make its hash. On any computer with PHP:
   ```bash
   php -r 'echo password_hash("YOUR-PASSWORD-HERE", PASSWORD_DEFAULT), "\n";'
   ```
3. In File Manager create `public_html/ark-data/config.php` containing:
   ```php
   <?php
   return ['admin_password_hash' => 'PASTE-THE-HASH-HERE'];
   ```
4. Open `/?admin` and sign in. Five wrong passwords lock sign-in for 15 minutes.

To change the password, repeat steps 2–3. To switch the panel off, delete `config.php`.

## Publishing a fix (patch)

A patch changes wording, styling or visibility in copies of ARK that can reach the site — including
saved copies — without anyone downloading again. It cannot run code or touch saved data.

```json
{
  "version": "1.2.1",
  "summary": "Correct a phone number in the contacts list",
  "patches": [
    { "action": "replace_text", "selector": "#some-element-id", "value": "Corrected text" },
    { "action": "add_css", "value": ".some-class{display:none}" }
  ]
}
```

- `version` must be higher than the app's own version (shown in Settings) or copies ignore it.
- Actions: `replace_text`, `add_css`, `remove_element`, `show_element`, `hide_element`,
  `set_attr`, `add_class`, `remove_class`.
- For anything bigger, change `ARK-CRISIS-SUITE.html`, bump `APP_VERSION` in it, rebuild and upload.

## Releasing a new version

1. Edit, then run the checks in the README.
2. Bump `APP_VERSION` in `ARK-CRISIS-SUITE.html` and `CACHE_VERSION` in `web/service-worker.js`.
3. `python scripts/build.py --with-node`
4. Upload `build/ARK-website.zip` as above.
5. Create a GitHub release and attach `build/ARK-CRISIS-SUITE.html`, `build/ARK-hub-kit.zip` and
   `build/ARK-website.zip`. The hub page downloads `ARK-hub-kit.zip` from the latest release, so
   keep that file name.
