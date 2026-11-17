<?php
/**
 * ARK Crisis Suite — web front door (Hostinger / any PHP host)
 *
 *   /            → serves the app (ARK-CRISIS-SUITE.html, the same file people download)
 *   /?patches    → GET   current hot-patch JSON (read by every running copy of ARK)
 *   /?bugs       → POST  bug-report intake
 *   /?admin      → password-protected panel: publish a patch, read bug reports
 *
 * No database. Runtime data lives in ./ark-data/ (created automatically, blocked from the web).
 *
 * ADMIN PASSWORD: never stored in this file or in the repository. The panel stays switched off
 * until ark-data/config.php exists on the server. See docs/DEPLOY.md ("Turn on the admin panel").
 *
 * If this file ever fails, the app still works: /ARK-CRISIS-SUITE.html is plain static HTML.
 */

declare(strict_types=1);

const ARK_APP_FILE       = __DIR__ . '/ARK-CRISIS-SUITE.html';
const ARK_DATA_DIR       = __DIR__ . '/ark-data';
const ARK_EMPTY_PATCH    = '{"version":"0.0.0","summary":"","patches":[]}';
const ARK_MAX_BUG_BYTES  = 16384;   // one report
const ARK_MAX_BUG_FILES  = 500;     // oldest are dropped beyond this
const ARK_BUGS_PER_HOUR  = 12;      // per sender
const ARK_MAX_PATCH_BYTES = 65536;
const ARK_LOGIN_MAX_FAILS = 5;      // then locked for ARK_LOGIN_LOCK_SECS
const ARK_LOGIN_LOCK_SECS = 900;
const ARK_PATCH_ACTIONS  = ['replace_text', 'add_css', 'remove_element',
                            'show_element', 'hide_element', 'set_attr', 'remove_class', 'add_class'];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ─── Storage helpers ────────────────────────────────────────────────────────────────────────

/** Create ark-data/ on first use and make sure the web server refuses to serve anything in it. */
function ark_data_ready(): bool
{
    foreach ([ARK_DATA_DIR, ARK_DATA_DIR . '/bugs', ARK_DATA_DIR . '/patches', ARK_DATA_DIR . '/limits'] as $dir) {
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            return false;
        }
    }
    $guard = ARK_DATA_DIR . '/.htaccess';
    if (!is_file($guard)) {
        @file_put_contents($guard, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
    }
    return true;
}

function ark_patch_file(): string
{
    return ARK_DATA_DIR . '/patches/latest.json';
}

/** A short, non-reversible label for the sender — used only for rate limiting, never the raw IP. */
function ark_sender_key(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return substr(hash('sha256', 'ark|' . $ip . '|' . __DIR__), 0, 24);
}

/**
 * Sliding-window counter stored as a small file of timestamps.
 * Returns true when the caller is still inside the limit (and records this hit).
 */
function ark_rate_ok(string $bucket, int $max, int $windowSecs, bool $record = true): bool
{
    $file = ARK_DATA_DIR . '/limits/' . preg_replace('/[^a-z0-9_-]/i', '', $bucket) . '.json';
    $now  = time();
    $hits = [];
    if (is_file($file)) {
        $decoded = json_decode((string) @file_get_contents($file), true);
        if (is_array($decoded)) {
            $hits = array_values(array_filter($decoded, static fn($t) => is_int($t) && $t > $now - $windowSecs));
        }
    }
    if (count($hits) >= $max) {
        return false;
    }
    if ($record) {
        $hits[] = $now;
        @file_put_contents($file, json_encode($hits), LOCK_EX);
    }
    return true;
}

function ark_rate_reset(string $bucket): void
{
    @unlink(ARK_DATA_DIR . '/limits/' . preg_replace('/[^a-z0-9_-]/i', '', $bucket) . '.json');
}

function ark_json(int $status, array $body): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($body);
    exit;
}

/** The two public endpoints are called from downloaded copies (file://) and from hubs, so allow any origin. */
function ark_cors(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Cache-Control');
    header('Access-Control-Max-Age: 86400');
}

