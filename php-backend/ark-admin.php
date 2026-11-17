<?php
/**
 * ARK Crisis Suite — Admin Panel
 * Upload to: public_html/ark-admin.php
 *
 * IMPORTANT: Change the password below before uploading!
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
define('ADMIN_PASSWORD', 'ARK-admin-2024');
define('DATA_DIR',  __DIR__ . '/ark-data');
define('BUGS_DIR',  DATA_DIR . '/bugs');
define('PATCH_FILE', DATA_DIR . '/patches/latest.json');
// ──────────────────────────────────────────────────────────────────────────────

session_start();

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ark-admin.php');
    exit;
}

// Handle login
$loginError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if ($_POST['password'] === ADMIN_PASSWORD) {
        $_SESSION['ark_admin'] = true;
        header('Location: ark-admin.php');
        exit;
    } else {
        $loginError = 'Incorrect password.';
    }
}

// Handle actions (must be logged in)
if (!empty($_SESSION['ark_admin'])) {

    // Push a new patch
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['patch_json'])) {
        $patchDir = DATA_DIR . '/patches';
        if (!is_dir($patchDir)) mkdir($patchDir, 0755, true);
        $json = trim($_POST['patch_json']);
        $decoded = json_decode($json, true);
        if ($decoded !== null) {
            file_put_contents(PATCH_FILE, json_encode($decoded, JSON_PRETTY_PRINT));
            $patchMsg = '✅ Patch saved successfully.';
        } else {
            $patchMsg = '❌ Invalid JSON — patch not saved.';
        }
    }

    // Clear active patch
    if (isset($_GET['clear_patch'])) {
        file_put_contents(PATCH_FILE, json_encode(['active' => false], JSON_PRETTY_PRINT));
        header('Location: ark-admin.php?patched=cleared');
        exit;
    }

    // Delete a bug report
    if (isset($_GET['delete_bug'])) {
        $bugFile = BUGS_DIR . '/' . basename($_GET['delete_bug']);
        if (file_exists($bugFile)) unlink($bugFile);
        header('Location: ark-admin.php');
        exit;
    }

    // Clear all bugs
    if (isset($_GET['clear_bugs'])) {
        $files = glob(BUGS_DIR . '/*.json');
        if ($files) foreach ($files as $f) unlink($f);
        header('Location: ark-admin.php');
        exit;
    }
}

// ─── Load data ────────────────────────────────────────────────────────────────
$bugs        = [];
$currentPatch = ['active' => false];

if (!empty($_SESSION['ark_admin'])) {
    if (is_dir(BUGS_DIR)) {
        $bugFiles = array_reverse(glob(BUGS_DIR . '/*.json') ?: []);
        foreach ($bugFiles as $f) {
            $b = json_decode(file_get_contents($f), true);
            if ($b) {
                $b['_file'] = basename($f);
                $bugs[] = $b;
            }
        }
    }
    if (file_exists(PATCH_FILE)) {
        $currentPatch = json_decode(file_get_contents(PATCH_FILE), true) ?: ['active' => false];
    }
}

$isLoggedIn = !empty($_SESSION['ark_admin']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ARK Admin</title>
<style>
  :root {
    --bg: #1a1612;
    --surface: #252018;
    --border: #3a3020;
    --accent: #8b6f3e;
    --accent-light: #c4933f;
    --text: #e8dcc8;
    --text-muted: #9a8870;
    --danger: #c0392b;
    --success: #27ae60;
    --font: 'Inter', system-ui, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }

  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header h1 { font-size: 18px; font-weight: 600; color: var(--accent-light); letter-spacing: .5px; }
  .header a { color: var(--text-muted); text-decoration: none; font-size: 13px; }
  .header a:hover { color: var(--text); }

  .container { max-width: 900px; margin: 0 auto; padding: 32px 24px; }

  /* Login */
  .login-box {
    max-width: 360px;
    margin: 80px auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 36px;
  }
  .login-box h2 { font-size: 20px; margin-bottom: 24px; color: var(--accent-light); }
  .login-box input {
    width: 100%; padding: 10px 14px; border: 1px solid var(--border);
    border-radius: 8px; background: var(--bg); color: var(--text);
    font-size: 15px; margin-bottom: 16px; outline: none;
  }
  .login-box input:focus { border-color: var(--accent); }
  .login-box button {
    width: 100%; padding: 10px; background: var(--accent); border: none;
    border-radius: 8px; color: #fff; font-size: 15px; font-weight: 600;
    cursor: pointer; transition: background .15s;
  }
  .login-box button:hover { background: var(--accent-light); }
  .error { color: #e74c3c; font-size: 13px; margin-top: -10px; margin-bottom: 14px; }

  /* Cards */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 28px;
  }
  .card h2 { font-size: 16px; font-weight: 600; color: var(--accent-light); margin-bottom: 16px; }

  textarea {
    width: 100%; background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); font-family: 'Courier New', monospace;
    font-size: 13px; padding: 12px; resize: vertical; outline: none;
  }
  textarea:focus { border-color: var(--accent); }

  .btn {
    display: inline-block; padding: 8px 18px; border-radius: 7px; border: none;
    font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
    transition: opacity .15s;
  }
  .btn:hover { opacity: .85; }
  .btn-primary  { background: var(--accent); color: #fff; }
  .btn-danger   { background: var(--danger); color: #fff; }
  .btn-ghost    { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }

  .msg { padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
  .msg-ok  { background: rgba(39,174,96,.15); border: 1px solid var(--success); color: var(--success); }
  .msg-err { background: rgba(192,57,43,.15); border: 1px solid var(--danger);  color: #e74c3c; }

  .patch-current {
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 12px; font-family: monospace; font-size: 12px; color: var(--text-muted);
    margin-bottom: 16px; white-space: pre-wrap; word-break: break-all;
    max-height: 120px; overflow-y: auto;
  }
  .active-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px; }
  .badge-on  { background: rgba(39,174,96,.2);  color: var(--success); }
  .badge-off { background: rgba(154,136,112,.15); color: var(--text-muted); }

  /* Bugs table */
  .bug-count { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
  .bug-entry {
    border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px;
    overflow: hidden;
  }
  .bug-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; cursor: pointer; background: var(--bg);
  }
  .bug-header:hover { background: rgba(139,111,62,.08); }
  .bug-ts { font-size: 12px; color: var(--text-muted); font-family: monospace; }
  .bug-ip { font-size: 11px; color: var(--text-muted); }
  .bug-body {
    display: none; padding: 12px 14px; background: var(--surface);
    border-top: 1px solid var(--border);
    font-family: monospace; font-size: 12px; color: var(--text-muted);
    white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto;
  }
  .bug-entry.open .bug-body { display: block; }
  .no-bugs { color: var(--text-muted); font-size: 14px; text-align: center; padding: 24px 0; }

  .actions { display: flex; gap: 10px; align-items: center; }
  .gap-top { margin-top: 14px; }
</style>
</head>
<body>

<div class="header">
  <h1>🛡 ARK Crisis Suite — Admin</h1>
  <?php if ($isLoggedIn): ?>
    <a href="?logout=1">Sign out</a>
  <?php endif; ?>
</div>

<?php if (!$isLoggedIn): ?>
<!-- ─── LOGIN ─────────────────────────────────────────────────────────────── -->
<div class="container">
  <div class="login-box">
    <h2>Admin Login</h2>
    <?php if ($loginError): ?>
      <p class="error"><?= htmlspecialchars($loginError) ?></p>
    <?php endif; ?>
    <form method="post">
      <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password">
      <button type="submit">Sign In</button>
    </form>
  </div>
</div>

<?php else: ?>
<!-- ─── ADMIN PANEL ────────────────────────────────────────────────────────── -->
<div class="container">

  <!-- PATCH MANAGEMENT -->
  <div class="card">
    <h2>
      Patch Management
      <span class="active-badge <?= !empty($currentPatch['active']) ? 'badge-on' : 'badge-off' ?>">
        <?= !empty($currentPatch['active']) ? 'ACTIVE' : 'INACTIVE' ?>
      </span>
    </h2>

    <div class="patch-current"><?= htmlspecialchars(json_encode($currentPatch, JSON_PRETTY_PRINT)) ?></div>

    <?php if (isset($patchMsg)): ?>
      <div class="msg <?= strpos($patchMsg,'✅') !== false ? 'msg-ok' : 'msg-err' ?>"><?= htmlspecialchars($patchMsg) ?></div>
    <?php endif; ?>

    <form method="post">
      <textarea name="patch_json" rows="10" placeholder='Paste patch JSON here. Example:
{
  "active": true,
  "version": "1.0.1",
  "ops": [
    {
      "action": "replace",
      "selector": "#some-element",
      "content": "<p>Fixed content</p>"
    }
  ]
}'></textarea>
      <div class="actions gap-top">
        <button type="submit" class="btn btn-primary">Push Patch</button>
        <a href="?clear_patch=1" class="btn btn-ghost" onclick="return confirm('Clear the active patch?')">Clear Patch</a>
      </div>
    </form>
  </div>

  <!-- BUG REPORTS -->
  <div class="card">
    <h2>Bug Reports</h2>
    <div class="bug-count"><?= count($bugs) ?> report<?= count($bugs) !== 1 ? 's' : '' ?> on file</div>

    <?php if (count($bugs) > 0): ?>
      <div class="actions" style="margin-bottom: 14px;">
        <a href="?clear_bugs=1" class="btn btn-danger btn-sm"
           onclick="return confirm('Delete ALL bug reports? This cannot be undone.')">Delete All</a>
      </div>
      <?php foreach ($bugs as $bug): ?>
        <div class="bug-entry" onclick="this.classList.toggle('open')">
          <div class="bug-header">
            <div>
              <span class="bug-ts"><?= htmlspecialchars($bug['timestamp'] ?? $bug['_file']) ?></span>
              &nbsp;
              <span class="bug-ip"><?= htmlspecialchars($bug['ip'] ?? '') ?></span>
            </div>
            <a href="?delete_bug=<?= urlencode($bug['_file']) ?>"
               class="btn btn-ghost"
               style="font-size:11px;padding:4px 10px;"
               onclick="event.stopPropagation(); return confirm('Delete this report?')">Delete</a>
          </div>
          <div class="bug-body"><?= htmlspecialchars(json_encode($bug['data'] ?? $bug, JSON_PRETTY_PRINT)) ?></div>
        </div>
      <?php endforeach; ?>
    <?php else: ?>
      <div class="no-bugs">No bug reports yet.</div>
    <?php endif; ?>
  </div>

</div>
<?php endif; ?>

<script>
// Toggle bug entries
document.querySelectorAll('.bug-header').forEach(h => {
  h.addEventListener('click', function(e) {
    if (e.target.tagName === 'A') return;
    this.closest('.bug-entry').classList.toggle('open');
  });
});
</script>
</body>
</html>