function ark_h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Returns [normalisedPatchArray, null] or [null, "what is wrong"]. Mirrors what the app will accept. */
function ark_validate_patch(string $json): array
{
    if (strlen($json) > ARK_MAX_PATCH_BYTES) {
        return [null, 'Patch is too large (limit ' . (ARK_MAX_PATCH_BYTES / 1024) . ' KB).'];
    }
    $data = json_decode($json, true);
    if (!is_array($data)) {
        return [null, 'That is not valid JSON.'];
    }
    if (!isset($data['version']) || !is_string($data['version']) || !preg_match('/^\d+\.\d+\.\d+$/', $data['version'])) {
        return [null, '"version" is required and must look like 1.2.3 — and be higher than the last patch, or apps will ignore it.'];
    }
    if (!isset($data['patches']) || !is_array($data['patches']) || array_values($data['patches']) !== $data['patches']) {
        return [null, '"patches" is required and must be a list: [ { "action": ... }, ... ]'];
    }
    foreach ($data['patches'] as $i => $op) {
        $n = $i + 1;
        if (!is_array($op) || !isset($op['action']) || !in_array($op['action'], ARK_PATCH_ACTIONS, true)) {
            return [null, "Patch #$n: \"action\" must be one of: " . implode(', ', ARK_PATCH_ACTIONS) . '.'];
        }
        if ($op['action'] === 'store_set') {
            if (!isset($op['key']) || !is_string($op['key'])) {
                return [null, "Patch #$n: store_set needs a \"key\"."];
            }
        } elseif ($op['action'] !== 'add_css' && (!isset($op['selector']) || !is_string($op['selector']) || $op['selector'] === '')) {
            return [null, "Patch #$n: \"selector\" is required for {$op['action']}."];
        }
    }
    if (isset($data['summary']) && !is_string($data['summary'])) {
        return [null, '"summary" must be text.'];
    }
    return [['version' => $data['version'], 'summary' => $data['summary'] ?? '', 'patches' => $data['patches']], null];
}

// ─── CORS preflight ─────────────────────────────────────────────────────────────────────────

if ($method === 'OPTIONS') {
    ark_cors();
    http_response_code(204);
    exit;
}

// ─── GET /?patches — current hot-patch ──────────────────────────────────────────────────────

if (isset($_GET['patches'])) {
    ark_cors();
    if ($method !== 'GET' && $method !== 'HEAD') {
        ark_json(405, ['error' => 'GET only']);
    }
    $body = is_file(ark_patch_file()) ? (string) @file_get_contents(ark_patch_file()) : '';
    if ($body === '' || !is_array(json_decode($body, true))) {
        $body = ARK_EMPTY_PATCH;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo $body;
    exit;
}

// ─── POST /?bugs — bug-report intake ────────────────────────────────────────────────────────

if (isset($_GET['bugs'])) {
    ark_cors();
    if ($method !== 'POST') {
        ark_json(405, ['error' => 'POST only']);
    }
    if (!ark_data_ready()) {
        ark_json(503, ['error' => 'storage unavailable']);
    }
    $raw = (string) file_get_contents('php://input', false, null, 0, ARK_MAX_BUG_BYTES + 1);
    if ($raw === '' || strlen($raw) > ARK_MAX_BUG_BYTES) {
        ark_json(413, ['error' => 'report must be 1 byte to 16 KB']);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        ark_json(400, ['error' => 'report must be a JSON object']);
    }
    if (!ark_rate_ok('bugs_' . ark_sender_key(), ARK_BUGS_PER_HOUR, 3600)) {
        ark_json(429, ['error' => 'too many reports — try again later']);
    }
    $id   = bin2hex(random_bytes(8));
    $file = ARK_DATA_DIR . '/bugs/' . gmdate('Y-m-d_H-i-s') . '_' . $id . '.json';
    $ok   = @file_put_contents($file, json_encode(['id' => $id, 'received' => gmdate('c'), 'data' => $data],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
    if ($ok === false) {
        ark_json(503, ['error' => 'could not store report']);
    }
    // Keep the folder bounded so a flood can never fill the disk.
    $all = glob(ARK_DATA_DIR . '/bugs/*.json') ?: [];
    if (count($all) > ARK_MAX_BUG_FILES) {
        sort($all);
        foreach (array_slice($all, 0, count($all) - ARK_MAX_BUG_FILES) as $old) {
            @unlink($old);
        }
    }
    ark_json(200, ['status' => 'ok', 'id' => $id]);
}

// ─── /?admin — patch + bug-report panel ─────────────────────────────────────────────────────

if (isset($_GET['admin'])) {
    header('Cache-Control: no-store');
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

    $storageOk  = ark_data_ready();
    $configFile = ARK_DATA_DIR . '/config.php';
    $config     = is_file($configFile) ? (include $configFile) : null;
    $hash       = is_array($config) && isset($config['admin_password_hash']) && is_string($config['admin_password_hash'])
        ? $config['admin_password_hash'] : '';
    $configured = $storageOk && $hash !== '' && (password_get_info($hash)['algo'] ?? null) !== null;

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('ark_admin');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    $csrf     = $_SESSION['csrf'];
    $signedIn = $configured && !empty($_SESSION['ark_admin'])
        && ($_SESSION['expires'] ?? 0) > time();
    $self     = strtok($_SERVER['REQUEST_URI'] ?? '/', '?') . '?admin';
    $notice   = '';
    $error    = '';
    $draft    = '';

    if ($method === 'POST') {
        $csrfOk = isset($_POST['csrf']) && is_string($_POST['csrf']) && hash_equals($csrf, $_POST['csrf']);
        $action = is_string($_POST['do'] ?? null) ? $_POST['do'] : '';

        if (!$csrfOk) {
            $error = 'This page expired. Please try again.';
        } elseif ($action === 'login' && $configured) {
            $bucket = 'login_' . ark_sender_key();
            if (!ark_rate_ok($bucket, ARK_LOGIN_MAX_FAILS, ARK_LOGIN_LOCK_SECS, false)) {
                $error = 'Too many wrong passwords. Wait 15 minutes and try again.';
            } elseif (password_verify((string) ($_POST['password'] ?? ''), $hash)) {
                ark_rate_reset($bucket);
                session_regenerate_id(true);
                $_SESSION['ark_admin'] = true;
                $_SESSION['expires']   = time() + 3600;
                $_SESSION['csrf']      = bin2hex(random_bytes(24));
                header('Location: ' . $self, true, 303);
                exit;
            } else {
                ark_rate_ok($bucket, ARK_LOGIN_MAX_FAILS, ARK_LOGIN_LOCK_SECS, true);
                usleep(400000);
                $error = 'Wrong password.';
            }
        } elseif ($action === 'logout') {
            $_SESSION = [];
            session_destroy();
            header('Location: ' . $self, true, 303);
            exit;
        } elseif ($signedIn) {
            if ($action === 'push_patch') {
                $draft = (string) ($_POST['patch_json'] ?? '');
                [$patch, $problem] = ark_validate_patch(trim($draft));
                if ($patch === null) {
                    $error = $problem;
                } elseif (@file_put_contents(ark_patch_file(), json_encode($patch, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
                    $error = 'Could not save the patch (the server refused to write the file).';
                } else {
                    $notice = 'Patch v' . $patch['version'] . ' is live. Running copies pick it up within 2 hours, or on next open.';
                    $draft  = '';
                }
            } elseif ($action === 'clear_patch') {
                @file_put_contents(ark_patch_file(), ARK_EMPTY_PATCH, LOCK_EX);
                $notice = 'Patch cleared. Copies that already applied it keep it until they are reloaded.';
            } elseif ($action === 'delete_bug') {
                $name = basename((string) ($_POST['file'] ?? ''));
                if (preg_match('/^[0-9_-]+_[0-9a-f]+\.json$/', $name)) {
                    @unlink(ARK_DATA_DIR . '/bugs/' . $name);
                }
                $notice = 'Report deleted.';
            } elseif ($action === 'delete_all_bugs') {
                foreach (glob(ARK_DATA_DIR . '/bugs/*.json') ?: [] as $f) {
                    @unlink($f);
                }
                $notice = 'All reports deleted.';
            }
        }
    }

    $bugs = [];
    $currentPatch = ARK_EMPTY_PATCH;
    if ($signedIn) {
        $_SESSION['expires'] = time() + 3600;
        $files = glob(ARK_DATA_DIR . '/bugs/*.json') ?: [];
        rsort($files);
        foreach (array_slice($files, 0, 200) as $f) {
            $b = json_decode((string) @file_get_contents($f), true);
            if (is_array($b)) {
                $b['_file'] = basename($f);
                $bugs[] = $b;
            }
        }
        if (is_file(ark_patch_file())) {
            $currentPatch = (string) @file_get_contents(ark_patch_file());
        }
    }
    $patchData   = json_decode($currentPatch, true);
    $patchActive = is_array($patchData) && !empty($patchData['patches']);
    $example = "{\n  \"version\": \"1.2.1\",\n  \"summary\": \"Fix a typo on the Home tab\",\n  \"patches\": [\n    { \"action\": \"replace_text\", \"selector\": \"#some-element-id\", \"value\": \"Corrected text\" }\n  ]\n}";
    ?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>ARK Admin</title>
<style>
:root{--bg:#f0ebe0;--s:#faf7f0;--b:#d9cfba;--a:#8b6f3e;--t:#2b2418;--tm:#75684f;--d:#b3261e;--ok:#1e7a45}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--t);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh}
.hdr{background:var(--s);border-bottom:1px solid var(--b);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.hdr h1{font-size:17px;color:var(--a)}.wrap{max-width:860px;margin:0 auto;padding:24px 16px}
.card{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:20px;margin-bottom:20px}
.card h2{font-size:16px;margin-bottom:10px}.login{max-width:360px;margin:60px auto}
p{margin-bottom:10px}.muted{color:var(--tm);font-size:13px}
input[type=password],textarea{width:100%;padding:10px 12px;border:1px solid var(--b);border-radius:8px;background:#fff;color:var(--t);font-size:16px;margin-bottom:12px}
textarea{font:13px/1.45 ui-monospace,Consolas,monospace;resize:vertical}
input:focus,textarea:focus{outline:2px solid var(--a);outline-offset:1px}
button{padding:9px 16px;border-radius:8px;border:1px solid transparent;font-size:14px;font-weight:600;cursor:pointer}
.p{background:var(--a);color:#fff}.dg{background:var(--d);color:#fff}.g{background:transparent;border-color:var(--b);color:var(--tm)}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}form.inline{display:inline}
.msg{padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:14px;border:1px solid}
.ok{background:#e6f4ea;border-color:var(--ok);color:var(--ok)}.err{background:#fdecea;border-color:var(--d);color:var(--d)}
pre{background:#fff;border:1px solid var(--b);border-radius:8px;padding:10px;font:12px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;margin-bottom:12px}
.badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:700;margin-left:6px;vertical-align:middle}
.on{background:#e6f4ea;color:var(--ok)}.off{background:#ece6d8;color:var(--tm)}
details{border:1px solid var(--b);border-radius:8px;margin-bottom:8px;background:#fff}
summary{padding:10px 12px;cursor:pointer;font-size:13px}details pre{border:0;border-top:1px solid var(--b);border-radius:0;margin:0}
details .row{padding:8px 12px;border-top:1px solid var(--b)}
</style></head><body>
<div class="hdr"><h1>ARK Admin</h1>
<?php if ($signedIn): ?><form method="post" action="<?= ark_h($self) ?>" class="inline"><input type="hidden" name="csrf" value="<?= ark_h($csrf) ?>"><input type="hidden" name="do" value="logout"><button class="g">Sign out</button></form><?php endif; ?>
</div>
<div class="wrap">
<?php if ($notice !== ''): ?><div class="msg ok" role="status"><?= ark_h($notice) ?></div><?php endif; ?>
<?php if ($error !== ''): ?><div class="msg err" role="alert"><?= ark_h($error) ?></div><?php endif; ?>

<?php if (!$configured): ?>
<div class="card"><h2>Admin panel is switched off</h2>
<p>The ARK app itself is working normally. This panel stays off until an admin password is set on the server.</p>
<p class="muted">To turn it on, create the file <code>ark-data/config.php</code> next to this one. Step-by-step instructions are in <code>docs/DEPLOY.md</code> in the ARK repository, under “Turn on the admin panel”.<?php if (!$storageOk): ?> <strong>Also: the server could not create the <code>ark-data</code> folder — check folder permissions.</strong><?php endif; ?></p></div>

<?php elseif (!$signedIn): ?>
<div class="card login"><h2>Sign in</h2>
<form method="post" action="<?= ark_h($self) ?>" autocomplete="off">
<input type="hidden" name="csrf" value="<?= ark_h($csrf) ?>"><input type="hidden" name="do" value="login">
<label class="muted" for="pw">Admin password</label>
<input id="pw" type="password" name="password" required autofocus autocomplete="current-password">
<button class="p" style="width:100%">Sign in</button></form></div>

<?php else: ?>
<div class="card"><h2>Live patch <span class="badge <?= $patchActive ? 'on' : 'off' ?>"><?= $patchActive ? 'ACTIVE' : 'NONE' ?></span></h2>
<p class="muted">A patch is a small fix sent to every copy of ARK that can reach this site — including downloaded copies — without anyone re-downloading. Copies only apply a patch whose version is higher than their own. Patches can change text, styling and visibility; they cannot run code.</p>
<pre><?= ark_h(json_encode($patchData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: $currentPatch) ?></pre>
<form method="post" action="<?= ark_h($self) ?>">
<input type="hidden" name="csrf" value="<?= ark_h($csrf) ?>"><input type="hidden" name="do" value="push_patch">
<label class="muted" for="pj">New patch (JSON)</label>
<textarea id="pj" name="patch_json" rows="10" spellcheck="false" placeholder="<?= ark_h($example) ?>"><?= ark_h($draft) ?></textarea>
<p class="muted">Allowed actions: <?= ark_h(implode(', ', ARK_PATCH_ACTIONS)) ?>.</p>
<div class="row"><button class="p">Publish patch</button></div></form>
<?php if ($patchActive): ?><form method="post" action="<?= ark_h($self) ?>" style="margin-top:10px" onsubmit="return confirm('Remove the live patch?')">
<input type="hidden" name="csrf" value="<?= ark_h($csrf) ?>"><input type="hidden" name="do" value="clear_patch"><button class="g">Remove live patch</button></form><?php endif; ?>
</div>

<div class="card"><h2>Bug reports (<?= count($bugs) ?>)</h2>
<?php if (!$bugs): ?><p class="muted">No reports yet.</p><?php else: ?>
<?php foreach ($bugs as $b): ?>
<details><summary><?= ark_h($b['received'] ?? $b['_file']) ?> — <?= ark_h(mb_substr(is_string($b['data']['bug'] ?? null) ? $b['data']['bug'] : '(no description)', 0, 90)) ?></summary>
<pre><?= ark_h(json_encode($b['data'] ?? $b, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) ?></pre>
<div class="row"><form method="post" action="<?= ark_h($self) ?>" class="inline" onsubmit="return confirm('Delete this report?')">
<input type="hidden" name="csrf" value="<?= ark_h($csrf) ?>"><input type="hidden" name="do" value="delete_bug"><input type="hidden" name="file" value="<?= ark_h($b['_file']) ?>"><button class="g">Delete</button></form></div>
</details>
<?php endforeach; ?>
<form method="post" action="<?= ark_h($self) ?>" style="margin-top:12px" onsubmit="return confirm('Delete ALL bug reports? This cannot be undone.')">
<input type="hidden" name="csrf" value="<?= ark_h($csrf) ?>"><input type="hidden" name="do" value="delete_all_bugs"><button class="dg">Delete all reports</button></form>
<?php endif; ?></div>
<?php endif; ?>
</div></body></html>
<?php
    exit;
}

// ─── Everything else: the app ───────────────────────────────────────────────────────────────

if (!is_file(ARK_APP_FILE)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "ARK is being updated. Please try again in a minute.\n";
    exit;
}

$mtime = (int) filemtime(ARK_APP_FILE);
$etag  = '"' . dechex($mtime) . '-' . dechex((int) filesize(ARK_APP_FILE)) . '"';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');                // always revalidate, so fixes reach people quickly
header('ETag: ' . $etag);
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: no-referrer');
if (trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
    http_response_code(304);
    exit;
}
if ($method === 'HEAD') {
    exit;
}
readfile(ARK_APP_FILE);
