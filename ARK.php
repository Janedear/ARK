<?php
// ─── ARK Crisis Suite — Single-File Backend + App ────────────────────────────
// Upload this ONE file to public_html/ARK.php — that's it.
// Admin panel: yoursite.com/ARK.php?admin
// ─────────────────────────────────────────────────────────────────────────────

define('ADMIN_PASSWORD', 'ARK-admin-2024');
define('DATA_DIR', __DIR__ . '/ark-data');

// Auto-create data dirs on first run
@mkdir(DATA_DIR . '/bugs',    0755, true);
@mkdir(DATA_DIR . '/patches', 0755, true);

$patchFile = DATA_DIR . '/patches/latest.json';
if (!file_exists($patchFile)) file_put_contents($patchFile, '{"active":false}');

$uri    = $_SERVER['REQUEST_URI'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ─── API: Bug report (POST ?bugs) ────────────────────────────────────────────
if ($method === 'POST' && strpos($uri, '?bugs') !== false) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: ['raw' => $raw];
    $id   = uniqid();
    $report = ['id'=>$id,'timestamp'=>date('c'),'ip'=>$_SERVER['REMOTE_ADDR']??'','data'=>$data];
    file_put_contents(DATA_DIR.'/bugs/'.date('Y-m-d_H-i-s').'_'.$id.'.json', json_encode($report,JSON_PRETTY_PRINT));
    echo json_encode(['status'=>'ok','id'=>$id]);
    exit;
}

// ─── API: OPTIONS preflight ───────────────────────────────────────────────────
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

// ─── API: Patches (GET ?patches) ─────────────────────────────────────────────
if ($method === 'GET' && strpos($uri, '?patches') !== false) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    header('Cache-Control: no-cache');
    echo file_exists($patchFile) ? file_get_contents($patchFile) : '{"active":false}';
    exit;
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
if (isset($_GET['admin'])) {
    session_start();
    if (isset($_GET['logout'])) { session_destroy(); header('Location: ARK.php?admin'); exit; }
    if ($method==='POST' && isset($_POST['password'])) {
        if ($_POST['password']===ADMIN_PASSWORD) { $_SESSION['ark_admin']=true; header('Location: ARK.php?admin'); exit; }
        $loginError = 'Wrong password.';
    }
    if (!empty($_SESSION['ark_admin'])) {
        if ($method==='POST' && isset($_POST['patch_json'])) {
            $j=trim($_POST['patch_json']); $d=json_decode($j,true);
            $patchMsg = $d!==null ? (file_put_contents($patchFile,json_encode($d,JSON_PRETTY_PRINT)) ? '✅ Patch saved.' : '❌ Write failed.') : '❌ Invalid JSON.';
        }
        if (isset($_GET['clear_patch'])) { file_put_contents($patchFile,'{"active":false}'); header('Location: ARK.php?admin'); exit; }
        if (isset($_GET['del'])) { @unlink(DATA_DIR.'/bugs/'.basename($_GET['del'])); header('Location: ARK.php?admin'); exit; }
        if (isset($_GET['clear_bugs'])) { foreach(glob(DATA_DIR.'/bugs/*.json')as$f)@unlink($f); header('Location: ARK.php?admin'); exit; }
        $bugs=[]; foreach(array_reverse(glob(DATA_DIR.'/bugs/*.json') ?: [])as$f){$b=json_decode(file_get_contents($f),true);if($b){$b['_f']=basename($f);$bugs[]=$b;}}
        $cp=json_decode(file_get_contents($patchFile),true)??['active'=>false];
    }
    ?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARK Admin</title>
<style>
:root{--bg:#1a1612;--s:#252018;--b:#3a3020;--a:#8b6f3e;--al:#c4933f;--t:#e8dcc8;--tm:#9a8870;--d:#c0392b;--ok:#27ae60}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--t);font-family:system-ui,sans-serif;min-height:100vh}
.hdr{background:var(--s);border-bottom:1px solid var(--b);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.hdr h1{font-size:17px;color:var(--al)}.hdr a{color:var(--tm);text-decoration:none;font-size:13px}
.wrap{max-width:860px;margin:0 auto;padding:28px 20px}
.card{background:var(--s);border:1px solid var(--b);border-radius:10px;padding:22px;margin-bottom:24px}
.card h2{font-size:15px;color:var(--al);margin-bottom:14px}
.login{max-width:340px;margin:80px auto}
input[type=password]{width:100%;padding:9px 13px;border:1px solid var(--b);border-radius:7px;background:var(--bg);color:var(--t);font-size:15px;margin-bottom:14px;outline:none}
input[type=password]:focus{border-color:var(--a)}
textarea{width:100%;background:var(--bg);border:1px solid var(--b);border-radius:7px;color:var(--t);font-family:monospace;font-size:12px;padding:10px;resize:vertical;outline:none}
textarea:focus{border-color:var(--a)}
.btn{display:inline-block;padding:7px 16px;border-radius:6px;border:none;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none}
.btn-p{background:var(--a);color:#fff}.btn-d{background:var(--d);color:#fff}.btn-g{background:transparent;border:1px solid var(--b);color:var(--tm)}
.btn:hover{opacity:.85}.gap{margin-top:12px;display:flex;gap:8px}
.msg{padding:9px 13px;border-radius:7px;margin-bottom:14px;font-size:13px}
.msg-ok{background:rgba(39,174,96,.12);border:1px solid var(--ok);color:var(--ok)}
.msg-err{background:rgba(192,57,43,.12);border:1px solid var(--d);color:#e74c3c}
.pre{background:var(--bg);border:1px solid var(--b);border-radius:7px;padding:10px;font-family:monospace;font-size:11px;color:var(--tm);white-space:pre-wrap;max-height:100px;overflow-y:auto;margin-bottom:14px}
.badge{display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;margin-left:6px}
.bon{background:rgba(39,174,96,.2);color:var(--ok)}.boff{background:rgba(154,136,112,.15);color:var(--tm)}
.bug{border:1px solid var(--b);border-radius:7px;margin-bottom:8px}
.bugh{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;cursor:pointer;background:var(--bg)}
.bugh:hover{background:rgba(139,111,62,.07)}.bugts{font-size:11px;color:var(--tm);font-family:monospace}
.bugb{display:none;padding:10px 13px;background:var(--s);border-top:1px solid var(--b);font-family:monospace;font-size:11px;color:var(--tm);white-space:pre-wrap;max-height:260px;overflow-y:auto}
.bug.o .bugb{display:block}.none{color:var(--tm);font-size:13px;text-align:center;padding:20px}
.err{color:#e74c3c;font-size:12px;margin-bottom:12px}
</style></head><body>
<div class="hdr"><h1>🛡 ARK Admin</h1><?php if(!empty($_SESSION['ark_admin'])):?><a href="ARK.php?admin&logout=1">Sign out</a><?php endif;?></div>
<div class="wrap">
<?php if(empty($_SESSION['ark_admin'])):?>
<div class="card login">
  <h2>Admin Login</h2>
  <?php if(!empty($loginError)):?><p class="err"><?=htmlspecialchars($loginError)?></p><?php endif;?>
  <form method="post"><input type="password" name="password" placeholder="Password" autofocus><button class="btn btn-p" style="width:100%">Sign In</button></form>
</div>
<?php else:?>
<div class="card">
  <h2>Patch <span class="badge <?=!empty($cp['active'])?'bon':'boff'?>"><?=!empty($cp['active'])?'ACTIVE':'INACTIVE'?></span></h2>
  <div class="pre"><?=htmlspecialchars(json_encode($cp,JSON_PRETTY_PRINT))?></div>
  <?php if(!empty($patchMsg)):?><div class="msg <?=strpos($patchMsg,'✅')!==false?'msg-ok':'msg-err'?>"><?=htmlspecialchars($patchMsg)?></div><?php endif;?>
  <form method="post">
    <textarea name="patch_json" rows="8" placeholder='{"active":true,"version":"1.0.1","ops":[{"action":"replace","selector":"#el","content":"<p>fix</p>"}]}'></textarea>
    <div class="gap"><button class="btn btn-p" type="submit">Push Patch</button><a class="btn btn-g" href="ARK.php?admin&clear_patch=1" onclick="return confirm('Clear patch?')">Clear</a></div>
  </form>
</div>
<div class="card">
  <h2>Bug Reports (<?=count($bugs)?>)</h2>
  <?php if(count($bugs)):?>
  <div class="gap" style="margin-bottom:12px"><a class="btn btn-d" href="ARK.php?admin&clear_bugs=1" onclick="return confirm('Delete all?')">Delete All</a></div>
  <?php foreach($bugs as $b):?>
  <div class="bug"><div class="bugh"><span class="bugts"><?=htmlspecialchars($b['timestamp']??$b['_f'])?> &nbsp; <?=htmlspecialchars($b['ip']??'')?></span>
  <a class="btn btn-g" style="font-size:11px;padding:3px 9px" href="ARK.php?admin&del=<?=urlencode($b['_f'])?>" onclick="event.stopPropagation();return confirm('Delete?')">Del</a></div>
  <div class="bugb"><?=htmlspecialchars(json_encode($b['data']??$b,JSON_PRETTY_PRINT))?></div></div>
  <?php endforeach;?>
  <?php else:?><div class="none">No reports yet.</div><?php endif;?>
</div>
<?php endif;?>
</div>
<script>document.querySelectorAll('.bugh').forEach(h=>h.addEventListener('click',function(e){if(e.target.tagName==='A')return;this.closest('.bug').classList.toggle('o')}));</script>
</body></html>
<?php exit; } ?>
<!DOCTYPE html>
<!--
  ARK Crisis Suite — Single-File Emergency Communication App
  ==========================================================
  Version : 1.0 (prototype)
  License : MIT
  Repo    : https://github.com/Janedear/ARK
  Contact : hello@halosuite.ai

  DESIGN INTENT — why this is a single HTML file
  -----------------------------------------------
  ARK is intentionally built as one self-contained HTML file with zero external
  dependencies. This is not a limitation; it is the core architecture constraint:

    1. OFFLINE-FIRST. The file must work when copied to a USB stick, opened from
       a local filesystem, or served from an offline Raspberry Pi hub over Wi-Fi.
       A build step producing multiple files adds failure modes (broken relative
       paths, missing chunks). One file has exactly one failure mode: not present.

    2. ZERO INSTALL. Recipients share it over Signal, AirDrop, email, or SD card.
       A web app with a package.json cannot be shared this way.

    3. DEPLOYABLE ANYWHERE. Drop it in an S3 bucket, a Caddy static root, a Pi's
       home directory, or email it. No server-side rendering, no Node runtime.

    4. AUDITABLE. Emergency software earns trust through inspectability. A single
       HTML file can be read, reviewed, and forked by anyone with a text editor.

  MODULES (in source order)
  -------------------------
  CSS            Lines ~52–443    Design system: tokens, layout, components
  HTML           Lines ~444–693   Static shells: onboarding wizard, modals, nav
  Tabs           Lines ~695–1600  Home, Messages, Medical, Map, Radio, Settings
  DB             Lines ~1601–     IndexedDB wrapper (messages, resources)
  Store          Lines ~...       localStorage wrapper
  UI             Lines ~...       Tab switching, rendering, toast, modal helpers
  Hub            Lines ~2082–     Hub sync, four-state connection pill, queue drain
  Household      Lines ~...       Household plan, contacts
  Guides         Lines ~...       Survival/medical guides
  CPR            Lines ~...       CPR timer module
  MapTool        Lines ~...       Offline map utilities
  RadioTool      Lines ~...       Morse encoder, freq chart
  ShareARK       Lines ~3790–     QR code + share flow
  ARKQr          Lines ~3800–     Pure-JS Reed-Solomon QR encoder (versions 1–10, ECL M)
  Init           Lines ~4008–     DOMContentLoaded bootstrap, PWA install prompt

  HUB PROTOCOL: ARK-RELAY-1
  -------------------------
  Signed JSON packets (ECDSA P-256/SHA-256). Fields: v, kind, channel, alias,
  text, ref, issued_at, expires_at, public_key, id (sha256 hex), signature
  (base64url raw r||s 64 bytes). Full spec: PROTOCOL.md in this repository.

  SECURITY MODEL
  ---------------
  - Signatures prove message integrity, NOT identity.
  - Hub message board is public and unencrypted; treat it as a noticeboard.
  - No delivery guarantee; "seen" count ≠ help is coming.
  - ARK never spreads itself, runs hidden, or collects data without consent.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src *;">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ARK Crisis Suite — Offline Emergency Tool</title>
<meta name="description" content="ARK — offline-first emergency communication suite. Works when the internet is gone. Offline AI, maps, Morse code, mesh messaging — one file.">
<!-- Open Graph / social sharing -->
<meta property="og:type" content="website">
<meta property="og:title" content="ARK Crisis Suite — Offline Emergency Tool">
<meta property="og:description" content="No internet? Your phones can still connect, share the app, use offline AI, pull up cached maps, and communicate in Morse code. One self-contained file. Zero accounts. Works anywhere.">
<meta property="og:site_name" content="ARK by HaloSuite">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="ARK Crisis Suite">
<meta name="twitter:description" content="Offline emergency preparedness in a single HTML file — AI, maps, radio reference, mesh messaging, Morse code. No internet required after first load.">
<meta name="application-name" content="ARK Crisis Suite">
<meta name="theme-color" content="#dcbf78">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='32' fill='%23f0ebe0'/%3E%3Cpath d='M96 24 L152 54 L152 102 C152 132 128 158 96 168 C64 158 40 132 40 102 L40 54 Z' fill='%238b6f3e'/%3E%3Ctext x='96' y='118' text-anchor='middle' font-family='system-ui%2Csans-serif' font-weight='900' font-size='52' fill='%23f0ebe0'%3EARK%3C/text%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="ARK">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">
<style>
/* =====================================================================
   ARK Crisis Suite — Cinematic Design System (matches landing page)
   ===================================================================== */

/* ---------- 1. Tokens & resets ---------- */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--accent) var(--bg-secondary)}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}

:root{
  /* Surfaces — warm cream/stone palette from landing page */
  --bg-primary:#f0ebe0;
  --bg-secondary:#ebe4d6;
  --bg-card:#ffffff;
  --bg-elevated:#f8f4ee;
  --bg-highlight:#f2ecdf;
  /* Borders */
  --border:#e0d8c8;
  --border-strong:#c8bda8;
  /* Text — warm near-black */
  --text-primary:#1a1612;
  --text-secondary:#5a5248;
  --text-muted:#8a7e70;
  /* Accent — warm golden brown (HaloSuite brand, light mode) */
  --accent:#8b6f3e;
  --accent-dark:#7a5f30;
  --accent-soft:#b8955a;
  --accent-glow:rgba(139,111,62,0.12);
  --accent-rgb:139,111,62;
  /* Semantic status */
  --green:#2d7a5f;
  --green-bg:rgba(45,122,95,0.1);
  --yellow:#8b6f20;
  --yellow-bg:rgba(139,111,32,0.1);
  --red:#8b2d35;
  --red-bg:rgba(139,45,53,0.08);
  --blue:#2d4f8b;
  --blue-bg:rgba(45,79,139,0.1);
  --purple:#5a2d8b;
  /* Radius */
  --radius-sm:8px;
  --radius-md:12px;
  --radius-lg:16px;
  --radius-xl:24px;
  /* Shadows — warm light-mode shadows */
  --shadow:0 1px 3px rgba(0,0,0,0.08);
  --shadow-lg:0 8px 32px rgba(0,0,0,0.12);
  --shadow-card:0 1px 0 rgba(255,255,255,.8) inset,0 2px 8px rgba(0,0,0,.06);
  --shadow-glow:0 0 0 2px rgba(139,111,62,.25),0 4px 16px rgba(139,111,62,.2);
  /* Motion */
  --motion:160ms;
  --ease-out:cubic-bezier(.16,1,.3,1);
  /* Font */
  --font:"Inter",system-ui,"Segoe UI",sans-serif;
  --font-serif:"Lora","Georgia",serif;
  --font-mono:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
}

body{font-family:var(--font);font-weight:400;font-size:1rem;line-height:1.65;color:var(--text-primary);background:var(--bg-primary);overflow-x:hidden;min-height:100vh;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
button{cursor:pointer;font:inherit;border:none;background:none;-webkit-tap-highlight-color:rgba(139,111,62,0.1);touch-action:manipulation}
[role="button"],a{-webkit-tap-highlight-color:rgba(139,111,62,0.1)}
input,select,textarea{font:inherit;color:inherit;max-width:100%}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline;color:var(--accent-dark)}
ul{list-style:none}
img,svg,video,canvas{display:block;max-width:100%}
::selection{background:var(--accent);color:#fff}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}

/* ---------- 2. Typography scale ---------- */
h1,h2,h3,h4{color:var(--text-primary);line-height:1.1;text-wrap:balance}
h1{font-size:clamp(1.8rem,5vw,3rem);font-weight:800;letter-spacing:-0.03em}
h2{font-size:clamp(1.4rem,3vw,2rem);font-weight:700;letter-spacing:-0.02em}
h3{font-size:1.1rem;font-weight:700;letter-spacing:-0.01em;line-height:1.25}
h4{font-size:.95rem;font-weight:600;letter-spacing:-0.005em}
p{text-wrap:pretty}
.serif{font-family:var(--font-serif)}
.text-serif-accent{font-family:var(--font-serif);font-style:italic;color:var(--accent)}

/* Eyebrow label — matches warm landing page */
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px}
.eyebrow::before{content:"";width:20px;height:1px;background:var(--border-strong);flex-shrink:0}

/* ---------- 3. Keyframes ---------- */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(139,111,62,0)}50%{box-shadow:0 0 16px 4px rgba(139,111,62,.18)}}
@keyframes signal-ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.5);opacity:0}}
@keyframes cpr-beat{0%,100%{transform:scale(1)}30%{transform:scale(1.35)}60%{transform:scale(0.88)}}
@keyframes morse-pulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes check-pop{0%{transform:scale(1)}40%{transform:scale(1.35)}70%{transform:scale(0.9)}100%{transform:scale(1)}}

.anim-fade-up{animation:fadeUp .7s var(--ease-out) both}
.anim-fade-in{animation:fadeIn 1s ease both}

/* Signal dot */
.signal-dot{position:relative;display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.signal-dot::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--accent);animation:signal-ping 1.8s var(--ease-out) infinite}
.signal-dot.is-green{background:var(--green)}.signal-dot.is-green::after{border-color:var(--green)}
.signal-dot.is-red{background:var(--red)}.signal-dot.is-red::after{border-color:var(--red)}

/* === LOW-POWER MODE === */
.low-power *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
.low-power .cpr-pulse{animation:none!important}

/* === DARK MODE === */
.dark-mode{
  --bg-primary:#1a1612;
  --bg-secondary:#231e18;
  --bg-card:#2a241c;
  --bg-elevated:#322b22;
  --bg-highlight:#3a3028;
  --border:#3d3528;
  --border-strong:#4f4538;
  --text-primary:#f0ebe0;
  --text-secondary:#b8a890;
  --text-muted:#7a6e60;
  --shadow:0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg:0 8px 32px rgba(0,0,0,0.5);
  --shadow-card:0 1px 0 rgba(255,255,255,.04) inset,0 2px 8px rgba(0,0,0,.24);
}
.dark-mode body{background:var(--bg-primary);color:var(--text-primary)}
.dark-mode #status-bar{background:rgba(26,22,18,.95)}
.dark-mode #nav{background:rgba(26,22,18,.98);border-top-color:#3d3528}

/* === STATUS BAR — warm light === */
#status-bar{
  background:rgba(240,235,224,.95);
  -webkit-backdrop-filter:blur(20px) saturate(140%);
  backdrop-filter:blur(20px) saturate(140%);
  border-bottom:1px solid var(--border);
  padding:6px 12px;
  display:flex;
  align-items:center;
  gap:12px;
  font-size:12px;
  color:var(--text-muted);
  flex-wrap:wrap;
  position:sticky;
  top:0;
  z-index:100;
  padding-top:calc(6px + env(safe-area-inset-top, 0px));
  padding-left:max(12px, env(safe-area-inset-left, 0px));
  padding-right:max(12px, env(safe-area-inset-right, 0px));
  transition:background .3s ease;
}
.status-item{display:flex;align-items:center;gap:4px}
.status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.dot-green{background:var(--green)}
.dot-yellow{background:var(--yellow)}
.dot-red{background:var(--red)}
.dot-grey{background:var(--text-muted)}
/* 4-state connection pill */
.conn-pill{display:inline-flex;align-items:center;gap:4px;padding:1px 7px 1px 5px;border-radius:10px;font-size:11px;font-weight:600;letter-spacing:.03em;transition:background .3s,color .3s}
.conn-pill::before{content:'';width:6px;height:6px;border-radius:50%;flex-shrink:0;transition:background .3s}
.conn-offline{background:rgba(0,0,0,.05);color:var(--text-muted)}.conn-offline::before{background:var(--text-muted)}
.conn-syncing{background:var(--yellow-bg);color:var(--yellow)}.conn-syncing::before{background:var(--yellow)}
.conn-local{background:rgba(122,212,177,.13);color:var(--green)}.conn-local::before{background:var(--green)}
.conn-regional{background:var(--accent-glow);color:var(--accent)}.conn-regional::before{background:var(--accent)}
.conn-extended{background:rgba(156,172,255,.12);color:var(--blue)}.conn-extended::before{background:var(--blue)}
.conn-global{background:rgba(200,170,255,.13);color:var(--purple)}.conn-global::before{background:var(--purple)}
.conn-error{background:var(--red-bg);color:var(--red)}.conn-error::before{background:var(--red)}
#status-bar .ark-brand{font-weight:900;color:var(--accent);font-size:14px;margin-right:4px;letter-spacing:-0.03em}

/* === NAV — warm light tabs === */
#nav{
  background:rgba(240,235,224,.95);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  backdrop-filter:blur(16px) saturate(140%);
  border-bottom:1px solid var(--border);
  display:flex;
  overflow-x:auto;
  scrollbar-width:none;
  -webkit-overflow-scrolling:touch;
  position:sticky;
  top:calc(33px + env(safe-area-inset-top, 0px));
  z-index:99;
  padding-left:env(safe-area-inset-left, 0px);
  padding-right:env(safe-area-inset-right, 0px);
}
#nav::-webkit-scrollbar{display:none}
.nav-btn{font-family:var(--font);
  padding:10px 14px;
  font-size:13px;
  font-weight:500;
  color:var(--text-secondary);
  border-bottom:2px solid transparent;
  white-space:nowrap;
  transition:color .2s var(--ease-out),border-color .2s ease,background .2s ease;
  flex-shrink:0;
  min-height:44px;min-width:44px;
  display:inline-flex;align-items:center;justify-content:center;
  letter-spacing:-0.01em;
}
.nav-btn:active{background:rgba(0,0,0,.04);color:var(--text-primary)}
.nav-btn:hover{color:var(--text-primary);background:rgba(0,0,0,.04)}
.nav-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
.nav-icon{margin-right:5px;font-size:14px}

/* === MAIN LAYOUT === */
body::before{content:none}
#app{max-width:900px;margin:0 auto;padding:16px max(12px, env(safe-area-inset-right, 0px)) calc(80px + env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))}
.tab-panel{display:none;min-width:0;overflow-wrap:break-word}
.tab-panel.active{display:block}

/* === CARDS — cinematic shadow + hover lift === */
.card{
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:var(--radius-lg);
  padding:16px;
  margin-bottom:12px;
  box-shadow:var(--shadow-card);
  transition:border-color .25s ease,transform .25s var(--ease-out),background-color .25s ease;
}
.card:hover{border-color:var(--border-strong);background:var(--bg-highlight)}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-title{font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:-0.02em}
.card-icon{font-size:18px}

/* === BUTTONS — landing page style === */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:10px 18px;border-radius:var(--radius-md);font-size:.9rem;font-weight:600;
  letter-spacing:-0.01em;
  min-height:44px;min-width:44px;
  transition:background .2s ease,color .2s ease,border-color .2s ease,box-shadow .2s ease,transform .15s ease;
  cursor:pointer;
}
.btn:active{transform:scale(0.97)}
.btn-primary{background:var(--accent);color:#fff;font-weight:700;box-shadow:var(--shadow-glow)}
.btn-primary:hover{background:var(--accent-dark)}
.btn-secondary{background:var(--bg-elevated);border:1px solid var(--border-strong);color:var(--text-primary)}
.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
.btn-green{background:var(--green);color:#fff;font-weight:700}
.btn-red{background:var(--red);color:#fff;font-weight:700}
.btn-sm{padding:6px 12px;font-size:13px;min-height:44px;min-width:44px}
.btn-block{width:100%;display:flex}
.btn-ghost{background:transparent;border:1px solid var(--border-strong);color:var(--text-secondary)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}

/* === FORMS — cinematic inputs === */
.form-group{margin-bottom:12px}
label.form-label{display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:5px;letter-spacing:.04em;text-transform:uppercase;font-family:var(--font-mono)}
.form-input{
  width:100%;max-width:100%;padding:10px 13px;
  background:var(--bg-elevated);
  border:1px solid var(--border);border-radius:var(--radius-md);
  color:var(--text-primary);font-size:14px;
  transition:border-color .2s ease,box-shadow .2s ease;
}
.form-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
textarea.form-input{min-height:80px;resize:vertical}
select.form-input{cursor:pointer}

/* === BADGES === */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.badge-green{background:var(--green-bg);color:var(--green)}
.badge-yellow{background:var(--yellow-bg);color:var(--yellow)}
.badge-red{background:var(--red-bg);color:var(--red)}
.badge-blue{background:var(--blue-bg);color:var(--blue)}
.badge-orange{background:var(--accent-glow);color:var(--accent)}

/* === ALERT LEVELS === */
.alert-banner{
  border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:16px;
  display:flex;align-items:center;gap:14px;
  border:2px solid;
}
.alert-1{background:var(--green-bg);border-color:var(--green);color:var(--green)}
.alert-2{background:var(--blue-bg);border-color:var(--blue);color:var(--blue)}
.alert-3{background:var(--yellow-bg);border-color:var(--yellow);color:var(--yellow)}
.alert-4{background:rgba(248,81,73,0.1);border-color:#f85149;color:#f85149}
.alert-5{background:rgba(188,61,52,0.15);border-color:#bc3d34;color:#ff6b6b}
.alert-level-num{font-size:36px;font-weight:800;line-height:1}
.alert-info{flex:1}
.alert-info h3{font-size:17px;font-weight:700;margin-bottom:2px}
.alert-info p{font-size:13px;opacity:.9}

/* === GRID LAYOUTS === */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media(max-width:600px){.grid-3,.grid-4{grid-template-columns:1fr 1fr}.grid-4-force{grid-template-columns:repeat(4,1fr)}}
@media(max-width:420px){.grid-2{grid-template-columns:1fr}}

/* === QUICK ACTION BUTTONS — cinematic === */
.quick-action{
  background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:14px 10px;text-align:center;cursor:pointer;
  box-shadow:var(--shadow-card);
  transition:border-color .25s var(--ease-out),background .25s ease,transform .2s var(--ease-out),box-shadow .25s ease;
  display:flex;flex-direction:column;align-items:center;gap:6px;
  font-family:var(--font);font-size:inherit;line-height:inherit;
  min-width:0;width:100%;
}
.quick-action:hover,.quick-action:focus-visible{
  border-color:var(--accent);background:var(--accent-glow);
  transform:translateY(-2px);
  box-shadow:var(--shadow-glow);
  outline:2px solid var(--accent);outline-offset:2px;
}
.quick-action:active{transform:scale(0.96)}
.quick-action .qa-icon{font-size:24px}
.quick-action .qa-label{font-size:12px;font-weight:700;color:var(--text-secondary);letter-spacing:-0.01em}
.quick-action.urgent{border-color:var(--red);background:var(--red-bg)}
.quick-action.urgent .qa-label{color:var(--red)}

/* === HOME HERO === */
.home-hero{
  background:linear-gradient(135deg,var(--bg-elevated) 0%,var(--bg-card) 60%, rgba(139,111,62,.04) 100%);
  border:1px solid var(--border);
  border-radius:var(--radius-xl);
  padding:28px 22px 22px;
  margin-bottom:14px;
  display:flex;align-items:center;gap:18px;
  position:relative;overflow:hidden;
  box-shadow:0 0 0 1px rgba(255,255,255,.8) inset, 0 4px 20px rgba(139,111,62,.08);
}
.home-hero::before{
  content:'';position:absolute;top:0;right:0;
  width:160px;height:160px;
  background:radial-gradient(circle at 100% 0%,rgba(139,111,62,.15),transparent 70%);
  pointer-events:none;
}
.home-hero::after{
  content:'';position:absolute;bottom:0;left:0;
  width:100px;height:100px;
  background:radial-gradient(circle at 0% 100%,rgba(139,111,62,.06),transparent 70%);
  pointer-events:none;
}
.hero-mascot{font-size:56px;line-height:1;flex-shrink:0;filter:drop-shadow(0 6px 12px rgba(139,111,62,.25));z-index:1}
.hero-content{flex:1;min-width:0;z-index:1}
.hero-eyebrow{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);opacity:.8;margin-bottom:4px;font-family:var(--font)}
.hero-title{font-size:1.45rem;font-weight:900;color:var(--text-primary);letter-spacing:-0.04em;line-height:1.05;margin-bottom:5px}
.hero-title span{color:var(--accent);font-family:var(--font-serif);font-style:italic}
.hero-sub{font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:13px}
.hero-badges{display:flex;gap:6px;flex-wrap:wrap}
.hero-badge{font-size:11px;font-weight:600;padding:4px 11px;border-radius:20px;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border);letter-spacing:.01em}
.hero-badge.active{background:rgba(0,200,120,.12);color:#00a86b;border-color:rgba(0,200,120,.3)}
.hero-badge.hub-active{background:rgba(139,111,62,.13);color:var(--accent);border-color:rgba(139,111,62,.35)}

/* === ONE-TAP HUB CARD === */
.hub-deploy-card{
  background:linear-gradient(135deg,rgba(139,111,62,.07) 0%,var(--bg-card) 100%);
  border:1.5px solid rgba(139,111,62,.25);
  border-radius:var(--radius-xl);
  padding:20px;
  margin-bottom:12px;
  box-shadow:0 2px 16px rgba(139,111,62,.1),0 0 0 1px rgba(255,255,255,.8) inset;
  position:relative;overflow:hidden;
}
.hub-deploy-card::before{
  content:'';position:absolute;top:0;right:0;width:120px;height:120px;
  background:radial-gradient(circle at 100% 0%,rgba(139,111,62,.12),transparent 70%);
  pointer-events:none;
}
.hub-deploy-card.hub-is-active{
  background:linear-gradient(135deg,rgba(139,111,62,.13) 0%,var(--bg-card) 100%);
  border-color:var(--accent);
  box-shadow:0 2px 20px rgba(139,111,62,.18),0 0 0 1px rgba(255,255,255,.8) inset;
}
.hub-deploy-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);opacity:.8;margin-bottom:6px}
.hub-deploy-title{font-size:1.1rem;font-weight:800;letter-spacing:-0.03em;color:var(--text-primary);margin-bottom:4px}
.hub-deploy-sub{font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px}
.hub-ip-display{
  font-family:var(--font-mono);font-size:1.3rem;font-weight:700;
  color:var(--accent);letter-spacing:.04em;
  background:rgba(139,111,62,.08);border:1px solid rgba(139,111,62,.2);
  border-radius:var(--radius-md);padding:10px 16px;
  margin:12px 0;display:block;
  word-break:break-all;overflow-wrap:break-word;max-width:100%;
}
.hub-active-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}
.hub-active-dot{width:10px;height:10px;border-radius:50%;background:var(--green);box-shadow:0 0 8px rgba(0,200,120,.5);flex-shrink:0;animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1;box-shadow:0 0 8px rgba(0,200,120,.5)}50%{opacity:.7;box-shadow:0 0 16px rgba(0,200,120,.8)}}
@keyframes slideUpBanner{from{opacity:0;transform:translateX(-50%) translateY(28px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* === BOTTOM TAB BAR === */
#bottom-tab-bar{
  position:fixed;
  bottom:max(16px, env(safe-area-inset-bottom, 16px));
  left:50%;transform:translateX(-50%);
  background:#1a1a1a;
  border-radius:28px;
  padding:8px 6px;
  display:flex;gap:2px;
  z-index:200;
  box-shadow:0 4px 24px rgba(0,0,0,.35),0 1px 4px rgba(0,0,0,.2);
  min-width:280px;
}
.btb-btn{
  display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:8px 14px;border-radius:22px;
  color:rgba(255,255,255,.45);
  font-size:10px;font-weight:600;letter-spacing:.01em;
  transition:background .2s var(--ease-out),color .2s ease;
  cursor:pointer;min-width:52px;
  font-family:var(--font);line-height:inherit;
  position:relative;
}
.btb-btn:active{transform:scale(0.94)}
.btb-btn .btb-icon{font-size:18px;line-height:1}
.btb-btn.active{background:rgba(255,255,255,.12);color:#fff}
.btb-btn .btb-badge{
  position:absolute;top:4px;right:8px;
  width:8px;height:8px;border-radius:50%;
  background:var(--red);border:1.5px solid #1a1a1a;
  display:none;
}
.btb-btn.has-badge .btb-badge{display:block}

/* === RESOURCE METERS === */
.resource-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
.resource-row:last-child{border-bottom:none}
.resource-label{font-size:14px;font-weight:500;min-width:100px}
.resource-bar-wrap{flex:1;height:8px;background:var(--bg-elevated);border-radius:4px;overflow:hidden}
.resource-bar{height:100%;border-radius:4px;transition:width .4s}
.bar-green{background:var(--green)}
.bar-yellow{background:var(--yellow)}
.bar-red{background:var(--red)}
.resource-val{font-size:13px;color:var(--text-secondary);min-width:80px;text-align:right}
.resource-days{font-size:11px;opacity:.7}
.alert-warn{font-size:13px;font-weight:500}

/* === MESSAGES === */
.msg-item{padding:12px 0;border-bottom:1px solid var(--border)}
.msg-item:last-child{border-bottom:none}
.msg-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
.msg-alias{font-weight:600;font-size:14px}
.msg-time{font-size:12px;color:var(--text-muted)}
.msg-body{font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.msg-urgent{border-left:3px solid var(--red);padding-left:10px}
.channel-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.ch-tab{padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);transition:background .2s ease,border-color .2s ease,color .2s ease,box-shadow .2s ease;font-family:var(--font);line-height:inherit;letter-spacing:-0.01em}
.ch-tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ch-tab:hover{border-color:var(--accent);color:var(--accent)}
.ch-tab.active{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(139,111,62,.25)}
.offline-queue-badge{background:var(--yellow-bg);color:var(--yellow);border:1px solid var(--yellow);border-radius:20px;padding:2px 8px;font-size:11px;font-weight:600}

/* === GUIDE ARTICLES === */
.guide-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:4px}
.guide-cat-btn{padding:6px 14px;border-radius:20px;font-size:13px;cursor:pointer;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);transition:background .2s ease,border-color .2s ease,color .2s ease,box-shadow .2s ease;letter-spacing:-0.01em;font-weight:500}
.guide-cat-btn:hover{border-color:var(--accent);color:var(--accent)}
.guide-cat-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(139,111,62,.25)}
.guide-article{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;margin-bottom:10px}
.guide-title{font-size:16px;font-weight:700;margin-bottom:4px}
.guide-summary{font-size:13px;color:var(--text-secondary);margin-bottom:4px;font-style:italic}
.guide-steps{margin:10px 0 10px 0;list-style:none}
.guide-steps li{padding:4px 0;padding-left:24px;position:relative;font-size:14px;line-height:1.6}
.guide-steps li::before{content:counter(step);counter-increment:step;position:absolute;left:0;top:5px;width:16px;height:16px;border-radius:50%;background:var(--accent);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
.guide-steps{counter-reset:step;padding-left:0}
.guide-section h4{font-size:14px;font-weight:600;margin:12px 0 6px;color:var(--accent)}
.guide-section p{font-size:14px;line-height:1.6;margin-bottom:8px;color:var(--text-secondary)}
.guide-sources{font-size:11px;color:var(--text-muted);margin-top:12px;padding-top:10px;border-top:1px solid var(--border)}
.guide-toggle{cursor:pointer;user-select:none;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.guide-toggle-chevron{flex-shrink:0;font-size:14px;color:var(--text-muted);transition:transform .2s ease;margin-top:2px}
.guide-body{display:none}
.guide-body.open{display:block}
.guide-article:has(.guide-body.open) .guide-toggle-chevron{transform:rotate(180deg)}
.guide-offline-badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:rgba(0,200,120,.15);color:#00c878;border:1px solid rgba(0,200,120,.3);margin-left:8px;vertical-align:middle}
.guide-meta-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.guide-updated{font-size:11px;color:var(--text-muted)}
.guide-actions{display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)}
.guide-actions button{font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-secondary);cursor:pointer;transition:all .15s}
.guide-actions button:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.guide-actions button.bookmarked{background:rgba(255,200,0,.15);border-color:rgba(255,200,0,.4);color:#ffc800}
.guide-seealso{font-size:12px;color:var(--text-muted);margin-top:8px}
.guide-seealso a{color:var(--accent);text-decoration:none}
.guide-seealso a:hover{text-decoration:underline}
.guide-count-badge{font-size:12px;color:var(--text-muted);font-weight:normal;margin-left:8px}
.guide-search-highlight{background:rgba(139,111,62,.25);border-radius:2px;padding:0 1px}
.guide-toggle:hover .guide-title{color:var(--accent)}

/* === MEDICAL === */
.vital-table{width:100%;border-collapse:collapse;font-size:13px}
.vital-table th{background:var(--bg-elevated);padding:8px;text-align:left;border-bottom:1px solid var(--border);font-size:12px;color:var(--text-secondary)}
.vital-table td{padding:8px;border-bottom:1px solid var(--border)}
.vital-table tr:last-child td{border-bottom:none}

/* === CPR ANIMATION === */
.cpr-box{text-align:center;padding:24px 20px;background:var(--red-bg);border:2px solid var(--red);border-radius:var(--radius-lg);transition:box-shadow 0.3s}
.cpr-pulse{width:90px;height:90px;border-radius:50%;background:var(--red);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;animation:cpr-beat 0.6s ease-in-out infinite}
.cpr-paused .cpr-pulse{animation-play-state:paused;opacity:0.5}
.cpr-active{box-shadow:0 0 0 4px rgba(139,45,53,0.3),0 0 24px rgba(139,45,53,0.12)}
.cpr-counter{font-size:clamp(52px, 18vw, 80px);font-weight:900;color:var(--red);line-height:1}

/* === MAP === */
#map-canvas{background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);position:relative;overflow:hidden;cursor:grab}
.map-pin{position:absolute;transform:translate(-50%,-100%);font-size:20px;cursor:pointer;z-index:10;transition:transform .1s}
.map-pin:hover{transform:translate(-50%,-100%) scale(1.3)}
.map-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.map-btn{padding:6px 12px;font-size:12px;border-radius:var(--radius-sm);background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:all .15s}
.map-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}

/* === RADIO === */
.freq-table{width:100%;border-collapse:collapse;font-size:13px}
.freq-table th{background:var(--bg-elevated);padding:8px 10px;text-align:left;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border)}
.freq-table td{padding:8px 10px;border-bottom:1px solid var(--border)}
.freq-table tr:hover td{background:var(--bg-elevated)}
.morse-chart{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;font-size:13px}
.morse-item{background:var(--bg-elevated);padding:6px 8px;border-radius:var(--radius-sm);display:flex;gap:6px;align-items:center}
.morse-char{font-weight:700;font-size:15px;min-width:16px}
.morse-code{color:var(--accent);font-family:monospace;font-size:12px}
.phonetic-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.phonetic-item{background:var(--bg-elevated);padding:8px;border-radius:var(--radius-sm)}
.phonetic-letter{font-size:20px;font-weight:800;color:var(--accent)}
.phonetic-word{font-size:12px;color:var(--text-secondary)}
.freq-copyable{cursor:pointer;user-select:none}
.freq-copyable:active{opacity:.7}
.freq-copyable .copy-hint{opacity:0;font-size:10px;margin-left:4px;transition:opacity .15s;color:var(--text-secondary)}
.freq-copyable:hover .copy-hint{opacity:1}
.morse-playing{animation:morse-pulse 0.6s ease-in-out infinite}
#morse-status{display:none;font-size:11px;color:var(--accent);font-weight:600;margin-left:6px;align-self:center}

/* === SETTINGS === */
.setting-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)}
.setting-row:last-child{border-bottom:none}
.setting-label{font-size:14px;font-weight:500}
.setting-desc{font-size:12px;color:var(--text-secondary);margin-top:2px}
.toggle{position:relative;display:inline-block;width:44px;height:24px}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;inset:0;background:var(--bg-elevated);border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:.2s}
.toggle-slider::before{content:"";position:absolute;width:18px;height:18px;left:2px;top:2px;background:var(--text-muted);border-radius:50%;transition:.2s}
.toggle input:checked+.toggle-slider{background:var(--accent);border-color:var(--accent)}
.toggle input:checked+.toggle-slider::before{transform:translateX(20px);background:#fff}

/* === NETWORK === */
.peer-item{display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:6px}
.peer-signal{font-size:13px;font-family:monospace}
.qr-box{background:#fff;padding:12px;border-radius:var(--radius-md);display:inline-block;line-height:0}

/* === HOUSEHOLD === */
.member-item{display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:6px}
.member-avatar{width:36px;height:36px;border-radius:50%;background:var(--bg-card);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.member-role{font-size:11px;color:var(--accent);font-weight:600}

/* === CHECKLIST === */
.checklist-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;border-radius:6px;transition:background .12s}
.checklist-item:last-child{border-bottom:none}
.checklist-item:hover{background:var(--bg-elevated)}
.check-box{width:20px;height:20px;min-width:20px;border-radius:4px;border:2px solid var(--border);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s,transform .15s;background:var(--bg-elevated);margin-top:2px}
.check-box.checked{background:var(--green);border-color:var(--green);color:#fff;font-size:12px}
.check-box.pop{animation:check-pop .25s ease}
.check-label{font-size:14px;flex:1;line-height:1.3}
.check-label.checked-text{text-decoration:line-through;color:var(--text-muted)}
.check-desc{font-size:11px;color:var(--text-muted);margin-top:2px;line-height:1.4}
.check-label-wrap{flex:1;display:flex;flex-direction:column}
.checklist-date{font-size:11px;color:var(--text-muted);font-weight:400;margin-left:auto;padding-left:8px;white-space:nowrap}
.checklist-allclear{background:rgba(72,187,120,0.12);border:1px solid rgba(72,187,120,0.35);border-radius:8px;padding:10px 14px;margin-top:10px;text-align:center;color:var(--green);font-size:13px;font-weight:600;animation:ob-fadein .3s ease}

/* === SECTION HEADERS — cinematic === */
.section-title{
  font-size:1.1rem;font-weight:800;margin-bottom:14px;
  display:flex;align-items:center;gap:10px;
  letter-spacing:-0.025em;color:var(--text-primary);
  line-height:1.15;
}
.section-title .title-icon{font-size:20px}

/* === TOAST === */
#toast{
  position:fixed;bottom:calc(80px + env(safe-area-inset-bottom, 0px));left:50%;transform:translateX(-50%) translateY(100px);
  background:var(--text-primary);
  color:var(--bg-primary);
  border:1px solid rgba(0,0,0,.12);border-radius:var(--radius-lg);
  padding:12px 20px;font-size:14px;z-index:1000;
  transition:transform .3s var(--ease-out);box-shadow:var(--shadow-lg);
  pointer-events:none;white-space:nowrap;letter-spacing:-0.01em;
}
#toast.show{transform:translateX(-50%) translateY(0)}
#toast.toast-success{background:var(--green);color:#fff;border-color:var(--green)}
#toast.toast-error{background:var(--red);color:#fff;border-color:var(--red)}
#toast.toast-info{background:var(--blue);color:#fff;border-color:var(--blue)}
#toast.toast-warning{background:var(--yellow);color:#fff;border-color:var(--yellow)}
.btn.is-loading{cursor:progress;opacity:.7}

/* === SMALL-SCREEN HARDENING === */
@media (max-width:480px){
  /* Single-line status bar: #nav sticks at top:33px, so a wrapping status bar would slide under it */
  #status-bar{flex-wrap:nowrap;overflow:hidden;gap:8px;white-space:nowrap}
  #status-bar .status-item{flex-shrink:0}
  #offline-indicator{flex-shrink:1!important;min-width:0;overflow:hidden;text-overflow:ellipsis}
  /* 16px stops iOS auto-zooming the page when an input is focused */
  .form-input{font-size:16px}
  textarea.form-input{max-height:40vh}
  #toast{white-space:normal;max-width:calc(100vw - 24px);text-align:center}
  /* Guide search: full width on mobile */
  #guide-search{width:100%!important}
  #tab-survival .flex-between{flex-direction:column;align-items:stretch}
  #tab-survival .flex-between .flex{width:100%}
  #tab-survival .flex-between .flex #guide-search{flex:1}
  .guide-steps li{padding-left:22px}
}
@media (max-width:360px){
  .nav-btn{font-size:9px;padding:6px 2px}
  .nav-icon{margin-right:3px;font-size:12px}
  .section-title{font-size:16px}
  #status-bar{gap:6px;font-size:11px}
  #status-bar .ark-brand{font-size:13px}
  #gps-status{display:none}
  .card{padding:12px}
  .freq-table th,.freq-table td,.vital-table th,.vital-table td{padding:6px}
  /* 4-column radio tables hold unbreakable frequency ranges: scroll inside the table, not the page */
  .freq-table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;font-size:12px}
  /* Morse header: title + 150px input + 2 buttons cannot fit one row */
  .card-header:has(#morse-input){flex-wrap:wrap;gap:8px}
  .card-header:has(#morse-input)>.flex{flex:1 1 100%;min-width:0}
  #morse-input{width:auto!important;flex:1;min-width:0}
}

/* === PRINT STYLES === */
@media print{
  #status-bar,#nav,#toast,#bottom-tab-bar{display:none!important}
  body{background:#fff;color:#000}
  .card,.guide-article{background:#fff;border:1px solid #ccc;page-break-inside:avoid}
  .guide-body{display:block!important}
  .btn{display:none}
  .tab-panel{display:block!important}
  .tab-panel:not(.print-target){display:none!important}
}

/* === SCROLLBAR === */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:var(--bg-secondary)}
::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--accent)}

/* === AI CHAT === */
.ai-msg{padding:8px 12px;border-radius:var(--radius-md);font-size:13px;line-height:1.5;max-width:88%;word-break:break-word;position:relative}
.ai-msg-sys{background:var(--bg-elevated);color:var(--text-secondary);font-style:italic;align-self:center;text-align:center;max-width:100%;border-radius:var(--radius-sm)}
.ai-msg-user{background:var(--accent);color:#fff;align-self:flex-end;font-weight:500}
.ai-msg-ai{background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);align-self:flex-start}
.ai-msg-ai.thinking{opacity:0.6;font-style:italic}
@keyframes halo-thinking{0%,100%{opacity:0.4}50%{opacity:1}}
.ai-msg-ai.thinking::after{content:'●●●';display:inline-block;margin-left:6px;animation:halo-thinking 1.2s ease-in-out infinite;letter-spacing:3px;font-style:normal}
.ai-msg-ai .ai-copy-btn{position:absolute;top:4px;right:4px;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-secondary);font-size:10px;padding:2px 6px;border-radius:4px;cursor:pointer;opacity:0;transition:opacity 0.15s}
.ai-msg-ai:hover .ai-copy-btn{opacity:1}
.ai-ctx-badges{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.ai-ctx-badge{font-size:10px;padding:2px 7px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-secondary)}
.ai-ctx-badge.active{background:rgba(var(--accent-rgb,139,111,62),0.15);border-color:var(--accent);color:var(--accent)}
.ai-msg-ai ul,.ai-msg-ai ol{margin:4px 0 4px 18px;padding:0}
.ai-msg-ai li{margin:2px 0}
.ai-msg-ai strong{font-weight:700;color:var(--text-primary)}
.ai-msg-ai p{margin:4px 0}
.ai-mode-pill{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}
.ai-msg-ts{font-size:10px;color:var(--text-secondary);opacity:0.65;margin-top:4px;display:block}
.ai-msg-ts-user{text-align:right;color:rgba(255,255,255,0.75)}
.badge-muted{background:var(--bg-elevated);color:var(--text-muted);font-size:11px;padding:2px 8px;border-radius:10px}
.badge-green{background:rgba(72,187,120,0.15);color:var(--green);font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid rgba(72,187,120,0.3)}
.badge-yellow{background:rgba(236,201,75,0.15);color:var(--yellow);font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid rgba(236,201,75,0.3)}
.badge-red{background:rgba(245,101,101,0.15);color:var(--red);font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid rgba(245,101,101,0.3)}

/* === W20 NEW FEATURES === */
/* Message ack styling */
.msg-acked{opacity:0.7}
.msg-actions{display:flex;gap:6px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)}
.btn-xs{padding:2px 8px!important;font-size:11px!important;line-height:1.6!important}
.msg-ack-active{color:var(--green)!important;border-color:var(--green)!important}
.ack-count{display:inline-block;background:var(--accent);color:#fff;border-radius:10px;padding:0 5px;font-size:10px;font-weight:700;margin-left:3px}
/* Heimlich btn */
#heimlich-adult-btn,#heimlich-infant-btn,#heimlich-self-btn{transition:background 0.15s,color 0.15s}

/* === MISC === */
.divider{border:none;border-top:1px solid var(--border);margin:12px 0}
.text-muted{color:var(--text-muted)}
.text-secondary{color:var(--text-secondary)}
.text-green{color:var(--green)}
.text-red{color:var(--red)}
.text-yellow{color:var(--yellow)}
.text-accent{color:var(--accent)}
.mt-8{margin-top:8px}
.mt-12{margin-top:12px}
.mt-16{margin-top:16px}
.mb-8{margin-bottom:8px}
.mb-12{margin-bottom:12px}
.flex{display:flex}
.flex-center{display:flex;align-items:center;justify-content:center}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.gap-8{gap:8px}
.gap-12{gap:12px}
.wrap{flex-wrap:wrap}
.bold{font-weight:700}
.semibold{font-weight:600}
.font-sm{font-size:13px}
.font-xs{font-size:11px}
.w-full{width:100%}
.monospace{font-family:monospace}
.hidden{display:none!important}

/* === WARNING BOX === */
.warn-box{background:var(--red-bg);border:2px solid var(--red);border-radius:var(--radius-md);padding:12px 14px;font-size:14px;color:var(--red);margin-bottom:12px}
.info-box{background:var(--blue-bg);border:1px solid var(--blue);border-radius:var(--radius-md);padding:12px 14px;font-size:13px;color:var(--text-secondary);margin-bottom:12px}

/* === OFFLINE INDICATOR === */
.offline-banner{background:var(--yellow-bg);border:1px solid var(--yellow);border-radius:var(--radius-md);padding:10px 14px;font-size:13px;color:var(--yellow);margin-bottom:12px;display:none}
.offline-banner.show{display:flex;align-items:center;gap:8px}

/* === ONBOARDING WIZARD === */
@keyframes ob-fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
#onboard-overlay{
  position:fixed;inset:0;z-index:9000;
  background:rgba(5,8,15,.95);
  display:flex;align-items:center;justify-content:center;
  padding:16px;
  overflow-y:auto;
  animation:ob-fadein .25s ease both;
}
#onboard-overlay.hidden{display:none!important;animation:none}
.onboard-box{
  background:var(--bg-card);
  border:1px solid var(--border-strong);
  border-radius:16px;
  max-width:580px;width:100%;
  padding:32px;
  position:relative;
  animation:ob-fadein .3s ease .05s both;
}
.onboard-logo{font-size:2.4rem;font-weight:900;color:var(--accent);letter-spacing:-.03em;margin-bottom:4px}
.onboard-tagline{font-size:14px;color:var(--text-secondary);margin-bottom:28px}
.onboard-progress{display:flex;gap:8px;margin-bottom:28px}
.ob-dot{flex:1;height:4px;border-radius:2px;background:var(--bg-elevated);transition:background .2s}
.ob-dot.done{background:var(--accent)}
.ob-dot.active{background:var(--accent);opacity:.6}
.onboard-step{display:none}
.onboard-step.active{display:block}
.onboard-step-icon{font-size:2.5rem;margin-bottom:12px}
.onboard-step h2{font-size:1.3rem;font-weight:700;margin-bottom:8px}
.onboard-step p{font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px}
.onboard-step ul{margin:0 0 16px 0;padding:0;list-style:none}
.onboard-step ul li{font-size:14px;color:var(--text-secondary);padding:5px 0 5px 20px;position:relative;line-height:1.4}
.onboard-step ul li::before{content:'✓';position:absolute;left:0;color:var(--green);font-weight:700}
.onboard-actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.onboard-step .form-group{margin-bottom:14px}
.onboard-nav{display:flex;align-items:center;justify-content:space-between;margin-top:24px;gap:10px}
.onboard-step-label{font-size:12px;color:var(--text-muted)}
.ob-warn{background:var(--red-bg);border:1px solid var(--red);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--red);margin:12px 0}
.ob-info{background:var(--blue-bg);border:1px solid rgba(88,166,255,.3);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--text-secondary);margin:12px 0}
.ob-success{background:var(--green-bg);border:1px solid var(--green);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--green);margin:12px 0}

/* === GENERAL MODAL === */
#ark-modal{position:fixed;inset:0;z-index:9000;background:rgba(5,8,15,.85);display:flex;align-items:center;justify-content:center;padding:16px}
#ark-modal.hidden{display:none!important}
#ark-modal-box{background:var(--bg-card);border:1px solid var(--border-strong);border-radius:14px;max-width:420px;width:100%;padding:24px;max-height:85vh;overflow-y:auto}

/* === SHARE MODAL === */
#share-modal{
  position:fixed;inset:0;z-index:8000;
  background:rgba(5,8,15,.85);
  display:flex;align-items:center;justify-content:center;
  padding:16px;
}
#share-modal.hidden{display:none!important}
.share-box{
  background:var(--bg-card);border:1px solid var(--border-strong);
  border-radius:14px;max-width:520px;width:100%;padding:24px;
  max-height:90vh;overflow-y:auto;
}
.share-method{background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:10px;cursor:pointer;transition:border-color .15s}
.share-method:hover{border-color:var(--accent)}
.share-method-icon{font-size:1.5rem;margin-bottom:6px}
.share-method h4{font-size:14px;font-weight:700;margin-bottom:4px}
.share-method p{font-size:12px;color:var(--text-secondary);line-height:1.4}
.share-code{background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:12px;font-family:monospace;font-size:12px;word-break:break-all;color:var(--text-secondary);margin:10px 0;cursor:text;user-select:all}
.share-steps{margin:8px 0;padding-left:0;list-style:none;counter-reset:share-step}
.share-steps li{padding:6px 0 6px 28px;position:relative;font-size:13px;color:var(--text-secondary);counter-increment:share-step}
.share-steps li::before{content:counter(share-step);position:absolute;left:0;top:6px;width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:20px;text-align:center}
</style>
</head>
<body>

<!-- ===== ONBOARDING WIZARD OVERLAY ===== -->
<div id="onboard-overlay" class="hidden">
  <div class="onboard-box">
    <div class="onboard-logo">▲ ARK</div>
    <div class="onboard-tagline">Crisis Communications Suite — Setup Wizard</div>
    <div class="onboard-progress">
      <div class="ob-dot" id="ob-d1"></div>
      <div class="ob-dot" id="ob-d2"></div>
      <div class="ob-dot" id="ob-d3"></div>
      <div class="ob-dot" id="ob-d4"></div>
      <div class="ob-dot" id="ob-d5"></div>
    </div>

    <!-- Step 1: Welcome -->
    <div class="onboard-step active" id="ob-step-1">
      <div class="onboard-step-icon">🛡️</div>
      <h2>Welcome to ARK Crisis Suite</h2>
      <p>ARK is a fully <strong>offline-capable</strong> emergency communication and coordination tool. It works without internet, can run from a USB drive, and you can share it instantly with anyone who needs it.</p>
      <ul>
        <li>Works 100% offline — no servers, no accounts required</li>
        <li>Send this file via text, email, AirDrop, or USB to your neighbors</li>
        <li>Coordinate with your neighborhood hub when in range</li>
        <li>Manage medical triage, resources, and household status</li>
      </ul>
      <div class="ob-warn">⚡ This app requires no internet. All data is stored only on your device. Nothing is transmitted to any company or server unless you connect to a local hub.</div>
      <div class="onboard-nav">
        <span class="onboard-step-label">Step 1 of 5</span>
        <button class="btn btn-primary" onclick="Onboarding.next()">Get Started →</button>
      </div>
    </div>

    <!-- Step 2: Identity Setup -->
    <div class="onboard-step" id="ob-step-2">
      <div class="onboard-step-icon">👤</div>
      <h2>Your Identity</h2>
      <p>Set a name so your household appears correctly when coordinating with neighbors and hubs. This stays on your device — it is never sent anywhere automatically.</p>
      <div class="form-group">
        <label class="form-label">Your Name / Household Name <span style="color:var(--red)">*</span></label>
        <input type="text" class="form-input" id="ob-name" placeholder="e.g. Martinez Family, Dr. Chen, Unit 4B" maxlength="60" autocomplete="off" oninput="document.getElementById('ob-name-err').style.display='none';this.style.borderColor=''">
        <div id="ob-name-err" style="display:none;color:var(--red);font-size:12px;margin-top:4px">Please enter a household name to continue.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Your Role (optional)</label>
        <select class="form-input" id="ob-role">
          <option value="">— Select a role if applicable —</option>
          <option value="IC">🔺 Incident Commander</option>
          <option value="MED">🏥 Medical / First Responder</option>
          <option value="LOG">📦 Logistics / Supply</option>
          <option value="OPS">⚙️ Operations</option>
          <option value="PIO">📢 Public Information</option>
          <option value="SEC">🔒 Security / Safety</option>
          <option value="VOL">🤝 Volunteer</option>
          <option value="RES">🏠 Resident</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Address / Location (optional — helps coordinate nearby)</label>
        <input type="text" class="form-input" id="ob-addr" placeholder="e.g. 123 Oak St or Apt 4B — stays on device" maxlength="80" autocomplete="off">
      </div>
      <div class="onboard-nav">
        <button class="btn btn-secondary" onclick="Onboarding.back()">← Back</button>
        <span class="onboard-step-label">Step 2 of 5</span>
        <button class="btn btn-primary" onclick="Onboarding.saveIdentity()">Continue →</button>
      </div>
    </div>

    <!-- Step 3: Hub Connection -->
    <div class="onboard-step" id="ob-step-3">
      <div class="onboard-step-icon">🌐</div>
      <h2>Connect to a Local Hub</h2>
      <p>A <strong>Community Hub</strong> is ARK running on a local computer or Raspberry Pi nearby. When you're in range, your device syncs messages and resource updates automatically.</p>
      <ul>
        <li>Works on any local WiFi — no internet needed</li>
        <li>Your neighborhood coordinator should give you a Hub address</li>
        <li>If you don't have one yet, skip this — you can add it later in Settings</li>
      </ul>
      <div class="form-group">
        <label class="form-label">Hub Address (optional)</label>
        <input type="text" class="form-input" id="ob-hub" maxlength="500" placeholder="e.g. 192.168.1.100:3000 or hub.local:3000" autocomplete="off">
      </div>
      <div class="ob-info">💡 <strong>Setting up a hub?</strong> The ARK Hub software runs on any computer or Raspberry Pi. Download it from the same place you got this file, or ask your neighborhood coordinator.</div>
      <div class="onboard-nav">
        <button class="btn btn-secondary" onclick="Onboarding.back()">← Back</button>
        <span class="onboard-step-label">Step 3 of 5</span>
        <button class="btn btn-primary" onclick="Onboarding.saveHub()">Continue →</button>
      </div>
    </div>

    <!-- Step 4: Share ARK -->
    <div class="onboard-step" id="ob-step-4">
      <div class="onboard-step-icon">📡</div>
      <h2>Share ARK — Build Your Network</h2>
      <p>The more people have ARK, the stronger your community's resilience. <strong>Share this single HTML file</strong> with anyone who may need it — it contains the entire application.</p>
      <ul>
        <li><strong>Text message</strong> — Send the file as an attachment</li>
        <li><strong>AirDrop / Nearby Share</strong> — Works phone-to-phone in seconds</li>
        <li><strong>USB drive</strong> — Copy the file, hand the drive to anyone</li>
        <li><strong>Email</strong> — Attach and send like any document</li>
        <li><strong>QR code</strong> — Generate a code on the Share tab</li>
      </ul>
      <div class="ob-success">✓ The whole app is one file. Sharing it = installing it. Recipients just open it in any browser — no app store, no account, no internet.</div>
      <div class="onboard-actions">
        <button class="btn btn-primary" style="flex:1" onclick="Onboarding.downloadARK()">⬇ Download ARK to Share</button>
      </div>
      <div class="onboard-nav" style="margin-top:16px">
        <button class="btn btn-secondary" onclick="Onboarding.back()">← Back</button>
        <span class="onboard-step-label">Step 4 of 5</span>
        <button class="btn btn-primary" onclick="Onboarding.next()">Continue →</button>
      </div>
    </div>

    <!-- Step 5: Ready -->
    <div class="onboard-step" id="ob-step-5">
      <div class="onboard-step-icon">✅</div>
      <h2>You're Ready</h2>
      <p>ARK is configured and ready for use. Here's a quick guide to the main tabs:</p>
      <ul>
        <li><strong>🏠 Home</strong> — Status overview, quick actions, share ARK</li>
        <li><strong>💬 Messages</strong> — Community messages; sync with hub when in range</li>
        <li><strong>🌿 Survival</strong> — Water, food, shelter, fire, first aid checklists</li>
        <li><strong>📦 Resources</strong> — Post what you have; find what others have nearby</li>
        <li><strong>👥 Household</strong> — Track your household members and status</li>
        <li><strong>🌐 Network</strong> — Peer discovery, hub connection, mesh status</li>
        <li><strong>🏥 Medical</strong> — Triage, medications, hospital coordination</li>
        <li><strong>🗺️ Map</strong> — Mark critical locations offline</li>
        <li><strong>📻 Radio</strong> — Emergency frequency reference</li>
        <li><strong>⚙️ Settings</strong> — All configuration, backup, and restore</li>
      </ul>
      <div class="ob-info">💡 Tip: Tap <strong>Share ARK</strong> on the Home tab any time to share with someone new.</div>
      <div class="onboard-nav">
        <button class="btn btn-secondary" onclick="Onboarding.back()">← Back</button>
        <span class="onboard-step-label">Step 5 of 5</span>
        <button class="btn btn-primary btn-block" onclick="Onboarding.finish()" style="flex:1">Enter ARK →</button>
      </div>
    </div>
  </div>
</div>

<!-- ===== SHARE ARK MODAL ===== -->
<!-- General modal -->
<div id="ark-modal" class="hidden" onclick="if(event.target===this)Modal.close()">
  <div id="ark-modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"></div>
</div>

<div id="share-modal" class="hidden">
  <div class="share-box" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
    <div class="flex-between" style="margin-bottom:16px">
      <h3 id="share-modal-title" style="margin:0;font-size:18px">📡 Share ARK</h3>
      <button class="btn btn-secondary btn-sm" onclick="ShareARK.closeModal()" aria-label="Close share dialog">✕ Close</button>
    </div>
    <p class="font-sm" style="color:var(--text-secondary);margin-bottom:16px">Share the ARK Crisis Suite with anyone who needs it. The entire app is one file — opening it in any browser installs it instantly.</p>

    <!-- Download -->
    <div class="share-method">
      <div class="share-method-icon">⬇️</div>
      <h4>Download File to Share</h4>
      <p>Download a fresh copy of ARK to share via USB drive, AirDrop, Nearby Share, email, or any file transfer.</p>
      <button class="btn btn-primary btn-block" onclick="ShareARK.downloadFile()">⬇ Download ARK-CRISIS-SUITE.html</button>
    </div>

    <!-- One-tap share buttons -->
    <div class="share-method">
      <div class="share-method-icon">🚀</div>
      <h4>Share a Download Link</h4>
      <p style="margin-bottom:12px">Send someone a link to download ARK — they tap it and get the app instantly.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-primary" onclick="ShareARK.shareViaSMS()" style="font-size:.82rem;white-space:nowrap">💬 SMS</button>
        <button class="btn btn-primary" onclick="ShareARK.shareViaEmail()" style="font-size:.82rem;white-space:nowrap">✉️ Email</button>
        <button class="btn" onclick="ShareARK.shareViaFacebook()" style="font-size:.82rem;background:#1877f2;color:#fff;border:none;white-space:nowrap">👍 Facebook</button>
        <button class="btn" onclick="ShareARK.shareViaInstagram()" style="font-size:.82rem;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;border:none;white-space:nowrap">📷 Instagram</button>
      </div>
      <p style="font-size:.75rem;color:var(--text-muted);margin-top:8px;margin-bottom:0">Sends a link to <strong>ark.halosuite.ai</strong> — works over internet. For offline spread, use the Download + AirDrop method above.</p>
    </div>

    <!-- AirDrop / Nearby Share -->
    <div class="share-method">
      <div class="share-method-icon">📲</div>
      <h4>AirDrop / Nearby Share (Fastest)</h4>
      <p>Share phone-to-phone in seconds with no internet required.</p>
      <ol class="share-steps">
        <li>Download the file above first</li>
        <li>Open your Files app and find <em>ARK-CRISIS-SUITE.html</em></li>
        <li>Long-press → Share → AirDrop (iPhone) or Nearby Share (Android)</li>
        <li>Select the recipient's device — done in under 10 seconds</li>
      </ol>
    </div>

    <!-- QR Code -->
    <div class="share-method">
      <div class="share-method-icon">📱</div>
      <h4>QR Code (Hub Required)</h4>
      <p>If your device is connected to a local ARK Hub, generate a QR code that lets others download ARK directly from the hub over local WiFi.</p>
      <div id="share-qr-container">
        <button class="btn btn-secondary btn-block" onclick="ShareARK.generateQR()">Generate QR Code</button>
        <canvas id="share-qr-canvas" style="display:none;max-width:200px;margin:12px auto;"></canvas>
        <div class="mt-8" id="share-qr-status" style="font-size:12px;color:var(--text-secondary);text-align:center"></div>
      </div>
    </div>

    <!-- USB / Offline Instructions -->
    <div class="share-method">
      <div class="share-method-icon">🔌</div>
      <h4>USB Drive (No WiFi Needed)</h4>
      <p>The most reliable method — works even with no power grid or cellular service.</p>
      <ol class="share-steps">
        <li>Download ARK to your computer</li>
        <li>Copy <em>ARK-CRISIS-SUITE.html</em> to a USB drive</li>
        <li>Walk the USB drive to whoever needs it</li>
        <li>They plug in, open a browser, drag in the file — done</li>
      </ol>
      <div class="mt-8" style="font-size:12px;color:var(--text-secondary);background:var(--bg-elevated);border-radius:6px;padding:10px">
        💡 Tip: Label the USB drive "ARK CRISIS SUITE — OPEN IN BROWSER". Put a text file on the drive with the same instructions. Keep copies on multiple drives.
      </div>
    </div>

    <!-- Share Text Template -->
    <div class="share-method">
      <div class="share-method-icon">✍️</div>
      <h4>Message Template</h4>
      <p>Copy this message to send with the file:</p>
      <div class="share-code" id="share-template-text" onclick="ShareARK.copyTemplate()">I'm sending you ARK Crisis Suite — a free offline emergency communication app. Open the HTML file in any browser — no install needed. Works without internet. Use it to coordinate with neighbors during emergencies. — Tap to copy</div>
      <button class="btn btn-secondary btn-sm" onclick="ShareARK.copyTemplate()" style="margin-top:6px">📋 Copy Message</button>
    </div>
  </div>
</div>

<!-- STATUS BAR -->
<div id="status-bar">
  <span class="ark-brand">HaloSuite <span style="font-weight:400;opacity:.45">|</span> ARK</span>
  <span class="status-item"><span class="conn-pill conn-offline" id="conn-pill" onclick="UI.showConnStatus()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();UI.showConnStatus()}" role="button" tabindex="0" style="cursor:pointer" title="Not connected to any hub. Tap for connection details" aria-live="polite" aria-label="Connection: OFFLINE. Show connection details">OFFLINE</span></span>
  <span class="status-item"><span class="status-dot dot-grey" id="gps-dot" title="GPS: grey = off, green = location acquired" aria-hidden="true"></span><span id="gps-status" aria-live="polite">GPS off</span></span>
  <span class="status-item" id="batt-item" style="display:none"><span id="batt-icon">🔋</span> <span id="batt-level">--</span></span>
  <span class="status-item" style="margin-left:auto">🕐 <span id="sb-time">--:--</span></span>
  <span class="status-item" id="offline-indicator" style="color:var(--yellow)"></span>
  <button class="btn btn-secondary btn-sm" onclick="UI.shareApp()" style="padding:3px 10px;min-height:0;font-size:11px;font-weight:700;border-radius:8px">📥 Get Offline Kit</button>
</div>

<!-- NAVIGATION -->
<nav id="nav" role="tablist" aria-label="Main sections">
  <button class="nav-btn active" data-tab="home" id="navtab-home" role="tab" aria-selected="true" aria-controls="tab-home" tabindex="0" aria-label="Home"><span class="nav-icon" aria-hidden="true">🏠</span>Home</button>
  <button class="nav-btn" data-tab="messages" id="navtab-messages" role="tab" aria-selected="false" aria-controls="tab-messages" tabindex="-1" aria-label="Messages"><span class="nav-icon" aria-hidden="true">💬</span>Messages</button>
  <button class="nav-btn" data-tab="survival" id="navtab-survival" role="tab" aria-selected="false" aria-controls="tab-survival" tabindex="-1" aria-label="Survival"><span class="nav-icon" aria-hidden="true">📚</span>Survival</button>
  <button class="nav-btn" data-tab="resources" id="navtab-resources" role="tab" aria-selected="false" aria-controls="tab-resources" tabindex="-1" aria-label="Resources"><span class="nav-icon" aria-hidden="true">📦</span>Resources</button>
  <button class="nav-btn" data-tab="household" id="navtab-household" role="tab" aria-selected="false" aria-controls="tab-household" tabindex="-1" aria-label="Household"><span class="nav-icon" aria-hidden="true">🏘️</span>Household</button>
  <button class="nav-btn" data-tab="network" id="navtab-network" role="tab" aria-selected="false" aria-controls="tab-network" tabindex="-1" aria-label="Network"><span class="nav-icon" aria-hidden="true">📡</span>Network</button>
  <button class="nav-btn" data-tab="medical" id="navtab-medical" role="tab" aria-selected="false" aria-controls="tab-medical" tabindex="-1" aria-label="Medical"><span class="nav-icon" aria-hidden="true">🏥</span>Medical</button>
  <button class="nav-btn" data-tab="map" id="navtab-map" role="tab" aria-selected="false" aria-controls="tab-map" tabindex="-1" aria-label="Map"><span class="nav-icon" aria-hidden="true">🗺️</span>Map</button>
  <button class="nav-btn" data-tab="radio" id="navtab-radio" role="tab" aria-selected="false" aria-controls="tab-radio" tabindex="-1" aria-label="Radio"><span class="nav-icon" aria-hidden="true">📻</span>Radio</button>
  <button class="nav-btn" data-tab="ai" id="navtab-ai" role="tab" aria-selected="false" aria-controls="tab-ai" tabindex="-1" aria-label="AI Assistant"><span class="nav-icon" aria-hidden="true">🤖</span>AI</button>
  <button class="nav-btn" data-tab="settings" id="navtab-settings" role="tab" aria-selected="false" aria-controls="tab-settings" tabindex="-1" aria-label="Settings"><span class="nav-icon" aria-hidden="true">⚙️</span>Settings</button>
</nav>

<div id="app">

<!-- === TAB: HOME === -->
<div class="tab-panel active" id="tab-home" role="tabpanel" aria-labelledby="navtab-home" tabindex="-1">

  <!-- Hero Banner -->
  <div class="home-hero">
    <div class="hero-mascot">🛡️</div>
    <div class="hero-content">
      <div class="hero-eyebrow">HaloSuite · Emergency Tools</div>
      <div class="hero-title">ARK <span>Crisis Suite</span></div>
      <div class="hero-sub">Offline emergency coordination. Works without internet.</div>
      <div class="hero-badges">
        <span class="hero-badge" id="hero-status-badge">◌ Offline Ready</span>
        <span class="hero-badge" id="hero-sync-badge">0 Peers</span>
        <span class="hero-badge" id="hero-msgs-badge">0 Messages</span>
        <span class="hero-badge" id="hero-hub-badge" style="display:none">🛰 Hub Active</span>
      </div>
    </div>
  </div>

  <div id="install-banner" class="card mb-12" style="display:none;background:var(--accent-glow);border-color:var(--accent)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
      <div style="font-weight:700">📲 Save ARK to Your Home Screen</div>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('install-banner').style.display='none'" aria-label="Dismiss install banner" style="padding:2px 6px;min-height:0;line-height:1;font-size:16px;margin:-2px -4px 0 8px">×</button>
    </div>
    <div class="font-sm mb-8">Install ARK for one-tap access — works fully offline, no app store needed.</div>
    <button class="btn btn-primary btn-sm" onclick="installPWA()">Install Now</button>
  </div>

  <div class="offline-banner" id="offline-banner">
    ⚠️ <strong>Offline mode</strong> — Hub not reachable. All data saved locally. Messages will sync when connection returns.
  </div>

  <!-- Alert Level -->
  <div id="alert-display" class="alert-banner alert-1">
    <div class="alert-level-num" id="alert-num">1</div>
    <div class="alert-info">
      <h3 id="alert-title">Normal — No Active Emergency</h3>
      <p id="alert-desc">System running. Monitor conditions. Keep kit ready.</p>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="UI.openAlertEditor()" aria-label="Alert level: tap to change">Set Level</button>
  </div>

  <!-- Quick Actions -->
  <div class="card">
    <div class="card-title card-header"><span>⚡ Quick Actions</span></div>
    <div class="grid-4">
      <button class="quick-action urgent" onclick="UI.quickPost('help')" aria-label="Request Help">
        <div class="qa-icon" aria-hidden="true">🆘</div>
        <div class="qa-label">Request Help</div>
      </button>
      <button class="quick-action" onclick="UI.quickPost('safe')" aria-label="Mark yourself as safe">
        <div class="qa-icon" aria-hidden="true">✅</div>
        <div class="qa-label">I'm Safe</div>
      </button>
      <button class="quick-action" onclick="UI.switchTab('household')" aria-label="Register your household">
        <div class="qa-icon" aria-hidden="true">🏠</div>
        <div class="qa-label">Register HH</div>
      </button>
      <button class="quick-action" onclick="UI.quickPost('offers')" aria-label="Offer help to others">
        <div class="qa-icon" aria-hidden="true">🤝</div>
        <div class="qa-label">Offer Help</div>
      </button>
    </div>
  </div>

  <!-- Message Stats -->
  <div class="card" id="msg-stats-card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">💬</span>Message Board</div>
      <button class="btn btn-ghost btn-sm" onclick="UI.switchTab('messages')">View All →</button>
    </div>
    <div id="msg-stats-content" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <div class="font-xs text-muted" id="msg-stats-loading">Loading…</div>
    </div>
  </div>

  <!-- Checklists -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">✅</span>Emergency Checklists <span id="checklist-header-date" class="checklist-date"></span></div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="Checklist.printCurrent()" title="Print active checklist">🖨️</button>
        <button class="btn btn-ghost btn-sm" onclick="Checklist.reset()" title="Reset active checklist">↺ Reset</button>
      </div>
    </div>
    <!-- Checklist selector tabs -->
    <div id="checklist-tab-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
      <!-- filled by JS -->
    </div>
    <div id="checklist-container">
      <!-- filled by JS -->
    </div>
  </div>

  <!-- System Status -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title mb-8"><span class="card-icon">🕐</span> System Time</div>
      <div style="font-size:28px;font-weight:700;font-family:monospace;color:var(--accent)" id="home-clock">--:--:--</div>
      <div class="text-muted font-sm mt-8" id="home-date">---</div>
      <div class="text-muted font-sm" id="home-tz">---</div>
    </div>
    <div class="card" id="home-hub-card">
      <div class="card-title mb-8"><span class="card-icon">🛰</span> Network</div>
      <div class="font-sm text-secondary" id="last-sync-display">Not synced</div>
      <div class="font-xs text-muted mt-4" id="hub-url-display">Hub: not configured</div>
      <div id="softhub-home-status" class="font-xs mt-4" style="color:var(--text-muted)">📡 Peer mode</div>
      <div class="mt-8 flex gap-8 wrap" id="hub-home-actions">
        <button class="btn btn-secondary btn-sm" onclick="Hub.sync(true)" id="hub-sync-btn" style="display:none">🔄 Sync</button>
        <button class="btn btn-primary btn-sm" onclick="UI.switchTab('network')" id="hub-connect-btn">📡 Network →</button>
      </div>
    </div>
  </div>

  <!-- Quick Reference -->
  <div class="card">
    <div class="card-title mb-8"><span class="card-icon">📋</span> Quick Reference</div>
    <div id="quick-ref-content">
      <div class="font-sm bold mb-8">Emergency Numbers (US)</div>
      <div class="grid-2 font-sm">
        <div><span class="text-accent bold">911</span> — Emergency services</div>
        <div><span class="text-accent bold">988</span> — Crisis/Mental health</div>
        <div><span class="text-accent bold">1-800-222-1222</span> — Poison Control</div>
        <div><span class="text-accent bold">211</span> — Local assistance</div>
        <div><span class="text-accent bold">1-800-621-3362</span> — FEMA</div>
        <div><span class="text-accent bold">1-800-733-2767</span> — Red Cross</div>
      </div>
    </div>
  </div>

  <!-- SHARE ARK CARD -->
  <div class="card">
    <div class="card-header">
      <span class="card-icon">📡</span>
      <span class="card-title">Share ARK — Build Your Network</span>
    </div>
    <p class="font-sm" style="color:var(--text-secondary);margin-bottom:14px;line-height:1.5">The more people have ARK, the stronger your community's resilience. Share this single file via text, AirDrop, USB, or email — no internet needed to receive it.</p>
    <div class="grid-2 gap-8 mb-12">
      <button class="btn btn-primary" onclick="ShareARK.openModal()">📡 All Share Options</button>
      <button class="btn btn-secondary" onclick="ShareARK.downloadFile()">⬇ Download to Share</button>
    </div>
    <div class="font-sm" style="background:var(--bg-elevated);border-radius:8px;padding:12px;color:var(--text-secondary)">
      <strong style="color:var(--text-primary)">Why share?</strong> Each copy you share creates another node in your community network. When someone runs ARK and connects to the same local hub, your whole neighborhood gains resilience.
    </div>
  </div>

  <!-- SATELLITE RELAY MODULE -->
  <div class="card">
    <div class="card-header">
      <span class="card-icon">🛰️</span>
      <span class="card-title">Satellite Relay (Advanced)</span>
    </div>
    <div class="ob-info" style="margin:0 0 10px 0">When all other networks fail, licensed amateur radio operators can relay messages via amateur satellites and the ISS.</div>
    <div class="font-sm mb-12" style="color:var(--text-secondary);line-height:1.5">
      <strong style="color:var(--text-primary)">Free options available:</strong><br>
      🛸 <strong>ISS APRS</strong> — ISS relays short digital packets when overhead (no fee, requires amateur license)<br>
      📡 <strong>AMSAT CubeSats</strong> — Some support digital packet relay (see network tab)<br>
      🍎 <strong>iPhone Satellite</strong> — Emergency SOS and Messages on iPhone 14+ (no ARK control)<br>
    </div>
    <div style="font-size:12px;color:var(--text-muted);background:var(--bg-elevated);border-radius:6px;padding:10px;margin-bottom:10px">
      ⚖️ <strong>Legal note:</strong> Amateur satellite relays in the US require an FCC amateur radio license. Encryption and third-party commercial traffic are prohibited under Part 97. Satellite relay in ARK is for public emergency text messages only.
    </div>
    <button class="btn btn-secondary btn-block" onclick="UI.switchTab('radio')">📻 View Radio &amp; Satellite Reference →</button>
  </div>

</div><!-- /tab-home -->

<!-- === TAB: MESSAGES === -->
<div class="tab-panel" id="tab-messages" role="tabpanel" aria-labelledby="navtab-messages" tabindex="-1">

  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">📝</span>Post Message</div>
      <span id="queue-badge" class="offline-queue-badge hidden">0 queued</span>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Your Alias</label>
        <input class="form-input" id="msg-alias" placeholder="Anonymous" maxlength="40">
      </div>
      <div class="form-group">
        <label class="form-label">Channel</label>
        <select class="form-input" id="msg-channel">
          <option value="help">🆘 Need Help</option>
          <option value="safe">✅ I'm Safe</option>
          <option value="offers">🤝 Can Help / Have Supplies</option>
          <option value="missing">🔍 Looking for Someone</option>
          <option value="reunification">👨‍👩‍👧 Family Reunification</option>
          <option value="general" selected>💬 General</option>
          <option value="resources">📦 Resources</option>
          <option value="medical">🏥 Medical</option>
          <option value="shelter">🏠 Shelter</option>
          <option value="water">💧 Water</option>
          <option value="power">⚡ Power</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;justify-content:space-between;align-items:baseline">
        <span>Message <span class="text-muted">(public — no addresses or medical details)</span></span>
        <span id="msg-char-counter" class="font-xs text-muted" aria-live="polite">0 / 1000</span>
      </label>
      <textarea class="form-input" id="msg-text" placeholder="Short and specific. E.g. 'Need insulin for adult, at school gym'" maxlength="1000" oninput="Messages._onTextInput(this)" onkeydown="if(event.ctrlKey&&event.key==='Enter'){event.preventDefault();Messages.post()}" aria-describedby="msg-char-counter"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Location (optional)</label>
      <div style="display:flex;gap:6px;align-items:center">
        <input class="form-input" id="msg-location" maxlength="500" placeholder="Intersection, landmark, or general area" style="flex:1">
        <button class="btn btn-secondary btn-sm" onclick="GPS.fillLocation('msg-location', this)" title="Auto-fill with GPS coordinates" aria-label="Fill location with GPS" style="white-space:nowrap;flex-shrink:0">📍 GPS</button>
      </div>
    </div>
    <div class="flex gap-8 wrap">
      <label class="flex gap-8 font-sm" style="align-items:center;cursor:pointer">
        <input type="checkbox" id="msg-urgent"> <span>🚨 Mark as urgent</span>
      </label>
    </div>
    <div class="flex gap-8 mt-12">
      <button class="btn btn-primary" id="msg-post-btn" onclick="Messages.post()" disabled>📤 Post Message</button>
      <button class="btn btn-green btn-sm" onclick="Messages.postSafe()">✅ I'm Safe (quick)</button>
    </div>
  </div>

  <!-- Channel Filter + Board -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">📋</span>Message Board</div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="Messages.search()">🔍 Search</button>
        <button class="btn btn-ghost btn-sm" onclick="Messages.exportTxt()">📄 Export</button>
      </div>
    </div>
    <div class="channel-tabs" id="channel-tabs" role="group" aria-label="Filter messages by channel">
      <button class="ch-tab active" data-ch="all" aria-pressed="true">All</button>
      <button class="ch-tab" data-ch="help" aria-pressed="false"><span aria-hidden="true">🆘</span> Help</button>
      <button class="ch-tab" data-ch="safe" aria-pressed="false"><span aria-hidden="true">✅</span> Safe</button>
      <button class="ch-tab" data-ch="offers" aria-pressed="false"><span aria-hidden="true">🤝</span> Offers</button>
      <button class="ch-tab" data-ch="missing" aria-pressed="false"><span aria-hidden="true">🔍</span> Missing</button>
      <button class="ch-tab" data-ch="reunification" aria-pressed="false"><span aria-hidden="true">👨‍👩‍👧</span> Reunif.</button>
      <button class="ch-tab" data-ch="general" aria-pressed="false"><span aria-hidden="true">💬</span> General</button>
      <button class="ch-tab" data-ch="resources" aria-pressed="false"><span aria-hidden="true">📦</span> Resources</button>
      <button class="ch-tab" data-ch="medical" aria-pressed="false"><span aria-hidden="true">🏥</span> Medical</button>
      <button class="ch-tab" data-ch="water" aria-pressed="false"><span aria-hidden="true">💧</span> Water</button>
    </div>
    <div id="msg-search-bar" class="hidden mb-12" style="position:relative">
      <input class="form-input" id="msg-search-input" maxlength="500" placeholder="Search messages..." oninput="Messages.filterSearch()" aria-label="Search messages" style="padding-right:36px">
      <button onclick="Messages.clearSearch()" title="Clear search" aria-label="Clear search" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;line-height:1;padding:2px 4px">✕</button>
    </div>
    <div id="messages-list" aria-live="polite" aria-atomic="false" aria-relevant="additions">
      <div id="msg-empty-state" class="card" style="text-align:center;padding:24px 16px;border:1px dashed var(--border)">
        <div class="mb-8" style="font-size:2rem">💬</div>
        <div style="font-weight:700;margin-bottom:6px">No messages yet</div>
        <div class="text-secondary font-sm mb-16">To post: pick a channel, type a short, specific message in the box above, and press <strong>Post Message</strong>. It is saved on this device right away and shared when you connect to a hub (Network tab). To see your neighbors' messages, connect to a hub and tap <strong>Sync Now</strong>.</div>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('msg-text').focus();document.getElementById('msg-text').scrollIntoView({behavior:'smooth'})">Write First Message</button>
      </div>
    </div>
    <div class="mt-12" id="load-more-wrap" style="display:none">
      <button class="btn btn-secondary btn-sm" onclick="Messages.loadMore()">Load More</button>
    </div>
  </div>

  <!-- Bundle Transfer -->
  <div class="card">
    <div class="card-title mb-8"><span class="card-icon">🔄</span>Carry Messages (USB/File Transfer)</div>
    <div class="info-box">Transfer messages without internet by exporting/importing bundles from USB or shared files.</div>
    <div class="flex gap-8 wrap">
      <button class="btn btn-secondary btn-sm" onclick="Messages.exportBundle()">📦 Export Bundle</button>
      <button class="btn btn-secondary btn-sm" onclick="Messages.importBundleUI()">📥 Import Bundle</button>
    </div>
    <div id="bundle-import-area" class="hidden mt-12">
      <label class="form-label">Paste bundle JSON or load file:</label>
      <textarea class="form-input" id="bundle-paste" placeholder='{"protocol":"ARK-RELAY-1","packets":[...]}' aria-label="Paste bundle JSON"></textarea>
      <button class="btn btn-primary btn-sm mt-8" onclick="Messages.importBundle()">Import</button>
    </div>
  </div>

  <!-- Missing Persons -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">🔍</span>Missing Persons <span id="missing-count-badge" class="badge badge-muted font-xs" style="display:none"></span></div>
      <button class="btn btn-primary btn-sm" onclick="MissingPersons.addForm()">+ Report Missing</button>
    </div>
    <div class="info-box">Record missing persons locally. Print a flyer to distribute in your community.</div>
    <div class="flex gap-8 mb-8" id="missing-search-row" style="display:none">
      <input type="text" id="missing-search" class="form-input" placeholder="Search by name or location…" maxlength="100" oninput="MissingPersons.filterSearch()" aria-label="Search missing persons" style="flex:1">
    </div>
    <div id="missing-persons-list">
      <div class="text-secondary font-sm" style="padding:8px 0">No missing persons reports — tap Add to create a report.</div>
    </div>
  </div>
</div><!-- /tab-messages -->

<!-- === TAB: SURVIVAL === -->
<div class="tab-panel" id="tab-survival" role="tabpanel" aria-labelledby="navtab-survival" tabindex="-1">

  <div class="flex-between mb-12 wrap gap-8">
    <h2 class="section-title"><span class="title-icon">📚</span>Survival Library<span class="guide-count-badge" id="guide-count-badge"></span></h2>
    <div class="flex gap-8">
      <input class="form-input" id="guide-search" maxlength="500" style="width:200px" placeholder="Search guides..." oninput="Guides.search()" aria-label="Search guides">
      <button class="btn btn-ghost btn-sm" onclick="PrintARK.checklist()" title="Print your preparedness checklist">🖨️ Checklist</button>
    </div>
  </div>

  <div class="guide-nav" id="guide-nav">
    <span class="guide-cat-btn active" data-cat="all">All Guides</span>
    <span class="guide-cat-btn" data-cat="water">💧 Water</span>
    <span class="guide-cat-btn" data-cat="food">🍽️ Food</span>
    <span class="guide-cat-btn" data-cat="shelter">🏕️ Shelter</span>
    <span class="guide-cat-btn" data-cat="fire">🔥 Fire</span>
    <span class="guide-cat-btn" data-cat="medical">🏥 Medical</span>
    <span class="guide-cat-btn" data-cat="navigation">🧭 Navigation</span>
    <span class="guide-cat-btn" data-cat="signaling">📡 Signaling</span>
    <span class="guide-cat-btn" data-cat="comms">📻 Radio/Comms</span>
    <span class="guide-cat-btn" data-cat="power">⚡ Power</span>
    <span class="guide-cat-btn" data-cat="weather">🌡️ Weather</span>
    <span class="guide-cat-btn" data-cat="evacuation">🚶 Evacuation</span>
    <span class="guide-cat-btn" data-cat="communication">📶 Messaging</span>
    <span class="guide-cat-btn" data-cat="reunification">👨‍👩‍👧 Family</span>
    <span class="guide-cat-btn" data-cat="community">🤝 Community</span>
    <span class="guide-cat-btn" data-cat="__bookmarks__">⭐ Bookmarked</span>
  </div>

  <div id="guides-container">
    <!-- filled by JS from embedded data -->
  </div>
</div><!-- /tab-survival -->

<!-- === TAB: RESOURCES === -->
<div class="tab-panel" id="tab-resources" role="tabpanel" aria-labelledby="navtab-resources" tabindex="-1">

  <div class="flex-between mb-12 wrap gap-8">
    <h2 class="section-title"><span class="title-icon">📦</span>Inventory Tracker</h2>
    <div class="flex gap-8">
      <button class="btn btn-secondary btn-sm" onclick="Resources.shareWithHub()">📡 Share with Hub</button>
      <button class="btn btn-ghost btn-sm" onclick="PrintARK.inventory()" title="Print inventory list">🖨️ Print List</button>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">📊</span>Current Supplies</div>
      <div class="text-muted font-xs" id="resources-updated">Not yet updated</div>
    </div>

    <div id="resource-meters">
      <!-- filled by JS -->
    </div>

    <div class="mt-12">
      <button class="btn btn-primary" onclick="Resources.openEdit()">✏️ Update Inventory</button>
    </div>
  </div>

  <!-- Quick preset kits -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">⚡</span>Quick Presets</div>
      <div class="text-muted font-xs">Load a starting point</div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="Resources.loadPreset('72hr')" title="FEMA recommended 72-hour emergency kit">🧳 72-Hour Kit</button>
      <button class="btn btn-secondary btn-sm" onclick="Resources.loadPreset('2week')" title="2-week extended preparedness supply">📦 2-Week Supply</button>
      <button class="btn btn-secondary btn-sm" onclick="Resources.loadPreset('month')" title="30-day long-term preparedness">🏠 30-Day Plan</button>
    </div>
    <div class="text-muted font-xs mt-8">Presets fill the form below with FEMA-recommended quantities for 1 person — adjust to your household size before saving.</div>
  </div>

  <!-- Edit form (hidden by default) -->
  <div class="card hidden" id="resource-edit-card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">✏️</span>Update Inventory</div>
      <button class="btn btn-ghost btn-sm" onclick="Resources.closeEdit()" aria-label="Close" style="padding:4px 8px">✕</button>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">💧 Water (gallons)</label>
        <input class="form-input" id="res-water" type="number" min="0" step="0.5" placeholder="0">
        <div class="text-muted font-xs" style="margin-top:3px">FEMA: 1 gal/person/day</div>
      </div>
      <div class="form-group">
        <label class="form-label">🍽️ Food (days of supply)</label>
        <input class="form-input" id="res-food" type="number" min="0" step="0.5" placeholder="0">
        <div class="text-muted font-xs" style="margin-top:3px">Total days for the household</div>
      </div>
      <div class="form-group">
        <label class="form-label">⛽ Fuel (gallons)</label>
        <input class="form-input" id="res-fuel" type="number" min="0" step="0.5" placeholder="0">
        <div class="text-muted font-xs" style="margin-top:3px">Gas, propane, kerosene combined</div>
      </div>
      <div class="form-group">
        <label class="form-label">🏥 Medical Supplies (0–5)</label>
        <select class="form-input" id="res-medical">
          <option value="0">0 — None</option>
          <option value="1">1 — Minimal (bandages only)</option>
          <option value="2">2 — Basic first-aid kit</option>
          <option value="3">3 — Good supply + prescription meds</option>
          <option value="4">4 — Well stocked + trauma kit</option>
          <option value="5">5 — Fully equipped + advanced care</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">🏠 Shelter Capacity (people)</label>
        <input class="form-input" id="res-shelter" type="number" min="0" placeholder="0">
        <div class="text-muted font-xs" style="margin-top:3px">How many people can shelter here</div>
      </div>
      <div class="form-group">
        <label class="form-label">🔋 Power (hours of backup)</label>
        <input class="form-input" id="res-power" type="number" min="0" placeholder="0">
        <div class="text-muted font-xs" style="margin-top:3px">Generator, battery bank, solar hours</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">📝 Notes</label>
      <textarea class="form-input" id="res-notes" maxlength="500" placeholder="Storage locations, expiry notes, special items..."></textarea>
    </div>
    <div class="flex gap-8">
      <button class="btn btn-primary" onclick="Resources.save()">💾 Save Inventory</button>
      <button class="btn btn-secondary" onclick="Resources.closeEdit()">Cancel</button>
    </div>
  </div>

  <!-- Inventory History & Export -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">📈</span>Snapshot History</div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="Resources.exportJSON()" title="Export inventory as JSON">⬇ Export</button>
        <button class="btn btn-ghost btn-sm" onclick="Resources.importJSON()" title="Import inventory from JSON">⬆ Import</button>
      </div>
    </div>
    <div id="res-history" class="font-sm text-secondary">No history yet — save a snapshot to track changes.</div>
  </div>
</div><!-- /tab-resources -->

<!-- === TAB: HOUSEHOLD === -->
<div class="tab-panel" id="tab-household" role="tabpanel" aria-labelledby="navtab-household" tabindex="-1">

  <h2 class="section-title"><span class="title-icon">🏘️</span>Household Profile</h2>

  <!-- Basic Info -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🏠</span>Household Info</div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Household Name</label>
        <input class="form-input" id="hh-name" maxlength="60" placeholder="e.g. Smith Family">
      </div>
      <div class="form-group">
        <label class="form-label">Total Members</label>
        <input class="form-input" id="hh-count" type="number" min="1" placeholder="4">
      </div>
      <div class="form-group">
        <label class="form-label">General Location (no street address)</label>
        <input class="form-input" id="hh-location" maxlength="500" placeholder="e.g. Riverside area, near school">
      </div>
      <div class="form-group">
        <label class="form-label">Household ID</label>
        <input class="form-input" id="hh-id" placeholder="Auto-generated" readonly>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Special Needs / Vulnerabilities</label>
      <textarea class="form-input" id="hh-needs" maxlength="500" placeholder="Medication, mobility needs, medical equipment, etc." style="min-height:60px"></textarea>
    </div>
  </div>

  <!-- Members -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">👥</span>Members <span id="hh-member-count" style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--accent);color:#fff;margin-left:6px;display:none"></span></div>
      <button class="btn btn-secondary btn-sm" onclick="Household.addMember()">+ Add</button>
    </div>
    <div id="members-list">
      <!-- filled by JS -->
    </div>
  </div>

  <!-- Meeting Points -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">📍</span>Meeting Points</div>
    <div class="form-group">
      <label class="form-label">Primary (just outside home)</label>
      <input class="form-input" id="hh-meet1" maxlength="500" placeholder="e.g. Front mailbox / driveway end">
    </div>
    <div class="form-group">
      <label class="form-label">Secondary (outside neighborhood)</label>
      <input class="form-input" id="hh-meet2" maxlength="500" placeholder="e.g. Community center parking lot">
    </div>
    <div class="form-group">
      <label class="form-label">Evacuation destination</label>
      <input class="form-input" id="hh-evac" maxlength="500" placeholder="e.g. Relative's home in [city], approx 100 miles north">
    </div>
  </div>

  <!-- Out-of-Area Contact -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">📞</span>Out-of-Area Contact</div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" id="hh-ooa-name" maxlength="60" placeholder="Contact name">
      </div>
      <div class="form-group">
        <label class="form-label">Relationship</label>
        <input class="form-input" id="hh-ooa-rel" maxlength="60" placeholder="e.g. Uncle, Family friend">
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" id="hh-ooa-phone" maxlength="40" placeholder="+1 555 000 0000" type="tel">
      </div>
      <div class="form-group">
        <label class="form-label">Alternate Contact Method</label>
        <input class="form-input" id="hh-ooa-alt" maxlength="80" placeholder="e.g. Email or radio callsign">
      </div>
    </div>
    <div class="info-box">Local phone lines fill up during emergencies. An out-of-area contact can relay messages between separated family members.</div>
  </div>

  <!-- Vehicles -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🚗</span>Vehicles &amp; Evacuation</div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Vehicle 1 — Make / Model</label>
        <input class="form-input" id="hh-veh1" maxlength="200" placeholder="e.g. 2018 Toyota Camry, silver">
      </div>
      <div class="form-group">
        <label class="form-label">Fuel Level (Vehicle 1)</label>
        <select class="form-input" id="hh-fuel">
          <option>Full</option>
          <option>3/4</option>
          <option>Half</option>
          <option>1/4</option>
          <option>Empty</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Vehicle 2 — Make / Model</label>
        <input class="form-input" id="hh-veh2" maxlength="200" placeholder="e.g. 2015 Honda CRV, blue (optional)">
      </div>
      <div class="form-group">
        <label class="form-label">Fuel Level (Vehicle 2)</label>
        <select class="form-input" id="hh-fuel2">
          <option>Full</option>
          <option>3/4</option>
          <option>Half</option>
          <option>1/4</option>
          <option>Empty</option>
          <option>N/A</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Pets &amp; Animals</label>
      <input class="form-input" id="hh-pets" maxlength="500" placeholder="e.g. 1 dog (needs carrier), 2 cats (crates in garage)">
    </div>
    <div class="form-group">
      <label class="form-label">Bug-out Bag / Go-bag Location</label>
      <input class="form-input" id="hh-gobag" maxlength="300" placeholder="e.g. Hall closet, top shelf">
    </div>
  </div>

  <!-- Quick Reference Card -->
  <div class="card" id="hh-qrc-card" style="display:none">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">🪪</span>Quick Reference Card</div>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('hh-qrc-card').style.display='none'">✕</button>
    </div>
    <div id="hh-qrc-content" style="font-size:13px;line-height:1.6"></div>
    <div class="flex gap-8 mt-12">
      <button class="btn btn-secondary btn-sm" onclick="Household.printCard()">🖨️ Print Full Card</button>
    </div>
  </div>

  <div class="flex gap-8 wrap">
    <button class="btn btn-primary" onclick="Household.save()">💾 Save Profile</button>
    <button class="btn btn-secondary" onclick="Household.showQuickRef()">🪪 Quick Reference</button>
    <button class="btn btn-secondary" onclick="Household.printCard()">🖨️ Print Card</button>
    <button class="btn btn-secondary" onclick="Household.shareWithHub()">📡 Share with Hub</button>
  </div>
</div><!-- /tab-household -->

<!-- === TAB: NETWORK === -->
<div class="tab-panel" id="tab-network" role="tabpanel" aria-labelledby="navtab-network" tabindex="-1">

  <h2 class="section-title"><span class="title-icon">📡</span>Network</h2>

  <!-- First-time tip — hidden once hub is configured or soft-hub claimed -->
  <div id="network-first-use-tip" class="warn-box" style="background:rgba(139,111,62,.08);border-color:rgba(139,111,62,.3);color:var(--text-secondary);font-size:13px;line-height:1.6;margin-bottom:12px">
    <strong style="color:var(--accent)">📡 How networking works:</strong>
    One device on your Wi-Fi becomes the <em>Hub</em> — it syncs everyone's messages.
    Tap <strong>Become the Hub</strong> below if you want this device to be the hub,
    or enter an address under <strong>Join a Hub</strong> if someone else is already running one.
    ARK works fully offline too — your messages are saved on this device even without a hub.
  </div>

  <!-- ONE-TAP HUB DEPLOY CARD -->
  <div class="hub-deploy-card" id="hub-deploy-card">
    <div class="hub-deploy-label">This Device</div>
    <div class="hub-deploy-title" id="hub-deploy-title">🛰 Start Hub on This Device</div>
    <div class="hub-deploy-sub" id="hub-deploy-sub">Turn this device into the network hub. Anyone on the same Wi-Fi can connect instantly — no setup needed on their end.</div>

    <!-- PEER STATE (default) -->
    <div id="hub-deploy-peer-state">
      <button class="btn btn-primary w-full" id="hub-start-btn" onclick="Network.startSoftHub()" style="font-size:1rem;padding:14px 20px;border-radius:var(--radius-md)">
        🛰 Become the Hub
      </button>
      <div class="font-xs text-muted mt-8" style="text-align:center">Tap once — your device starts sharing messages with nearby ARK users on the same Wi-Fi</div>
    </div>

    <!-- HUB ACTIVE STATE (shown when isHub) -->
    <div id="hub-deploy-active-state" style="display:none">
      <div class="hub-active-row">
        <div class="hub-active-dot"></div>
        <span style="font-weight:700;color:var(--accent)">Hub Active</span>
        <span class="badge badge-orange" id="hub-deploy-peer-count">0 peers</span>
      </div>
      <div id="hub-ip-wrap" style="margin:12px 0">
        <div class="font-xs text-muted mb-4">Share this address with your neighbors:</div>
        <div class="hub-ip-display" id="hub-ip-value">Detecting…</div>
        <div class="font-xs text-muted mt-4">They open ARK → Network → paste this address → Connect</div>
      </div>
      <!-- QR code for hub address auto-generated here -->
      <div id="hub-deploy-qr" style="margin:12px 0 8px"></div>
      <div class="flex gap-8 mt-4">
        <button class="btn btn-secondary btn-sm" onclick="Network.copyHubIP()">📋 Copy Address</button>
        <button class="btn btn-ghost btn-sm" id="hub-stop-btn" onclick="Network.stopSoftHub()" style="color:var(--red)">■ Stop Hub</button>
      </div>
    </div>
  </div>

  <!-- JOIN A HUB CARD -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🌐</span>Join a Hub</div>
    <div class="font-sm text-secondary mb-12" style="line-height:1.6">Connect to someone else's hub on your Wi-Fi. Ask your coordinator for the address, or scan their QR code.</div>
    <div class="form-group mb-8">
      <label class="form-label">Hub Address</label>
      <div class="flex gap-8">
        <input class="form-input" id="hub-url-input" maxlength="500" placeholder="192.168.1.100:3000" onkeydown="if(event.key==='Enter'){event.preventDefault();Network.connectHub();}">
        <button class="btn btn-primary" onclick="Network.connectHub()">Connect</button>
      </div>
    </div>
    <div id="hub-status-detail" class="font-sm text-secondary mb-8">Not connected to any hub.</div>
    <div id="softhub-role-badge" class="font-xs" style="color:var(--text-muted);display:none">📡 Peer mode</div>
    <div id="hub-heartbeat-row" class="font-xs" style="color:var(--text-muted);display:none;margin-top:4px">
      <span id="hub-heartbeat-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);margin-right:5px;vertical-align:middle"></span>
      <span id="hub-heartbeat-label">Hub alive</span>
    </div>
    <div class="flex gap-8 wrap mt-8">
      <button class="btn btn-secondary btn-sm" onclick="Network.scanHub()">🔍 Auto-Scan</button>
      <button class="btn btn-secondary btn-sm" onclick="Network.startQRScan()">📷 Scan QR</button>
      <button class="btn btn-secondary btn-sm" onclick="Hub.sync(true)">🔄 Sync Now</button>
      <button class="btn btn-ghost btn-sm" id="hub-disconnect-btn" onclick="Hub.disconnect()" style="display:none;color:var(--red)">✕ Disconnect</button>
    </div>
    <div class="flex gap-8 wrap mt-4" style="font-size:12px;color:var(--text-muted)">
      <span id="net-last-sync">Never synced</span>
      <span>·</span>
      <span id="net-sync-interval">Auto-sync every 1 min</span>
    </div>
    <div id="scan-results" class="mt-8"></div>
    <!-- QR Scanner (moved here) -->
    <div id="qr-video-container" class="hidden mt-8">
      <video class="w-full" id="qr-video" style="border-radius:var(--radius-md)" autoplay playsinline></video>
      <button class="btn btn-ghost btn-sm mt-8" onclick="Network.stopQRScan()">Stop</button>
    </div>
  </div>

  <!-- SHARE HUB QR -->
  <div class="card" id="hub-qr-share-card" style="display:none">
    <div class="card-title mb-12"><span class="card-icon">🔲</span>Share Hub QR Code</div>
    <div class="font-sm text-secondary mb-12">Show this to neighbors so they can connect in one scan.</div>
    <div id="qr-hub-display">
      <div class="text-muted font-sm">Start the hub or connect to one above to generate a QR code.</div>
    </div>
    <button class="btn btn-secondary btn-sm mt-8" onclick="Network.generateHubQR()">🔄 Regenerate</button>
  </div>

  <!-- Connected Peers -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">👥</span>Connected Peers</div>
      <span class="badge badge-blue" id="peer-count-badge">0 peers</span>
    </div>
    <div id="peers-list">
      <div class="text-secondary font-sm">No peers yet. Start or join a hub to see participants.</div>
    </div>
  </div>

  <!-- Relay Status -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🕸️</span>Relay Status</div>
    <div class="grid-2 font-sm">
      <div class="peer-item">
        <span class="text-muted">📶 Wi-Fi Hub</span>
        <span class="badge badge-blue" id="wifi-status">Offline</span>
      </div>
      <div class="peer-item">
        <span class="text-muted">📡 Meshtastic</span>
        <span class="badge badge-yellow">Future</span>
      </div>
      <div class="peer-item">
        <span class="text-muted">🔵 Bluetooth</span>
        <span class="badge badge-yellow">Future</span>
      </div>
      <div class="peer-item">
        <span class="text-muted">📻 LoRa Bridge</span>
        <span class="badge badge-yellow">Future</span>
      </div>
    </div>
  </div>

  <!-- Bug Report -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">🐛</span>Report a Bug</div>
      <span class="badge badge-blue">Auto-patch</span>
    </div>
    <div class="font-sm text-secondary mb-12" style="line-height:1.5">Found something broken? Report it here. Fixes are delivered as patches — no need to re-download the app.</div>
    <div class="form-group">
      <label class="form-label">What went wrong?</label>
      <textarea class="form-input" id="bug-report-text" placeholder="Describe what happened and what you expected…" style="min-height:70px"></textarea>
    </div>
    <div class="flex gap-8">
      <button class="btn btn-primary btn-sm" onclick="Network.submitBugReport()">📤 Submit Report</button>
      <button class="btn btn-secondary btn-sm" onclick="Network.checkForUpdates()">🔄 Check for Updates</button>
    </div>
    <div id="bug-report-status" class="font-xs text-muted mt-8"></div>
    <div id="patch-status" class="font-xs text-muted mt-4"></div>
  </div>

</div><!-- /tab-network -->

<!-- === TAB: MEDICAL === -->
<div class="tab-panel" id="tab-medical" role="tabpanel" aria-labelledby="navtab-medical" tabindex="-1">

  <div class="flex-between mb-12 wrap gap-8">
    <h2 class="section-title" style="margin:0"><span class="title-icon">🏥</span>Medical Reference</h2>
    <div class="flex gap-8">
      <button class="btn btn-ghost btn-sm" onclick="PrintARK.medicalRef()" title="Print the medical reference cards">🖨️ Print Reference</button>
      <button class="btn btn-secondary btn-sm" onclick="PrintARK.emergencyCard()" title="Print a wallet-sized emergency card">💳 Emergency Card</button>
    </div>
  </div>

  <div class="warn-box">
    ⚠️ <strong>Life-threatening emergency: call 911.</strong> This reference is for information only — not a substitute for professional medical care. Sources: US government and humanitarian guidance, last reviewed 2026-11-14.
  </div>

  <!-- CPR -->
  <div class="card" style="border:2px solid var(--red);border-radius:var(--radius-lg)">
    <div class="card-header mb-12">
      <div class="card-title" style="font-size:18px;font-weight:800"><span class="card-icon">❤️</span>CPR Guide</div>
      <div style="display:flex;gap:6px" role="group" aria-label="CPR mode">
        <button class="btn btn-sm" id="cpr-mode-adult" onclick="CPR.setMode('adult')" style="background:var(--accent);color:#000;font-weight:700;padding:8px 14px">Adult</button>
        <button class="btn btn-secondary btn-sm" id="cpr-mode-child" onclick="CPR.setMode('child')" style="padding:8px 14px">Child</button>
        <button class="btn btn-secondary btn-sm" id="cpr-mode-infant" onclick="CPR.setMode('infant')" style="padding:8px 14px">Infant</button>
      </div>
    </div>
    <div id="cpr-mode-label" class="mb-8" style="text-align:center;font-size:14px;font-weight:600;color:var(--text-secondary)">Adult (8+ yrs) — 100–120/min · 2 hands · 2 in deep</div>
    <div style="text-align:center;margin-bottom:10px;font-size:13px;background:var(--bg-elevated);border-radius:6px;padding:6px 12px;font-weight:600">30 compressions → 2 rescue breaths → repeat</div>
    <div class="cpr-box cpr-paused" id="cpr-box">
      <div class="cpr-pulse" id="cpr-heart">❤️</div>
      <div class="cpr-counter" id="cpr-counter">0</div>
      <div class="font-sm text-muted mt-4">Compressions</div>
      <div id="cpr-elapsed" class="font-sm bold mt-4" style="color:var(--accent);letter-spacing:1px">00:00</div>
      <div id="cpr-breath-cue" class="font-sm mt-4" style="display:none;color:var(--blue);font-weight:700;font-size:16px">💨 GIVE 2 BREATHS</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px">
      <button class="btn btn-primary" id="cpr-start-btn" onclick="CPR.start()" style="font-size:16px;padding:14px 8px;font-weight:700">▶ START</button>
      <button class="btn btn-secondary" onclick="CPR.pause()" style="font-size:16px;padding:14px 8px;font-weight:700">⏸ PAUSE</button>
      <button class="btn btn-ghost" onclick="CPR.reset()" style="font-size:16px;padding:14px 8px;font-weight:700">↺ RESET</button>
    </div>
    <div class="mt-12" id="cpr-steps-adult">
      <div class="font-sm bold mb-8 text-accent">CPR Steps (Adult):</div>
      <ol style="padding-left:20px;font-size:14px;line-height:2">
        <li>Check scene safety. Tap shoulder: "Are you OK?"</li>
        <li>Call 911 (or have someone call). Note time.</li>
        <li>Lay on back, tilt head back, lift chin.</li>
        <li>Check breathing for no more than 10 seconds.</li>
        <li>Place heel of hand on center of chest (between nipples).</li>
        <li>Push hard, fast: <strong>2 inches deep at 100–120/min</strong>.</li>
        <li>Allow full recoil between compressions.</li>
        <li>After 30 compressions, give 2 rescue breaths if trained.</li>
        <li>Continue until help arrives or AED is ready.</li>
      </ol>
    </div>
    <div class="mt-12" id="cpr-steps-child" style="display:none">
      <div class="font-sm bold mb-8 text-accent">CPR Steps (Child 1–8 yrs):</div>
      <ol style="padding-left:20px;font-size:14px;line-height:2">
        <li>Check scene safety. Tap shoulder: "Are you OK?"</li>
        <li>Call 911 (or have someone call).</li>
        <li>Lay on back, tilt head back gently, lift chin.</li>
        <li>Check breathing for no more than 10 seconds.</li>
        <li>Use <strong>1 or 2 hands</strong> on center of chest.</li>
        <li>Push <strong>2 inches deep at 100–120/min</strong>.</li>
        <li>Allow full recoil. 30 compressions then 2 rescue breaths.</li>
        <li>Rescue breath: cover mouth + nose; small puff until chest rises.</li>
        <li>Continue until help arrives or child responds.</li>
      </ol>
    </div>
    <div class="mt-12" id="cpr-steps-infant" style="display:none">
      <div class="font-sm bold mb-8 text-accent">CPR Steps (Infant &lt;1 yr):</div>
      <ol style="padding-left:20px;font-size:14px;line-height:2">
        <li>Flick foot gently — no response? Call 911.</li>
        <li>Lay on firm flat surface on back.</li>
        <li>Tilt head back slightly — do not hyperextend.</li>
        <li>Use <strong>2 fingers</strong> (index + middle) on center of chest just below nipple line.</li>
        <li>Push <strong>1.5 inches deep at 100–120/min</strong>.</li>
        <li>After 30 compressions: cover mouth AND nose, give 2 small gentle puffs.</li>
        <li>Continue 30:2 until help arrives.</li>
      </ol>
    </div>
  </div>

  <!-- Choking / Heimlich -->
  <div class="card" style="border:2px solid var(--red);border-radius:var(--radius-lg)">
    <div class="card-title mb-12" style="font-size:18px;font-weight:800"><span class="card-icon">🫁</span>Choking / Heimlich Maneuver</div>
    <div style="display:flex;gap:6px;margin-bottom:12px" role="group" aria-label="Choking guide mode">
      <button class="btn btn-sm" id="heimlich-adult-btn" onclick="Heimlich.show('adult')" style="background:var(--accent);color:#000;font-weight:700;padding:8px 14px">Adult/Child</button>
      <button class="btn btn-secondary btn-sm" id="heimlich-infant-btn" onclick="Heimlich.show('infant')" style="padding:8px 14px">Infant</button>
      <button class="btn btn-secondary btn-sm" id="heimlich-self-btn" onclick="Heimlich.show('self')" style="padding:8px 14px">Self</button>
    </div>
    <div id="heimlich-adult" class="font-sm" style="line-height:1.9">
      <div class="bold mb-8 text-red" style="font-size:15px;padding:8px;background:var(--red-bg);border-radius:6px">⚠️ Signs: Cannot speak, cough, or breathe. Blue lips. Hands at throat.</div>
      <ol style="padding-left:20px;line-height:2">
        <li>Ask: <strong>"Are you choking?"</strong> If they nod: tell them you'll help.</li>
        <li>Stand behind them, one foot forward for stability.</li>
        <li>Give <strong>5 firm back blows</strong> between shoulder blades with heel of hand.</li>
        <li>If object not expelled: wrap arms around waist.</li>
        <li>Make a fist, place just above navel below breastbone.</li>
        <li>Cover fist with other hand. Give <strong>5 sharp upward thrusts</strong>.</li>
        <li>Alternate 5 back blows + 5 abdominal thrusts until cleared or person loses consciousness.</li>
        <li>If unconscious: lower to floor, call 911, begin CPR.</li>
      </ol>
    </div>
    <div id="heimlich-infant" class="font-sm" style="display:none;line-height:1.9">
      <div class="bold mb-8 text-red" style="font-size:15px;padding:8px;background:var(--red-bg);border-radius:6px">⚠️ Signs: Weak/silent cry, weak cough, turning blue.</div>
      <ol style="padding-left:20px;line-height:2">
        <li>Call 911 (or have someone call) immediately.</li>
        <li>Hold infant face-down on your forearm, head lower than body.</li>
        <li>Give <strong>5 firm back blows</strong> between shoulder blades with heel of hand.</li>
        <li>Flip infant face-up on your forearm, head lower.</li>
        <li>Use 2 fingers on chest (below nipple line): give <strong>5 chest thrusts</strong>.</li>
        <li>Check mouth for visible object — only remove if you can clearly see it.</li>
        <li>Alternate 5 back blows + 5 chest thrusts until cleared or infant becomes unconscious.</li>
        <li>If unconscious: begin infant CPR.</li>
      </ol>
    </div>
    <div id="heimlich-self" class="font-sm" style="display:none;line-height:1.9">
      <div class="bold mb-8 text-red" style="font-size:15px;padding:8px;background:var(--red-bg);border-radius:6px">⚠️ If you are alone and choking:</div>
      <ol style="padding-left:20px;line-height:2">
        <li>Try to call 911 first if possible — stay on the line.</li>
        <li>Try to cough forcefully.</li>
        <li>Make a fist: place just above your navel.</li>
        <li>Cover with other hand; thrust sharply inward and upward.</li>
        <li>OR lean over a hard chair back or counter edge and thrust your upper abdomen against it.</li>
        <li>Repeat until object is dislodged.</li>
      </ol>
    </div>
  </div>

  <!-- Vital Signs -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">📊</span>Normal Vital Signs</div>
    <table class="vital-table">
      <thead>
        <tr><th>Vital Sign</th><th>Adult Normal</th><th>Child (5–12)</th><th>Infant (&lt;1yr)</th></tr>
      </thead>
      <tbody>
        <tr><td>Heart Rate</td><td>60–100 bpm</td><td>70–120 bpm</td><td>100–160 bpm</td></tr>
        <tr><td>Breathing</td><td>12–20 /min</td><td>18–30 /min</td><td>30–60 /min</td></tr>
        <tr><td>Temperature</td><td>97–99°F / 36–37.2°C</td><td>Same</td><td>97.9–100.4°F</td></tr>
        <tr><td>Blood Pressure</td><td>90–120 / 60–80 mmHg</td><td>Lower normal</td><td>60–90 / 30–60</td></tr>
        <tr><td>O2 Saturation</td><td>95–100%</td><td>95–100%</td><td>95–100%</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Emergency Signs -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🚨</span>Call 911 Immediately For</div>
    <div class="grid-2 font-sm gap-8">
      <div class="card" style="padding:10px;background:var(--red-bg);border-color:var(--red)">
        <div class="bold text-red mb-8">🧠 Stroke (FAST)</div>
        <div><strong>F</strong>ace drooping</div>
        <div><strong>A</strong>rm weakness</div>
        <div><strong>S</strong>peech difficulty</div>
        <div><strong>T</strong>ime to call 911</div>
        <div class="text-muted mt-8 font-xs">Note time symptoms started — treatment depends on it.</div>
      </div>
      <div class="card" style="padding:10px;background:var(--red-bg);border-color:var(--red)">
        <div class="bold text-red mb-8">❤️ Heart Attack</div>
        <div>Chest pressure/squeezing</div>
        <div>Pain to arm/jaw/back</div>
        <div>Shortness of breath</div>
        <div>Cold sweat, nausea</div>
        <div class="text-muted mt-8 font-xs">Chew aspirin only if dispatcher says to.</div>
      </div>
      <div class="card" style="padding:10px;background:var(--red-bg);border-color:var(--red)">
        <div class="bold text-red mb-8">🌡️ Heat Emergency</div>
        <div>Confusion, hot dry skin</div>
        <div>Dangerously high temp</div>
        <div>Fainting, rapid pulse</div>
        <div class="text-muted mt-8 font-xs">Cool immediately while waiting for help.</div>
      </div>
      <div class="card" style="padding:10px;background:var(--red-bg);border-color:var(--red)">
        <div class="bold text-red mb-8">🥶 Hypothermia</div>
        <div>Unstoppable shivering</div>
        <div>Slurred speech</div>
        <div>Clumsiness, drowsiness</div>
        <div class="text-muted mt-8 font-xs">Get dry, warm slowly, call for help.</div>
      </div>
    </div>
  </div>

  <!-- Wound Care -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🩹</span>Wound Care</div>
    <ol style="padding-left:20px;font-size:14px;line-height:2">
      <li>Wash hands or use gloves before touching a wound.</li>
      <li>Apply firm, continuous pressure with clean cloth — do not lift to check for 10 min.</li>
      <li>If cloth soaks through, add more on top. Don't remove.</li>
      <li>Elevate the injured area above heart level if possible.</li>
      <li>Once bleeding slows, clean wound with clean water under pressure.</li>
      <li>Cover with clean bandage. Change if it gets wet or dirty.</li>
      <li>Signs of infection (days later): increasing redness, warmth, swelling, pus, red streaks, fever — seek medical help.</li>
    </ol>
    <div class="info-box mt-12">For arterial bleeding (bright red, spurting): apply tourniquet 2–3 inches above wound. Note the time. Do not remove. Get to medical help immediately.</div>
  </div>

  <!-- Medication Tracker -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">💊</span>Medication Tracker</div>
      <button class="btn btn-secondary btn-sm" onclick="Medical.addMed()">+ Add</button>
    </div>
    <div id="med-list">
      <div class="text-secondary font-sm">No medications tracked.</div>
    </div>
    <div id="med-add-form" class="hidden mt-12">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Person</label>
          <input class="form-input" id="med-person" maxlength="60" placeholder="Name">
        </div>
        <div class="form-group">
          <label class="form-label">Medication</label>
          <input class="form-input" id="med-name" maxlength="60" placeholder="Drug name + dose">
        </div>
        <div class="form-group">
          <label class="form-label">Schedule</label>
          <input class="form-input" id="med-sched" maxlength="500" placeholder="e.g. twice daily with food">
        </div>
        <div class="form-group">
          <label class="form-label">Supply (days)</label>
          <input class="form-input" id="med-supply" type="number" placeholder="30">
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Medical.saveMed()">Save</button>
      <button class="btn btn-secondary btn-sm" onclick="Medical.closeMedForm()">Cancel</button>
    </div>
  </div>

  <!-- Emergency Medical Card -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🪪</span>Emergency Medical Card Generator</div>
    <div class="info-box">Generate a printable card with blood type, allergies, and medications for each household member.</div>
    <div id="med-card-preview"></div>
    <button class="btn btn-secondary btn-sm mt-8" onclick="Medical.generateCards()">Generate Cards</button>
  </div>
</div><!-- /tab-medical -->

<!-- === TAB: MAP === -->
<div class="tab-panel" id="tab-map" role="tabpanel" aria-labelledby="navtab-map" tabindex="-1">

  <div class="flex-between mb-12 wrap gap-8">
    <h2 class="section-title"><span class="title-icon">🗺️</span>Local Map</h2>
    <div id="gps-coords" class="font-sm text-muted">GPS: waiting...</div>
  </div>

  <div class="card">
    <div class="map-toolbar">
      <span class="map-btn active" onclick="MapTool.setMode('select',this)" title="Pan/select mode">👆 Select</span>
      <span class="map-btn" onclick="MapTool.setMode('meeting',this)" title="Drop a meeting point">📍 Meeting</span>
      <span class="map-btn" onclick="MapTool.setMode('water',this)" title="Mark a water source">💧 Water</span>
      <span class="map-btn" onclick="MapTool.setMode('shelter',this)" title="Mark a shelter">🏠 Shelter</span>
      <span class="map-btn" onclick="MapTool.setMode('hazard',this)" title="Mark a hazard">⚠️ Hazard</span>
      <span class="map-btn" onclick="MapTool.setMode('medical',this)" title="Mark a medical site">🏥 Medical</span>
      <span style="margin-left:auto;display:flex;gap:4px">
        <span class="map-btn" id="map-btn-zoomin" onclick="MapTool.zoomIn()" title="Zoom in" aria-label="Zoom in">＋</span>
        <span class="map-btn" id="map-btn-zoomout" onclick="MapTool.zoomOut()" title="Zoom out" aria-label="Zoom out">－</span>
        <span class="map-btn" id="map-btn-locate" onclick="MapTool.locateMe()" title="Center on my GPS location" aria-label="Center on my GPS location">🎯 Me</span>
        <span class="map-btn" id="map-btn-cache" onclick="MapTool.preCacheArea()" title="Cache nearby tiles for offline use" aria-label="Cache nearby tiles for offline use">📥 Cache Area</span>
        <span class="map-btn" onclick="MapTool.clearAll()" title="Remove all markers">🗑️</span>
        <span class="map-btn" onclick="MapTool.exportImg()" title="Save map as image">💾</span>
      </span>
    </div>
    <canvas class="w-full" id="map-canvas" width="860" height="500" style="border-radius:var(--radius-md)"></canvas>
    <div class="font-xs text-muted mt-8">Click to place markers. Scroll to zoom. Tiles cached locally after first load — works offline once visited.</div>
  </div>

  <!-- Map Tools -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title mb-8"><span class="card-icon">📐</span>Distance & Bearing</div>
      <div class="form-group">
        <label class="form-label">Point A (lat, lon)</label>
        <div style="display:flex;gap:6px">
          <input class="form-input" id="dist-a" placeholder="37.7749, -122.4194" style="flex:1">
          <button class="btn btn-ghost btn-sm" onclick="MapTool.fillDistPoint('dist-a')" title="Fill from GPS" style="flex-shrink:0;white-space:nowrap">📍 Me</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Point B (lat, lon)</label>
        <div style="display:flex;gap:6px">
          <input class="form-input" id="dist-b" placeholder="37.7849, -122.4094" style="flex:1">
          <button class="btn btn-ghost btn-sm" onclick="MapTool.fillDistPoint('dist-b')" title="Fill from GPS" style="flex-shrink:0;white-space:nowrap">📍 Me</button>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="MapTool.calcDistance()">Calculate</button>
      <div id="dist-result" class="font-sm text-secondary mt-8" style="line-height:1.6"></div>
    </div>
    <div class="card">
      <div class="card-title mb-8"><span class="card-icon">🧭</span>Compass & Bearing</div>
      <div style="font-size:48px;text-align:center;padding:10px;line-height:1"><span id="compass-display" style="display:inline-block;transition:transform 0.3s ease">🧭</span></div>
      <div id="compass-heading" class="text-center font-sm text-secondary">Heading: --°</div>
      <button class="btn btn-secondary btn-sm mt-8 btn-block" onclick="MapTool.startCompass()">Use Device Compass</button>
    </div>
  </div>

  <!-- Saved Locations -->
  <div class="card">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">📌</span>Saved Locations</div>
      <button class="btn btn-ghost btn-sm" onclick="MapTool.openLocationForm()">+ Add Manual</button>
    </div>
    <div id="saved-locations">
      <div class="text-secondary font-sm" style="padding:12px 0;text-align:center">No locations saved — tap the map or use Add Location</div>
    </div>
  </div>
</div><!-- /tab-map -->

<!-- === TAB: RADIO === -->
<div class="tab-panel" id="tab-radio" role="tabpanel" aria-labelledby="navtab-radio" tabindex="-1">

  <h2 class="section-title"><span class="title-icon">📻</span>Radio Reference</h2>

  <!-- Band / Region filter bar -->
  <div class="map-toolbar" id="radio-filter-bar" role="toolbar" aria-label="Filter radio reference cards">
    <button class="map-btn active" data-radio-filter="all" onclick="Radio.setFilter('all',this)">All</button>
    <button class="map-btn" data-radio-filter="weather" onclick="Radio.setFilter('weather',this)">🌪️ Weather</button>
    <button class="map-btn" data-radio-filter="emergency" onclick="Radio.setFilter('emergency',this)">🚨 Emergency</button>
    <button class="map-btn" data-radio-filter="frs" onclick="Radio.setFilter('frs',this)">📱 FRS/CB</button>
    <button class="map-btn" data-radio-filter="ham" onclick="Radio.setFilter('ham',this)">🏠 Ham</button>
    <button class="map-btn" data-radio-filter="mesh" onclick="Radio.setFilter('mesh',this)">🕸️ Mesh</button>
    <button class="map-btn" data-radio-filter="reference" onclick="Radio.setFilter('reference',this)">📖 Reference</button>
  </div>

  <!-- NOAA Weather -->
  <div class="card" data-radio-band="weather">
    <div class="card-title mb-12"><span class="card-icon">🌪️</span>NOAA Weather Radio (US)</div>
    <table class="freq-table">
      <thead><tr><th>Frequency (MHz) <span style="font-weight:400;opacity:.6">(tap to copy)</span></th><th>Coverage Area</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td class="monospace bold text-accent freq-copyable" onclick="Radio.copyFreq('162.400 MHz',this)" title="Tap to copy">162.400<span class="copy-hint">📋</span></td><td>Primary nationwide</td><td>Most common</td></tr>
        <tr><td class="monospace bold text-accent freq-copyable" onclick="Radio.copyFreq('162.425 MHz',this)" title="Tap to copy">162.425<span class="copy-hint">📋</span></td><td>Alternative</td><td></td></tr>
        <tr><td class="monospace bold text-accent freq-copyable" onclick="Radio.copyFreq('162.450 MHz',this)" title="Tap to copy">162.450<span class="copy-hint">📋</span></td><td>Alternative</td><td></td></tr>
        <tr><td class="monospace bold text-accent freq-copyable" onclick="Radio.copyFreq('162.475 MHz',this)" title="Tap to copy">162.475<span class="copy-hint">📋</span></td><td>Alternative</td><td></td></tr>
        <tr><td class="monospace bold text-accent freq-copyable" onclick="Radio.copyFreq('162.500 MHz',this)" title="Tap to copy">162.500<span class="copy-hint">📋</span></td><td>Alternative</td><td></td></tr>
        <tr><td class="monospace bold text-accent freq-copyable" onclick="Radio.copyFreq('162.525 MHz',this)" title="Tap to copy">162.525<span class="copy-hint">📋</span></td><td>Alternative</td><td></td></tr>
        <tr><td class="monospace bold text-accent freq-copyable" onclick="Radio.copyFreq('162.550 MHz',this)" title="Tap to copy">162.550<span class="copy-hint">📋</span></td><td>Alternative</td><td>Second most common</td></tr>
      </tbody>
    </table>
    <div class="info-box mt-8">Most NOAA-capable weather radios and many handheld radios receive these frequencies. Always scan all 7 channels for the strongest signal.</div>
  </div>

  <!-- Emergency Frequencies -->
  <div class="card" data-radio-band="emergency">
    <div class="card-title mb-12"><span class="card-icon">🚨</span>Emergency Broadcast Frequencies</div>
    <table class="freq-table">
      <thead><tr><th>Service</th><th>Frequency <span style="font-weight:400;opacity:.6">(tap to copy)</span></th><th>Use</th></tr></thead>
      <tbody>
        <tr><td>AM Emergency Broadcast</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('640 / 1240 kHz',this)" title="Tap to copy">640 / 1240 kHz<span class="copy-hint">📋</span></td><td>EAS primary stations</td></tr>
        <tr><td>International Distress (HF)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('2182 kHz',this)" title="Tap to copy">2182 kHz<span class="copy-hint">📋</span></td><td>Marine/aviation distress</td></tr>
        <tr><td>Marine Channel 16 — Distress &amp; Calling <span class="badge badge-red" style="font-size:10px;padding:1px 5px;vertical-align:middle">PRIORITY</span></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('156.800 MHz',this)" title="Tap to copy">156.800 MHz<span class="copy-hint">📋</span></td><td>International distress / calling</td></tr>
        <tr><td>Aviation Distress</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('121.5 MHz',this)" title="Tap to copy">121.5 MHz<span class="copy-hint">📋</span></td><td>Guard frequency</td></tr>
        <tr><td>FEMA IPAWS / Federal Interop</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('155.340 MHz',this)" title="Tap to copy">155.340 MHz<span class="copy-hint">📋</span></td><td>FEMA IPAWS &amp; federal coordination</td></tr>
        <tr><td>National Calling (Ham 2m)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('146.520 MHz',this)" title="Tap to copy">146.520 MHz<span class="copy-hint">📋</span></td><td>Ham radio simplex calling</td></tr>
        <tr><td>National Calling (Ham 70cm)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('446.000 MHz',this)" title="Tap to copy">446.000 MHz<span class="copy-hint">📋</span></td><td>Ham radio simplex calling</td></tr>
      </tbody>
    </table>
  </div>

  <!-- FRS/GMRS/CB -->
  <div class="card" data-radio-band="frs">
    <div class="card-title mb-12"><span class="card-icon">📱</span>FRS / GMRS / CB (License-Free Emergency Use)</div>
    <div class="grid-2 gap-8">
      <div>
        <div class="font-sm bold mb-8">FRS Channels (462-467 MHz)</div>
        <table class="freq-table">
          <thead><tr><th>Ch</th><th>Frequency</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><b>1</b></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('462.5625 MHz',this)" title="Tap to copy">462.5625<span class="copy-hint">📋</span></td><td>Common calling</td></tr>
            <tr><td><b>7</b></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('462.7125 MHz',this)" title="Tap to copy">462.7125<span class="copy-hint">📋</span></td><td>Common secondary</td></tr>
            <tr><td><b>16</b></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('462.5500 MHz',this)" title="Tap to copy">462.5500<span class="copy-hint">📋</span></td><td>Interop/emergency</td></tr>
            <tr><td><b>22</b></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('462.7250 MHz',this)" title="Tap to copy">462.7250<span class="copy-hint">📋</span></td><td>GMRS calling</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <div class="font-sm bold mb-8">CB Radio</div>
        <table class="freq-table">
          <tbody>
            <tr><td><b>Ch 9</b></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('27.065 MHz',this)" title="Tap to copy">27.065 MHz<span class="copy-hint">📋</span></td><td class="text-red bold">Emergency/Distress</td></tr>
            <tr><td><b>Ch 19</b></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('27.185 MHz',this)" title="Tap to copy">27.185 MHz<span class="copy-hint">📋</span></td><td>Highway/Trucker</td></tr>
            <tr><td><b>Ch 1</b></td><td class="monospace freq-copyable" onclick="Radio.copyFreq('26.965 MHz',this)" title="Tap to copy">26.965 MHz<span class="copy-hint">📋</span></td><td>Calling channel</td></tr>
          </tbody>
        </table>
        <div class="font-xs text-muted mt-8">CB channel 9 is monitored for emergencies in many areas.</div>
      </div>
    </div>
  </div>

  <!-- Ham Emergency -->
  <div class="card" data-radio-band="ham">
    <div class="card-title mb-12"><span class="card-icon">🏠</span>ARES/RACES Emergency Coordination</div>
    <table class="freq-table">
      <thead><tr><th>Band</th><th>Simplex <span style="font-weight:400;opacity:.6">(tap to copy)</span></th><th>Repeater Output</th><th>Use</th></tr></thead>
      <tbody>
        <tr><td>2m (146 MHz)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('146.520 MHz',this)" title="Tap to copy">146.520<span class="copy-hint">📋</span></td><td>146.000–148.000</td><td>Primary emergency net</td></tr>
        <tr><td>70cm (446 MHz)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('446.000 MHz',this)" title="Tap to copy">446.000<span class="copy-hint">📋</span></td><td>440.000–450.000</td><td>Secondary/urban</td></tr>
        <tr><td>HF 40m</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('7.285 MHz',this)" title="Tap to copy">7.285 MHz<span class="copy-hint">📋</span></td><td>—</td><td>Regional emergency net</td></tr>
        <tr><td>HF 80m</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('3.985 MHz',this)" title="Tap to copy">3.985 MHz<span class="copy-hint">📋</span></td><td>—</td><td>Local/regional</td></tr>
        <tr><td>HF 20m</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('14.300 MHz',this)" title="Tap to copy">14.300 MHz<span class="copy-hint">📋</span></td><td>—</td><td>International distress</td></tr>
      </tbody>
    </table>
    <div class="info-box mt-8">ARES (Amateur Radio Emergency Service) and RACES coordinate with emergency management. A licensed ham operator can relay traffic through these nets.</div>
  </div>

  <!-- Meshtastic -->
  <div class="card" data-radio-band="mesh">
    <div class="card-header mb-12">
      <div class="card-title"><span class="card-icon">🕸️</span>Meshtastic Default Channels</div>
      <span class="badge badge-yellow" id="meshtastic-status-radio">Not connected</span>
    </div>
    <table class="freq-table">
      <thead><tr><th>Region</th><th>Frequency <span style="font-weight:400;opacity:.6">(tap to copy)</span></th><th>Bandwidth</th><th>Spread Factor</th></tr></thead>
      <tbody>
        <tr><td>US (915 MHz)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('906.875 MHz',this)" title="Tap to copy">906.875 MHz<span class="copy-hint">📋</span></td><td>250 kHz</td><td>SF11</td></tr>
        <tr><td>EU (868 MHz)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('869.525 MHz',this)" title="Tap to copy">869.525 MHz<span class="copy-hint">📋</span></td><td>250 kHz</td><td>SF11</td></tr>
        <tr><td>AU (915 MHz)</td><td class="monospace freq-copyable" onclick="Radio.copyFreq('917.000 MHz',this)" title="Tap to copy">917.000 MHz<span class="copy-hint">📋</span></td><td>125 kHz</td><td>SF12</td></tr>
      </tbody>
    </table>
    <div class="info-box mt-8">Meshtastic is an open-source LoRa mesh radio system. Devices can carry text messages several miles without cell towers or internet. Connect a Meshtastic device to the ARK hub server to relay mesh traffic.</div>
  </div>

  <!-- Phonetic Alphabet -->
  <div class="card" data-radio-band="reference">
    <div class="card-title mb-12"><span class="card-icon">🔤</span>NATO Phonetic Alphabet</div>
    <div class="phonetic-grid" id="phonetic-grid">
      <!-- filled by JS -->
    </div>
  </div>

  <!-- Morse Code -->
  <div class="card" data-radio-band="reference">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">· — ·</span>Morse Code</div>
      <div class="flex gap-8" style="align-items:center;flex-wrap:wrap">
        <input class="form-input" id="morse-input" style="width:150px" placeholder="SOS" maxlength="30" aria-label="Text to convert to Morse code" oninput="Radio.updateEncodeOutput()">
        <button class="btn btn-primary btn-sm" id="morse-play-btn" onclick="Radio.playMorse()">▶ Play</button>
        <button class="btn btn-secondary btn-sm" onclick="Radio.stopMorse()" aria-label="Stop Morse playback">⏹ Stop</button>
        <label class="font-xs text-muted" style="display:flex;align-items:center;gap:4px">
          Speed:
          <select id="morse-speed" class="form-input" style="padding:3px 6px;font-size:12px;width:auto" aria-label="Morse playback speed">
            <option value="0.18">Slow</option>
            <option value="0.1" selected>Medium</option>
            <option value="0.06">Fast</option>
          </select>
        </label>
        <span id="morse-status">● Playing…</span>
      </div>
    </div>
    <!-- Encoder output -->
    <div id="morse-encode-output" style="display:none;margin-top:10px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-family:monospace;font-size:1.05em;letter-spacing:0.08em;color:var(--accent);word-break:break-all"></div>
    <div class="morse-chart" id="morse-chart">
      <!-- filled by JS -->
    </div>
    <div id="morse-flash" style="display:none; height:40px; background:var(--accent); opacity:0.7; border-radius:6px; margin-top:8px; transition:opacity 0.05s;"></div>
    <div class="info-box mt-12">SOS = · · · — — — · · ·   |   Always repeat SOS three times with a gap between each set.</div>
    <!-- Decode section -->
    <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
      <div class="font-sm bold mb-8">Decode Incoming Morse</div>
      <div class="font-xs text-muted mb-6">Separate letters with spaces, words with <code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px"> / </code> — e.g. <code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px">... --- ...</code> or <code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px">.... . .-.. .-.. --- / .-- --- .-. .-.. -..</code></div>
      <div class="flex gap-8 wrap">
        <textarea id="morse-decode-input" class="form-input" rows="2" placeholder="... --- ..." style="flex:1;min-width:160px;resize:vertical;font-family:monospace" aria-label="Morse code to decode"></textarea>
        <button class="btn btn-secondary btn-sm" onclick="Radio.decodeMorse()" style="align-self:flex-end">🔍 Decode</button>
      </div>
      <div id="morse-decode-output" style="display:none;margin-top:8px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-family:monospace;font-size:1.1em;letter-spacing:0.05em"></div>
    </div>
  </div>

  <!-- Q-Codes -->
  <div class="card" data-radio-band="reference">
    <div class="card-title mb-12"><span class="card-icon">📖</span>Common Q-Codes</div>
    <table class="freq-table">
      <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td class="bold monospace">QRN</td><td>Atmospheric/static noise interfering</td></tr>
        <tr><td class="bold monospace">QRM</td><td>Man-made interference</td></tr>
        <tr><td class="bold monospace">QRZ</td><td>Who is calling me?</td></tr>
        <tr><td class="bold monospace">QSB</td><td>Signal fading</td></tr>
        <tr><td class="bold monospace">QSL</td><td>I confirm / acknowledged</td></tr>
        <tr><td class="bold monospace">QSO</td><td>Communication with another station</td></tr>
        <tr><td class="bold monospace">QSY</td><td>Change to another frequency</td></tr>
        <tr><td class="bold monospace">QTH</td><td>My location is...</td></tr>
        <tr><td class="bold monospace">QRU</td><td>I have nothing for you</td></tr>
        <tr><td class="bold monospace">QRV</td><td>I am ready</td></tr>
        <tr><td class="bold monospace">QRP</td><td>Low power operation</td></tr>
        <tr><td class="bold monospace">QRO</td><td>High power operation</td></tr>
      </tbody>
    </table>
  </div>

  <!-- RST Signal Report -->
  <div class="card" data-radio-band="reference">
    <div class="card-title mb-12"><span class="card-icon">📶</span>RST Signal Report System</div>
    <div class="grid-2 font-sm gap-8">
      <div>
        <div class="bold mb-8">Readability (1–5)</div>
        <div>1 — Unreadable</div>
        <div>2 — Barely readable</div>
        <div>3 — Readable with difficulty</div>
        <div>4 — Readable with no difficulty</div>
        <div>5 — Perfectly readable</div>
      </div>
      <div>
        <div class="bold mb-8">Signal Strength (1–9)</div>
        <div>1 — Faint, barely perceptible</div>
        <div>3 — Weak</div>
        <div>5 — Fairly good</div>
        <div>7 — Moderately strong</div>
        <div>9 — Extremely strong</div>
      </div>
    </div>
    <div class="info-box mt-8">Common reports: "59" = perfectly readable, extremely strong. "33" = barely readable, weak. In an emergency, give a quick RST before asking for help.</div>
  </div>

  <!-- Personal Frequency Logbook -->
  <div class="card">
    <div class="card-header mb-12">
      <div class="card-title"><span class="card-icon">📒</span>My Channels</div>
      <button class="btn btn-primary btn-sm" onclick="FreqLog.openAdd()">+ Add</button>
    </div>
    <div id="freq-log-empty" class="font-sm text-muted" style="text-align:center;padding:16px 0">No frequencies logged yet. Add your group's local frequencies here.</div>
    <table class="freq-table" id="freq-log-table" style="display:none">
      <thead><tr><th>Name</th><th>Frequency</th><th>Notes</th><th>Added</th><th style="width:60px"></th></tr></thead>
      <tbody id="freq-log-body"></tbody>
    </table>
    <!-- Add/Edit form (inline, hidden by default) -->
    <div id="freq-log-form" style="display:none;margin-top:12px;background:var(--bg-secondary);border-radius:8px;padding:12px">
      <div class="font-sm bold mb-8" id="freq-log-form-title">Add Channel</div>
      <input type="hidden" id="freq-log-edit-idx" value="-1">
      <div class="flex gap-8 wrap">
        <input class="form-input" id="freq-log-name" placeholder="Name / Callsign" maxlength="40" style="flex:1;min-width:120px" aria-label="Channel name">
        <input class="form-input" id="freq-log-freq" placeholder="Frequency (e.g. 146.520)" maxlength="20" style="flex:1;min-width:120px" aria-label="Frequency">
        <input class="form-input" id="freq-log-notes" placeholder="Notes (optional)" maxlength="80" style="flex:2;min-width:160px" aria-label="Notes">
      </div>
      <div class="flex gap-8 mt-8" style="align-items:center">
        <button class="btn btn-primary btn-sm" onclick="FreqLog.save()">💾 Save</button>
        <button class="btn btn-secondary btn-sm" onclick="FreqLog.cancelForm()">Cancel</button>
        <span class="font-xs text-muted" id="freq-log-ts-note" style="display:none">Timestamp auto-set on save</span>
      </div>
    </div>
    <div class="flex gap-8 mt-12" style="justify-content:flex-end">
      <button onclick="FreqLog.exportCSV()" class="btn btn-sm btn-secondary">📊 Export CSV</button>
      <button onclick="FreqLog.exportJSON()" class="btn btn-sm btn-secondary">📋 Export JSON</button>
    </div>
  </div>
</div><!-- /tab-radio -->

<!-- === TAB: SETTINGS === -->
<div class="tab-panel" id="tab-settings" role="tabpanel" aria-labelledby="navtab-settings" tabindex="-1">

  <h2 class="section-title"><span class="title-icon">⚙️</span>Settings</h2>

  <!-- Connection -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🌐</span>Connection</div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Hub URL</div>
        <div class="setting-desc">Address of the ARK hub server on your local network</div>
      </div>
      <input class="form-input" id="set-hub-url" maxlength="500" style="width:220px" placeholder="http://10.42.0.1:8080" aria-label="Hub URL">
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Auto-sync interval</div>
        <div class="setting-desc">How often to check for new messages</div>
      </div>
      <select class="form-input" id="set-sync-interval" style="width:150px">
        <option value="30">30 seconds</option>
        <option value="60" selected>1 minute</option>
        <option value="300">5 minutes</option>
        <option value="0">Manual only</option>
      </select>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Offline mode</div>
        <div class="setting-desc">Force offline — don't attempt hub connections</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="set-offline-mode" onchange="Settings.toggleOffline()">
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  <!-- Identity -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">👤</span>Identity</div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Default Alias</div>
        <div class="setting-desc">Your name on message boards</div>
      </div>
      <input class="form-input" id="set-alias" style="width:180px" placeholder="Anonymous" maxlength="40" aria-label="Default alias">
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Household ID</div>
        <div class="setting-desc">Unique identifier for your household</div>
      </div>
      <div class="flex gap-8" style="align-items:center">
        <input class="form-input" id="set-hh-id" style="width:140px" readonly aria-label="Household ID">
        <button class="btn btn-ghost btn-sm" onclick="Settings.regenHHID()">↺ Regen</button>
      </div>
    </div>
  </div>

  <!-- Display -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">🎨</span>Display</div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Font Size</div>
        <div class="setting-desc">Applies to all text in the app</div>
      </div>
      <select class="form-input" id="set-font-size" style="width:150px" onchange="Settings.applyFontSize()">
        <option value="14">Small</option>
        <option value="16" selected>Normal</option>
        <option value="18">Large</option>
        <option value="20">Extra Large</option>
      </select>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">🌙 Dark Mode</div>
        <div class="setting-desc">Dark background — easier on the eyes at night</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="set-dark-mode" onchange="Settings.toggleDarkMode()">
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">High Contrast Mode</div>
        <div class="setting-desc">Increase contrast for readability</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="set-high-contrast" onchange="Settings.toggleContrast()">
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Developer Mode</div>
        <div class="setting-desc">Show raw API responses in console</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="set-dev-mode">
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">🔋 Low-Power Mode</div>
        <div class="setting-desc">Slow sync to 5 min, reduce animations — saves battery</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="set-low-power" onchange="Settings.toggleLowPower()">
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  <!-- Data Management -->
  <div class="card">
    <div class="card-title mb-12"><span class="card-icon">💾</span>Data Management</div>
    <div id="backup-reminder" style="display:none;background:rgba(210,153,34,0.12);border:1px solid var(--yellow);border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:13px;color:var(--yellow)">
      ⚠️ <strong>Backup overdue</strong> — Your last export was <span id="backup-days-ago">more than 7 days</span> ago. Export your data now to avoid losing messages and settings.
    </div>
    <div class="flex gap-8 wrap">
      <button class="btn btn-secondary btn-sm" onclick="Settings.exportAll()">📤 Export All Data</button>
      <button class="btn btn-secondary btn-sm" onclick="Settings.importAll()">📥 Import Data</button>
      <button class="btn btn-ghost btn-sm" onclick="Settings.clearCache()">🗑️ Clear Cache</button>
      <button class="btn btn-red btn-sm" onclick="Settings.clearAll()">⚠️ Wipe All Data</button>
    </div>
    <div id="set-storage-info" class="font-xs text-muted mt-12">Calculating storage usage...</div>
    <div id="set-last-save" class="font-xs text-muted mt-8" aria-live="polite">Last saved: nothing saved yet this session</div>
    <div id="set-last-export" class="font-xs text-muted mt-4">Last exported: never</div>
  </div>

  <!-- Save Settings -->
  <button class="btn btn-primary btn-block" onclick="Settings.save()">💾 Save All Settings</button>

  <!-- Setup Wizard re-run -->
  <div class="card mt-12">
    <div class="card-title mb-8"><span class="card-icon">🧭</span>Setup</div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Re-run Setup Wizard</div>
        <div class="setting-desc">Walk through the initial setup again to update your name, role, or hub address</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="Settings.rerunWizard()">↺ Setup Wizard</button>
    </div>
  </div>

  <!-- App / Install -->
  <div class="card mt-12">
    <div class="card-title mb-12"><span class="card-icon">📲</span>App</div>
    <div class="setting-row" id="pwa-install-row" style="display:none">
      <div>
        <div class="setting-label">Install to Home Screen</div>
        <div class="setting-desc">Add ARK as an app for one-tap offline access</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="installPWA()">📲 Install</button>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Alert Notifications</div>
        <div class="setting-desc">Allow browser notifications for critical alerts</div>
      </div>
      <button class="btn btn-secondary btn-sm" id="set-notif-btn" onclick="Settings.requestNotifications()">Enable</button>
    </div>
  </div>

  <!-- Report Issue / Updates -->
  <div class="card mt-12">
    <div class="card-header">
      <div class="card-title"><span class="card-icon">🔧</span>App Issues &amp; Updates</div>
    </div>
    <div class="font-sm text-secondary mb-12" style="line-height:1.5">Something not working? Report it and check for fixes.</div>
    <div class="flex gap-8 flex-wrap">
      <button class="btn btn-secondary btn-sm" onclick="UI.switchTab('network');setTimeout(()=>document.getElementById('bug-report-text')?.focus(),150)">🐛 Report a Bug</button>
      <button class="btn btn-secondary btn-sm" onclick="Network.checkForUpdates()">🔄 Check for Updates</button>
    </div>
    <div id="settings-patch-status" class="font-xs text-muted mt-8"></div>
  </div>

  <!-- About -->
  <div class="card mt-12">
    <div class="card-title mb-8"><span class="card-icon">ℹ️</span>About ARK Crisis Suite</div>
    <div class="font-sm text-secondary" style="line-height:1.8">
      <div><strong>Version:</strong> 1.0.0 (2026-11-15)</div>
      <div><strong>Format:</strong> Single-file offline HTML application</div>
      <div><strong>Works on:</strong> Chrome, Firefox, Safari, Edge — Windows, Mac, Linux, Android, iOS</div>
      <div><strong>No internet required</strong> — all data stored locally in your browser</div>
      <hr class="divider">
      <div><strong>Guidance sources:</strong> Ready.gov, CDC, FEMA, USDA, National Weather Service, American Red Cross (checked 2026-11-14)</div>
      <div class="text-muted mt-8">Not reviewed by a clinician. Not a substitute for professional medical or emergency services.</div>
      <div class="mt-8">In a life-threatening emergency: <span class="text-red bold">call 911</span></div>
    </div>
  </div>
</div><!-- /tab-settings -->

<!-- === TAB: AI === -->
<div class="tab-panel" id="tab-ai" role="tabpanel" aria-labelledby="navtab-ai" tabindex="-1">

  <div class="flex-between mb-12 wrap gap-8">
    <h2 class="section-title" style="margin:0"><span class="title-icon">🤖</span>AI Assistant</h2>
    <span id="halo-mode-badge" class="badge badge-green font-xs ai-mode-pill">✓ HALO Lite — offline ready</span>
  </div>

  <!-- Chat UI — always visible, HALO Lite works instantly -->
  <div id="ai-chat-section">
    <div class="card mb-8" style="padding:0;overflow:hidden">
      <div id="ai-messages" style="height:320px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px">
        <div class="ai-msg ai-msg-sys">
          👋 I'm HALO — your offline crisis assistant. Ask me anything about first aid, water, survival, shelter, or your stored data. No download required.
        </div>
      </div>
    </div>

    <!-- Context injector -->
    <div class="flex gap-6 mb-6 wrap">
      <button class="btn btn-ghost btn-sm" id="ai-ctx-btn-medical" onclick="ARKai.injectContext('medical')" title="Feed me the medical reference data">💊 Medical</button>
      <button class="btn btn-ghost btn-sm" id="ai-ctx-btn-inventory" onclick="ARKai.injectContext('inventory')" title="Tell AI about your current inventory">📦 Inventory</button>
      <button class="btn btn-ghost btn-sm" id="ai-ctx-btn-household" onclick="ARKai.injectContext('household')" title="Tell AI about your household members">🏘️ Household</button>
      <button class="btn btn-ghost btn-sm" id="ai-ctx-btn-situation" onclick="ARKai.injectContext('situation')" title="Set current alert level as context">⚠️ Situation</button>
      <button class="btn btn-secondary btn-sm" onclick="ARKai.clearChat()" title="Start a new conversation">🗑️ Clear</button>
    </div>
    <!-- Active context badge row -->
    <div id="ai-ctx-badges" class="ai-ctx-badges"></div>

    <!-- Input -->
    <div class="flex gap-8">
      <textarea id="ai-input" class="form-input" rows="2" style="flex:1;resize:none" placeholder="Ask anything — first aid, water purification, what to do if…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ARKai.send()}"
        oninput="ARKai.onInputChange(this)"
        aria-label="AI chat input"></textarea>
      <button class="btn btn-primary" id="ai-send-btn" onclick="ARKai.send()" style="align-self:flex-end" aria-label="Send message" disabled>Send</button>
    </div>
    <div class="font-xs text-muted mt-4">Enter sends · Shift+Enter new line</div>
  </div>

  <!-- Suggested prompts -->
  <div class="card mt-12" id="ai-prompts-card">
    <div class="card-title mb-8">💡 Try asking…</div>
    <div class="flex gap-6 wrap" id="ai-prompt-chips">
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">How do I purify water without equipment?</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">Signs of dehydration in adults vs children</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">How do I treat a deep wound with no doctor?</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">What to do if someone goes into shock?</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">Heart attack signs and what to do</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">Stroke signs — FAST test</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">Severe allergic reaction / anaphylaxis treatment</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">Build a fire with no lighter or matches</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">What to do during and after an earthquake</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">I smell gas — what do I do?</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">How do I signal for help without a phone?</button>
      <button class="btn btn-ghost btn-sm" onclick="ARKai.quickPrompt(this)">Someone was bitten by a snake</button>
    </div>
  </div>

  <!-- HALO+ Upgrade — optional LLM -->
  <div class="card mt-12" id="ai-upgrade-card">
    <div class="flex-between mb-8">
      <div class="card-title" style="margin:0">🧠 HALO+ Upgrade <span class="badge badge-muted font-xs" style="vertical-align:middle">Optional</span></div>
      <span id="ai-status-badge" class="badge badge-muted">Not loaded</span>
    </div>
    <p class="font-sm text-secondary mb-8">Upgrade to a full neural language model (Llama&nbsp;3.2). Requires internet <em>once</em> to download &amp; cache (650&nbsp;MB – 1.8&nbsp;GB depending on model). After that, runs fully offline on your device. Needs Chrome&nbsp;113+ / Edge&nbsp;113+ (WebGPU).</p>
    <div class="flex gap-8 mb-8 wrap">
      <select id="ai-model-select" class="form-input" style="flex:1;min-width:180px">
        <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 1B — Fast (~650 MB)</option>
        <option value="Llama-3.2-3B-Instruct-q4f16_1-MLC">Llama 3.2 3B — Smarter (~1.8 GB)</option>
        <option value="TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC">TinyLlama 1.1B — Minimal footprint</option>
      </select>
      <button class="btn btn-primary" id="ai-load-btn" onclick="ARKai.load()">⬇ Load Model</button>
    </div>
    <div id="ai-progress-row" class="hidden">
      <div class="font-sm mb-4" id="ai-progress-label">Downloading AI model… This only happens once.</div>
      <div style="background:var(--bg-secondary);border-radius:4px;height:10px;overflow:hidden">
        <div id="ai-progress-bar" style="height:100%;background:var(--accent);width:0%;transition:width 0.3s"></div>
      </div>
      <div class="flex-between mt-4">
        <div class="font-xs text-muted" id="ai-progress-pct">0%</div>
        <div class="font-xs text-muted" id="ai-progress-mb"></div>
      </div>
    </div>
    <div class="font-xs text-muted mt-4">⚠️ Not a substitute for 911 or professional emergency services.</div>
  </div>

</div><!-- /tab-ai -->

</div><!-- /app -->

<!-- Storage warning banner (shown when storage > 80%) -->
<div id="storage-warning-banner" class="hidden" style="background:rgba(210,153,34,0.15);border-top:1px solid var(--yellow);color:var(--yellow);font-size:12px;text-align:center;padding:6px 12px;position:sticky;bottom:0;z-index:99">
  ⚠️ Storage nearly full — <button class="btn btn-ghost btn-sm font-xs" onclick="Settings.exportAll()" style="color:var(--yellow);text-decoration:underline;padding:0">back up your data</button> then clear old messages.
</div>

<!-- Storage unavailable banner (shown when localStorage cannot be used) -->
<div id="storage-unavailable-banner" class="hidden" role="alert" style="background:rgba(220,53,69,0.15);border-top:1px solid var(--danger,#dc3545);color:var(--danger,#dc3545);font-size:12px;text-align:center;padding:6px 12px;position:sticky;bottom:0;z-index:100">
  ⚠️ Browser storage is unavailable (private browsing?) — changes last only until you close this tab. <button class="btn btn-ghost btn-sm" onclick="Settings.exportAll()" style="font-size:11px;color:inherit;text-decoration:underline;padding:0">Export a backup</button> before leaving.
</div>

<!-- Toast notification -->
<div id="toast" role="status" aria-live="polite" aria-atomic="true"></div>

<!-- Hidden file inputs -->
<input type="file" id="import-file" style="display:none" accept=".json" onchange="Settings.handleImport(this)">
<input type="file" id="bundle-file" style="display:none" accept=".json" onchange="Messages.handleBundleFile(this)">

<script>
// ============================================================
// ARK CRISIS SUITE — Core Application
// Single-file offline emergency tool
// Version 1.0.0 — 2026-11-15
// ============================================================

'use strict';

// === GLOBAL ERROR BOUNDARY ===
// Catches uncaught exceptions and unhandled promise rejections so they produce
// a user-visible toast rather than dying silently in the console.
window.addEventListener('unhandledrejection', e => {
  console.error('ARK unhandled rejection:', e.reason);
  // Avoid toast noise for intentional aborts (fetch AbortController)
  if (e.reason && e.reason.name === 'AbortError') return;
  try { Toast.show('An unexpected error occurred — the app is still running', 'error', 5000); } catch(_) {}
});
window.onerror = (msg, src, line, col, err) => {
  console.error('ARK uncaught error:', msg, src, line, col, err);
  try { Toast.show('An unexpected error occurred — the app is still running', 'error', 5000); } catch(_) {}
  return false; // let the browser also log it
};

// === EMBEDDED DATA ===
const ARK_GUIDES = [
  {slug:'water-safety',category:'water',title:'Drinking water in an outage',updated:'2024-01',summary:'How much to store, exactly how to treat water you are unsure about, and when treating is pointless.',seeAlso:['water-purification','sanitation-no-water'],quickSteps:['Store at least 1 gallon (about 4 litres) per person per day for drinking and sanitation. Three days minimum, two weeks if you can.','Boil uncertain water at a rolling boil for 1 minute, or 3 minutes above roughly 6,500 ft (2,000 m). Let it cool covered before drinking.','If told to disinfect with bleach: 8 drops (about 1/8 teaspoon) of unscented 5–8.25% chlorine bleach per gallon of clear water, 16 drops if cloudy, then wait 30 minutes. It should smell faintly of chlorine.','A do-not-drink notice is different from a boil notice. If the warning is chemical, boiling concentrates it. Use bottled water or another source instead.','Never drink from radiators, hot-water heating systems, swimming pools, spas or water beds.'],sections:[{heading:'Fill up before the pressure drops',body:['Fill clean containers, the bathtub and any food-grade buckets while pressure is still available. Label each with the date and rotate stored water every six months.','A bathtub of water is for washing and flushing, not for drinking, unless you have a food-grade liner and treat it first.']},{heading:'Boiling beats everything else',body:['Boiling is the most reliable method against bacteria, viruses and parasites. A rolling boil for one minute is enough at low altitude; add two minutes above 6,500 ft.','Boiling does not remove chemicals, salt or heavy metals. If you suspect those, use bottled water or a filter certified for them.']},{heading:'Filters, tablets and bleach',body:['Use a filter rated for the contaminants you are worried about. Many camping filters handle bacteria and protozoa but not viruses; boiling or chemical treatment covers that gap.','Chlorine dioxide or iodine tablets need the contact time on the label, usually 30 minutes or more, and colder water needs longer.']},{heading:'Sanitation matters as much as drinking',body:['Reserve water for handwashing before meals and after using the toilet. Hand hygiene prevents more illness in a prolonged outage than any water treatment upgrade.','If plumbing fails, follow your local health department instructions for waste.']}],sources:[{label:'Ready.gov — Water',url:'https://www.ready.gov/water'},{label:'CDC — Make water safe during an emergency',url:'https://www.cdc.gov/water-emergency'},{label:'EPA — Emergency disinfection',url:'https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water'}]},
  {slug:'water-purification',category:'water',title:'Water purification in the field',updated:'2024-01',summary:'How to make water safe from streams, rain, ponds or unknown sources using what you have.',seeAlso:['water-safety','foraging'],quickSteps:['Never drink untreated surface water — even clear mountain streams can carry Giardia and Cryptosporidium.','Boiling is the most reliable: a full rolling boil for 1 minute (3 minutes above 6,500 ft/2,000 m). Let cool in a covered container.','If boiling is not possible, use iodine or chlorine dioxide tablets per the label — usually 30 min contact time; double in cold or cloudy water.','Portable filters (0.1–0.2 micron) remove bacteria and protozoa but NOT viruses. Combine with chemical treatment in areas with human sewage.','Solar disinfection (SODIS): fill a clear PET bottle, lay it in direct sunlight for 6 hours (12 if cloudy). Effective against bacteria and viruses.'],sections:[{heading:'Improvised filtration before purification',body:['Filtering first removes particles that protect pathogens from chemical treatment. Layer grass, crushed charcoal (not briquettes) and sand in a container with small holes — coarsest material first (grass), finest last (sand/charcoal).','This is pre-treatment only, not purification. Always follow with boiling or chemical treatment.','Let filtered water settle 30 minutes and decant the clear top before treating.']},{heading:'Disinfection by chemical method',body:['Household unscented bleach (5–8.25% sodium hypochlorite): 8 drops per gallon of clear water, 16 drops if cloudy. Wait 30 minutes. Water should have a faint chlorine smell; if not, repeat the dose and wait 15 more minutes.','Iodine tablets or chlorine dioxide tablets follow label instructions — usually 1 tablet per litre; 30–60 minutes contact time.','Chemical methods are less effective against Cryptosporidium — boiling or a 1-micron absolute filter is preferred for that.']},{heading:'Collecting and storing clean water',body:['Rain collection from roof or tarp is relatively clean — discard the first few minutes of runoff to flush contaminants.','Store treated water in food-grade, opaque containers with tight lids. Keep out of sunlight to prevent algae and reduce chlorine loss.','Label the date. Treated water stored properly stays safe about 6 months.']}],sources:[{label:'CDC — Water purification',url:'https://www.cdc.gov/healthywater/emergency/making-water-safe.html'},{label:'WHO — SODIS',url:'https://www.who.int/publications/m/item/sodis-manual'},{label:'EPA — Emergency disinfection',url:'https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water'}]},
  {slug:'food-safety',category:'food',title:'Keeping food safe without power',updated:'2024-01',summary:'The exact time and temperature limits, and how to decide what to throw out without guessing.',seeAlso:['foraging','water-safety'],quickSteps:['Keep the refrigerator and freezer closed. A closed refrigerator holds food safe for about 4 hours. A full freezer holds about 48 hours; a half-full one about 24.','Throw out perishable food that has been above 40°F (4°C) for more than 2 hours.','Never taste food to decide whether it is safe. Pathogens do not change smell, colour or texture.','Refreeze food only if it still contains ice crystals or is at or below 40°F.','Never burn charcoal, a camping stove or a generator indoors — carbon monoxide kills.'],sections:[{heading:'Make the cold last',body:['Group frozen items together and fill gaps with frozen water bottles or a block of ice. A full freezer stays cold far longer than a half-empty one.','Keep a thermometer in the refrigerator and freezer so you can read the temperature instead of guessing.']},{heading:'A cooler is a second freezer',body:['Keep raw meat below ready-to-eat food, and keep ice in sealed containers so meltwater does not contaminate anything.','Check the cooler temperature. If it rises above 40°F for more than 2 hours, treat the contents as spoiled.']},{heading:'Eating well without cooking',body:['Plan for meals that need no heat: canned beans and fish, nut butters, crackers, shelf-stable milk, dried fruit. Keep a manual can opener with the food.','Rotate the pantry every six months and eat what you store, so nothing in the kit is unfamiliar when it matters.']}],sources:[{label:'FoodSafety.gov',url:'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage'},{label:'USDA FSIS',url:'https://www.fsis.usda.gov'}]},
  {slug:'sanitation-no-water',category:'water',title:'Toilets and waste when water fails',updated:'2024-01',summary:'Keeping waste away from people, water and food when the plumbing stops working.',seeAlso:['water-safety','water-purification'],quickSteps:['Stop flushing once you know pressure is lost. Each flush wastes several gallons you may need.','Line the toilet bowl with a double plastic bag, use it, then cover with sawdust, cat litter or shredded paper and seal when about half full.','Keep waste at least 100 feet (30 m) from wells, streams, ditches and house foundations.','Wash hands with soap and treated water after every contact.','Follow your local health department instructions as soon as they publish any.'],sections:[{heading:'Set up before it is urgent',body:['Store heavy-duty bags, gloves, a lidded bucket, disinfectant and paper towels with the rest of the kit.','Decide in advance where the emergency toilet goes: away from food, sleeping areas and any water source.']},{heading:'Keep it separate',body:['Designate one container as the toilet and never use it for anything else. Keep a lid on it and keep it outside the main living space if you can.','People who are ill, pregnant, very young or immunocompromised should have the cleanest available option.']}],sources:[{label:'CDC — Sanitation in emergencies',url:'https://www.cdc.gov/sanitation/'},{label:'Ready.gov',url:'https://www.ready.gov/sanitation'}]},
  {slug:'generator-carbon-monoxide',category:'power',title:'Generators and carbon monoxide',updated:'2024-01',summary:'Carbon monoxide is invisible and kills whole households. Placement matters more than generator size.',seeAlso:['power-outage-prep','shelter-building'],quickSteps:['Run a generator outdoors only, at least 20 feet (6 m) from doors, windows and vents, with the exhaust pointing away from the building.','Never run one in a garage, basement, crawlspace, attached carport or porch, even with the door open.','Keep working carbon monoxide alarms on every level of the home and outside sleeping areas, and test them monthly.','If anyone has a headache with dizziness, nausea, weakness, chest pain or confusion, get everyone into fresh air and call 911.','Never plug a generator into a wall outlet — that backfeeds the utility line and can kill a line worker.'],sections:[{heading:'Why proximity is the whole problem',body:['Carbon monoxide from a generator can seep through a window, a vent or a wall opening even when the unit sits outside. Twenty feet with the exhaust directed away is the minimum.','Smaller spaces are more dangerous: a garage or a tent concentrates the gas. Every year people die running generators in exactly those places.']},{heading:'Alarms and detection',body:['A carbon monoxide alarm is the only reliable warning. Replace the unit by the date on the back even if it still beeps when tested.','Do not rely on the smell of exhaust. Carbon monoxide has no smell.']}],sources:[{label:'CDC — Carbon monoxide prevention',url:'https://www.cdc.gov/carbon-monoxide'},{label:'CPSC — Generator safety',url:'https://www.cpsc.gov'}]},
  {slug:'power-outage-prep',category:'power',title:'Preparing for a long power outage',updated:'2024-01',summary:'What to unplug, what to keep running, and how to make a battery last several days.',seeAlso:['generator-carbon-monoxide','communication-failure','radio-comms'],quickSteps:['Charge phones, battery banks, medical devices and any power wheelchair as soon as a warning is issued.','Keep one light, one radio and one charging method per person, and know where they are in the dark.','Unplug computers, televisions and appliances before power returns, to avoid surge damage.','Keep cash in small notes — card readers, cash machines and fuel pumps may all be down at the same time.','Report downed power lines to the utility or 911 from a safe distance.'],sections:[{heading:'Making a battery last',body:['Put phones in airplane mode, cut brightness, and turn off background sync. A phone in airplane mode can last several times longer.','Charge one device at a time from a battery bank instead of leaving several plugged in and half-charged.']},{heading:'When power returns',body:['Check the refrigerator and freezer temperatures, reset clocks and alarms, and confirm smoke and carbon monoxide alarms still work.','Bring systems back gradually, and watch for any burning smell or sparking.']}],sources:[{label:'Ready.gov — Power outages',url:'https://www.ready.gov/power-outages'}]},
  {slug:'extreme-heat-cold',category:'weather',title:'Extreme heat and cold',updated:'2024-01',summary:'Recognising the point where heat or cold becomes an emergency, and using the safest space you actually have.',seeAlso:['shelter-building','first-aid','water-safety'],quickSteps:['Confusion, fainting, hot dry skin or a dangerously high body temperature in heat is an emergency. Call 911 and cool the person while you wait.','In cold, unstoppable shivering, slurred speech, clumsiness or drowsiness suggests hypothermia. Get the person dry, warm the body slowly, and call for help.','Never leave anyone in a parked vehicle in heat or cold, and never use a stove, oven or grill to heat a home.','Check on people living alone, older adults, infants and anyone with a chronic illness. They are at highest risk.','Drink water before you feel thirsty. In heat, avoid alcohol and heavy exertion in the middle of the day.'],sections:[{heading:'Heat: act early',body:['Heat illness escalates from cramps and heavy sweating to exhaustion, then confusion and collapse. Stop activity at the first cramps and move to shade or a cooler room.','Use shade, wet cloths on the neck and wrists, and moving air.']},{heading:'Cold: warm the body, not the room',body:['Layer clothing, stay dry, and cover the head and hands. Wet clothing loses heat far faster than dry clothing.','Warm a hypothermic person gradually with blankets and body heat. Do not give alcohol, do not rub the skin.']}],sources:[{label:'National Weather Service — Heat safety',url:'https://www.weather.gov/safety/heat'},{label:'CDC — Heat and health',url:'https://www.cdc.gov/heat-health/'}]},
  {slug:'evacuation-sheltering',category:'evacuation',title:'Evacuation and sheltering in place',updated:'2024-01',summary:'When to go, when to stay put, and what to take if you have two minutes.',seeAlso:['communication-failure','shelter-building','water-safety'],quickSteps:['If an official evacuation order covers your area, leave. Follow the route authorities give, even if it looks longer.','Never walk or drive into floodwater. Six inches of moving water can knock an adult down, and twelve inches can float a car.','If told to shelter in place, go inside, close windows and outside ventilation, and take your kit to an interior room.','Take identification, medication, water, chargers, a battery radio and your written contact card.','Never shelter in a closed attic during a flood. You can be trapped. Go to the highest floor that still has a way out.'],sections:[{heading:'Leaving well',body:['Tell your out-of-area contact where you are going and when you left.','Shut off utilities only if authorities tell you to.']},{heading:'Returning',body:['Do not return until authorities say the area is safe. Photograph damage before you move anything.','Assume downed lines are live and report them from a distance.']}],sources:[{label:'Ready.gov — Evacuation',url:'https://www.ready.gov/evacuation'},{label:'FEMA',url:'https://www.ready.gov/be-informed'}]},
  {slug:'medical-escalation',category:'medical',title:'Medical emergencies and escalation',updated:'2024-01',summary:'What to say, what to have ready, and which signs mean call immediately rather than wait.',seeAlso:['first-aid','trauma-care'],quickSteps:['Call 911 for chest pain, difficulty breathing, sudden weakness or drooping on one side, a seizure, severe bleeding, a severe allergic reaction, or anyone unresponsive.','Follow the dispatcher exactly. They can talk you through what to do while help travels.','For suspected poisoning, call Poison Control at 1-800-222-1222, or 911 if unconscious.','Apply firm, continuous pressure to a bleeding wound with a clean cloth. Do not keep lifting it to check.','Do not move someone with a suspected spinal injury unless in immediate danger.'],sections:[{heading:'Signs that mean call now',body:['Stroke: face drooping, arm weakness, speech difficulty, sudden loss of balance or vision. Note the time symptoms started.','Heart attack: chest pressure, pain to arm/jaw/back, shortness of breath, cold sweat. Call first.','Severe allergic reaction: swelling of face or throat, difficulty breathing, widespread hives. Use prescribed epinephrine if available, then call 911.']},{heading:'Have this ready to read out',body:['A written list of every medication, dose and prescriber, plus allergies, conditions and any implant.','At least seven days of prescription medication in the go-bag, and phone numbers of prescriber and pharmacy.']}],sources:[{label:'American Red Cross',url:'https://www.redcross.org'},{label:'Poison Control',url:'https://poison.org/'}]},
  {slug:'communication-failure',category:'communication',title:'When phones and internet fail',updated:'2024-01',summary:'A plan that works on paper, without apps, accounts or signal.',seeAlso:['radio-comms','family-reunification','signaling-rescue'],quickSteps:['Agree in advance on one out-of-area contact, one check-in time, and two meeting places. Write them down for every household member.','Send short text messages instead of calling when the network is congested. Texts queue and often arrive when a call cannot get through.','Conserve battery: airplane mode, lowest brightness, and the phone off between agreed check-in windows.','Give every person a printed card with the out-of-area contact, meeting points, and allergies or medication a responder would need.','Do not assume a message arrived. Silence is not confirmation that someone is safe.'],sections:[{heading:'Why out-of-area contacts work',body:['Local towers and lines saturate first. A contact in another region is often reachable when everyone nearby is not.','Tell that contact the plan now, while nothing is wrong, so they know what to expect.']},{heading:'What ARK cannot do',body:['ARK is a web application. It cannot create a radio link, a Bluetooth mesh or a satellite connection.','Treat paper and existing equipment as the dependable path. ARK is an extra layer, not the base layer.']}],sources:[{label:'Ready.gov — Make a plan',url:'https://www.ready.gov/plan'}]},
  {slug:'family-reunification',category:'reunification',title:'Finding each other again',updated:'2024-01',summary:'Meeting points, school and care procedures, and how to report someone missing.',seeAlso:['communication-failure','signaling-rescue'],quickSteps:['Use the two meeting points in your household plan: one just outside the home, one outside the neighbourhood.','Know your school or care provider\'s written reunification procedure and confirm who is authorised to collect each person.','Go to the agreed meeting point and stay long enough to be found. Leave a written note at home saying where you went and when.','To report someone missing, contact local authorities with a recent photo, what they were wearing, and where last seen.','Tell your out-of-area contact when everyone is accounted for.'],sections:[{heading:'Set it up now',body:['Write down who collects each child and a backup, and confirm the care setting will only release a child to those people.','Children should know two things cold: the meeting place, and the out-of-area contact\'s number. Practice saying the number out loud.']}],sources:[{label:'Ready.gov',url:'https://www.ready.gov/plan'},{label:'NCMEC',url:'https://www.missingkids.org'}]},
  {slug:'community-assistance',category:'community',title:'Helping neighbours without creating harm',updated:'2024-01',summary:'How to organise local help, protect vulnerable people, and avoid becoming a second emergency.',seeAlso:['communication-failure','family-reunification'],quickSteps:['Work through an identified coordinator and a staffed, safe location wherever one exists.','Share needs, not identities. Never publish a vulnerable person\'s address, condition or location on a public board.','Only accept tasks you are trained and equipped for. Untrained volunteers should not do medical care, electrical work or security duties.','Offer a paper route for people with no phone, no account or no identification.','Do not send volunteers into damaged buildings, floodwater, or areas under an evacuation order.'],sections:[{heading:'Matching help to need',body:['Confirm with the person that help actually arrived. A claimed delivery is not a delivery, and in a crisis the difference matters.','Keep a written record of who received what, so recovery support can be targeted and effort is not duplicated.']},{heading:'Protecting people',body:['Set one route for concerns about a volunteer or a request, and name one person responsible for acting on them.','Never ask for or record bank details, passwords or identity documents as part of informal aid.']}],sources:[{label:'Ready.gov — Volunteering',url:'https://www.ready.gov/volunteer'},{label:'FEMA',url:'https://www.fema.gov/how-you-can-help'}]},
  {slug:'fire-starting',category:'fire',title:'Starting a fire in an emergency',updated:'2024-01',summary:'How to reliably start a fire for warmth, signaling or cooking when you have limited tools.',seeAlso:['shelter-building','signaling-rescue'],quickSteps:['Choose a sheltered site away from overhanging branches, dry grass and structures. Clear a 3-foot ring of debris.','Build a fire lay before igniting: tinder (dry grass, birch bark, shredded material) → kindling (pencil-thin sticks) → fuel (thumb-thick and larger wood). Do not skip steps.','With a lighter or matches, ignite the tinder at the base of the structure and feed air gently — blow at the base, not the top.','If you have a ferro rod: scrape firmly and quickly at a low angle. Hold tinder close. Practice the motion before you need it.','Maintain the fire with graduated fuel additions. A fire that dies from too little air or too much wet wood wastes your effort.'],sections:[{heading:'Three methods when matches are wet or absent',body:['Magnification: a convex lens (reading glasses, water-filled bag, clear bottle) focused on tinder in direct sunlight. Hold steady until smoke appears, then blow gently into a bundle.','Friction — bow drill: requires a dry softwood board (cedar, willow, cottonwood), a spindle, a bow and tinder nest. This takes practice. If you have never done it, start with the lens method.','Flint and steel: strike the flint at a sharp angle against high-carbon steel. Direct sparks onto a char cloth or dry fungus. Without char cloth, success is rare.']},{heading:'Fire in wet conditions',body:['Stand-dead wood (dead branches still on the tree) is drier than wood on the ground. Split wood exposes the drier interior.','Build a dry platform of thick logs before laying the tinder to keep the fire off wet ground.','Birch bark and pine resin ignite even when damp. Pine knot — resin-saturated heartwood — burns intensely.']},{heading:'Fire safety and extinguishing',body:['Never leave a fire unattended. Keep water or a pile of dirt nearby.','To extinguish: pour water on all embers, stir, pour again. Repeat until steam stops rising. Coals can reignite hours later.','In a survival signal fire: build it high and open. Add green leaves or rubber to produce dark smoke (visible against sky). Wet leaves produce white smoke (visible against forest).']}],sources:[{label:'USFS — Campfire safety',url:'https://www.fs.usda.gov/detail/r1/recreation/?cid=stelprdb5399668'},{label:'Boy Scouts of America — Fire building',url:'https://www.scouting.org'}]},
  {slug:'shelter-building',category:'shelter',title:'Building an emergency shelter',updated:'2024-01',summary:'How to build a shelter that keeps body heat in and weather out, using natural or found materials.',seeAlso:['fire-starting','extreme-heat-cold'],quickSteps:['Prioritise shelter over food and fire if conditions are wet and cold — hypothermia kills in hours.','Choose a site on high ground, away from drainages and dead trees (widow-makers). Check overhead for branches before lying down.','Size matters: a small shelter is warmer. The space inside only needs to hold your body. Bigger sheds more heat.','Insulation from the ground is as important as insulation from above — 4 inches (10 cm) of dry leaves or debris under you.','Finish building while you still have energy and daylight. A rough shelter completed early beats a perfect one started in the dark.'],sections:[{heading:'Debris hut — no tools needed',body:['Find or prop a ridgepole 9 feet (2.7 m) long at chest height on one end (use a forked branch or rock), tapering to the ground on the other.','Lean branches against both sides of the ridge to form ribs, then pile debris (dry leaves, pine needles, bark) 2–3 feet (60–90 cm) thick on the outside.','Stuff the interior with dry leaves for insulation. Plug the entrance with a bundle of leaves or a backpack.','In rain, the debris must be thick enough that you can bury your arm in it and not feel the ridgepole.']},{heading:'Tarp or emergency blanket shelter',body:['A reflective emergency blanket (space blanket) increases radiated heat retention significantly. Carry one.','Ridgeline tie-off: tie a cord between two trees at chest height. Drape the tarp over and anchor the corners low to the ground. This diverts rain to the sides.','Angle the opening away from wind. Keep the pitch steep so rain runs off quickly.']},{heading:'Snow shelter',body:['In deep dry snow: dig into a slope or mound snow and pack it. Wait 20 minutes for it to sinter (harden), then hollow out. Temperature inside stays near 32°F/0°C regardless of outside cold.','Poke a ventilation hole in the ceiling with a stick or pole. CO2 and melt-water are the main hazards.','Mark the shelter with a ski pole or branch so rescuers can find it and so you can find the entrance after a storm.']}],sources:[{label:'NOLS — Wilderness medicine',url:'https://www.nols.edu'},{label:'US Army Survival Manual FM 21-76',url:'https://www.fm21-76.com'}]},
  {slug:'first-aid',category:'medical',title:'First aid essentials',updated:'2024-01',summary:'The interventions that save lives in the first minutes: bleeding, airway, CPR, shock.',seeAlso:['trauma-care','medical-escalation'],quickSteps:['Scene safety first: do not become a second casualty. Identify and remove hazards before approaching.','Massive bleeding: apply direct pressure with both hands, do not remove cloths (add on top), and maintain pressure without letting go for at least 10 full minutes.','Airway: unresponsive adult — tilt head back and lift chin. Look, listen and feel for breathing for no more than 10 seconds.','No breathing or only gasping: begin CPR — 30 chest compressions (hard and fast, 2 inches deep at 100 bpm) then 2 rescue breaths. Continue until help arrives or you are physically unable.','Choking in conscious adult: 5 back blows with heel of hand between shoulder blades, then 5 abdominal thrusts (Heimlich). Alternate until cleared or unconscious.'],sections:[{heading:'The order of priorities — C-A-B',body:['Catastrophic haemorrhage → Airway → Breathing → Circulation. Control severe bleeding before anything else.','Once bleeding is controlled, open the airway, confirm breathing, and begin CPR only if the person is unresponsive and not breathing normally.']},{heading:'Tourniquet use',body:['Use a tourniquet for extremity (limb) bleeding that cannot be controlled by pressure alone. Apply 2–3 inches (5–7 cm) above the wound. Tighten until bleeding stops.','Write the time of application on the skin or tourniquet. Never remove in the field.','Improvised tourniquet: a belt or strip of cloth twisted with a stick works. It must be 1.5–2 inches (4–5 cm) wide to avoid nerve damage.']},{heading:'Shock',body:['Signs: pale, cold, clammy skin; rapid weak pulse; rapid breathing; anxiety or confusion.','Treatment: lay the person flat, elevate legs 12 inches if no spinal injury, keep warm, do not give fluids by mouth.','Act fast: shock can progress to death. Keep the person talking, monitor breathing, and call for help immediately.']}],sources:[{label:'American Red Cross — First Aid',url:'https://www.redcross.org/take-a-class/first-aid'},{label:'Stop the Bleed',url:'https://www.stopthebleed.org'}]},
  {slug:'signaling-rescue',category:'signaling',title:'Signaling for rescue',updated:'2024-01',summary:'How to make yourself visible and findable to rescuers on land, air or water.',seeAlso:['navigation','radio-comms'],quickSteps:['Stay put unless staying puts you in immediate danger. Rescuers search last known position first.','Three of anything is a universal distress signal — three whistle blasts, three fires, three shots. Repeat at regular intervals.','Signal mirror is the most effective daylight signal — visible for 10+ miles. Aim the reflection toward aircraft by forming a V with two fingers and aligning the mirror flash with it.','Ground-to-air signals: stomp a large X in snow or on a beach (minimum 3m/10ft). Use rocks, logs or clothing to contrast with background.','At night: flash light in groups of three (SOS is 3 short–3 long–3 short in Morse). A strobe light is more visible than a steady beam.'],sections:[{heading:'Signal fire',body:['A fire produces light at night and smoke by day. Build on a hill, clearing or shore — anywhere with open sky.','Daytime: add green leaves, plastic or rubber for dark smoke (visible against bright sky). Wet leaves produce white smoke (visible against dark forest).','Have the fire pre-built and ready to light the moment you hear aircraft. You may have only 30 seconds.']},{heading:'Whistle and mirror',body:['A plastic pea-less whistle (like a Fox 40) can be heard over a mile in calm conditions and uses almost no energy.','A signal mirror generates a flash visible to aircraft up to 10 miles away even in haze. Aim the flash by looking through the sighting hole and tracking the craft.','Cell phones: even without a network, a 911 call may still route. Keep battery above 20%.']},{heading:'Leaving a trail',body:['If you must move, leave clear signs: arrows made from rocks or sticks pointing your direction of travel; a note in a weatherproof container at your last camp.','Break branches at eye level every 20 metres along your path of travel. This is the fastest method for a search team on foot.']}],sources:[{label:'SAR best practices — NASAR',url:'https://www.nasar.org'},{label:'REI — Signaling for rescue',url:'https://www.rei.com/learn/expert-advice/rescue-signals.html'}]},
  {slug:'navigation',category:'navigation',title:'Navigation without GPS',updated:'2024-01',summary:'How to establish direction and navigate using the sun, stars, natural signs and a map.',seeAlso:['signaling-rescue','shelter-building'],quickSteps:['Establish north before you move: in the northern hemisphere, the sun rises roughly east and sets roughly west. At solar noon (highest point) it is due south.','Analog watch method (northern hemisphere): hold the watch horizontal. Point the hour hand at the sun. The midpoint between the hour hand and 12 o\'clock is south.','Night: find Polaris (North Star) by following the pointer stars at the end of the Big Dipper\'s cup about 5 times their own distance.','Mark your direction with a distant landmark before you walk — a mountain, a distinctive tree. Recheck every 30 minutes in dense cover.','In unfamiliar terrain: follow water downhill. It leads to larger water, settlements, roads and other humans.'],sections:[{heading:'Using a map without a compass',body:['Orient the map to the terrain: rotate it until features on the map (ridges, rivers, roads) align with what you see in front of you.','Take a bearing from known landmarks — triangulation. You are where two bearing lines on the map cross.','Pace count: know how many of your double steps equal 100 metres. Count steps over known ground at home. This lets you measure distance on a map and walk it blind.']},{heading:'Dead reckoning',body:['Dead reckoning: know your starting point, your direction of travel, your speed and elapsed time. Use these to estimate your current position.','It accumulates error — recheck against a landmark every hour and correct your estimate.','In forest: aim off. If your target is at a river crossing, aim deliberately 100m upstream or downstream. When you hit the river, you know which way to turn.']},{heading:'Natural navigation indicators',body:['Moss grows on all sides of trees in damp climates but tends toward north-facing aspects in exposed locations — useful as a rough indicator, not a compass substitute.','In the northern hemisphere, trees on south-facing slopes are more widely spaced with broader canopy. Snow melts first on south slopes.','Prevailing wind: sand dunes, snow ridges and bent trees point downwind — know the prevailing wind direction for your region.']}],sources:[{label:'Tristan Gooley — Natural Navigator',url:'https://www.naturalnavigator.com'},{label:'USGS — Map reading',url:'https://www.usgs.gov/programs/national-geospatial-program/topographic-maps'}]},
  {slug:'foraging',category:'food',title:'Safe foraging and food in the wild',updated:'2024-01',summary:'How to identify safe plants, avoid poisoning yourself, and prioritise effort correctly.',seeAlso:['water-purification','fire-starting'],quickSteps:['Food is last in the survival priority order: shelter > water > fire > signals > food. You can survive 3+ weeks without eating.','Never eat unknown white or yellow berries, plants with milky sap, umbrella-shaped flowers (carrot family), or anything that smells of almonds (cyanide).','Apply the Universal Edibility Test (UET) for any unknown plant: touch, smell, skin contact (15 min), lip contact (3 min), tongue (15 min), chew-no-swallow (15 min), swallow a teaspoon (8 hrs). If no reaction, eat small amounts.','Prioritise calorie-dense, abundant, unambiguous species: dandelion (all parts edible), cattail (roots, pollen), acorns (leach tannins first), pine needles (vitamin C tea).','Insects are high-protein and low-risk: avoid brightly coloured insects. Cook all insects — boiling or roasting kills parasites.'],sections:[{heading:'Three universally safe plants',body:['Dandelion (Taraxacum officinale): all parts edible raw or cooked. Toothed leaves, hollow stem, yellow flowers, white spherical seed head. Grows everywhere.','Cattail (Typha): found at water edges. The cylindrical brown seed head is unmistakeable. Pollen head is edible in spring. Roots are starchy year-round — peel, boil, eat.','Plantain (Plantago major/minor): rosette of oval ribbed leaves. Not the banana — a common lawn weed. Leaves edible raw or cooked. High in vitamins.']},{heading:'Acorns — leaching tannins',body:['Acorns are calorie-rich (fat + starch) but bitter raw from tannins. Leach before eating: crush the kernels, soak in cold water for several hours, changing water until no longer bitter, then dry or cook.','Boiling in multiple changes of water works faster. Cold-water leaching preserves more starch and makes flour.','All oak species produce edible acorns after leaching. White oaks are less bitter than red oaks.']},{heading:'What to absolutely avoid',body:['Hemlock (Conium maculatum): often mistaken for wild carrot. Purple-spotted hollow stem, fine white flowers. Fatal. Smell the crushed leaves — musty, unpleasant.','Deadly nightshade (Atropa belladonna): shiny black berries in clusters with a star-shaped calyx. Fatal.','Mushrooms: even experts make fatal errors. Without formal training, avoid all wild mushrooms in a survival situation.']}],sources:[{label:'USDA Plants Database',url:'https://plants.usda.gov'},{label:'Eat The Weeds',url:'https://www.eattheweeds.com'}]},
  {slug:'radio-comms',category:'comms',title:'Emergency radio communications',updated:'2024-01',summary:'How to use a handheld radio to call for help, monitor alerts, and coordinate with others.',seeAlso:['signaling-rescue','communication-failure'],quickSteps:['NOAA Weather Radio (US) broadcasts on 162.400–162.550 MHz. Keep a battery-powered or hand-crank NOAA radio in your kit.','CB radio Channel 9 is the official emergency channel in the US. FRS/GMRS Channel 1 (462.5625 MHz) is a common default for neighbourhood coordination.','To call for help on VHF marine: Channel 16 is the international distress channel. All vessels monitor it.','When calling Mayday: "MAYDAY MAYDAY MAYDAY, this is [your name/vessel/location], I have [nature of emergency], I need [type of assistance]." Transmit on the designated emergency channel.','Keep your transmission brief. Say your location first, then the emergency, then your callsign or name.'],sections:[{heading:'Radio types and their reach',body:['NOAA Weather Radio: receive-only. Essential for official alerts. Works during power outages on battery.','FRS/GMRS radios: 1–5 mile range in open terrain. No licence for FRS. GMRS requires a US FCC licence. Good for neighbourhood coordination.','Ham radio: requires licence. Much greater range (local repeaters extend to dozens of miles; HF can be global). Provides access to Skywarn and emergency nets.','Satellite communicators (Garmin inReach, SPOT): two-way texting via satellite anywhere in the world. No local infrastructure needed.']},{heading:'Phonetic alphabet and discipline',body:['Use the NATO phonetic alphabet to spell critical information — location names, medication names, callsigns: Alpha Bravo Charlie Delta…','Speak slowly and clearly. Say "over" when you have finished and expect a reply. Say "out" when you have finished the conversation.','Keep emergency channels clear. Brief reports only. Save conversation for a secondary channel.']},{heading:'Hand-crank and solar radios',body:['A hand-crank + solar radio is a core kit item. It operates indefinitely without batteries, can charge a phone via USB, and receives AM/FM/SW/NOAA.','Recommended minimum: a radio with NOAA Weather Alert that activates automatically when a warning is issued for your area.']}],sources:[{label:'ARRL — Amateur radio emergency',url:'https://www.arrl.org/ares'},{label:'FCC — Emergency communications',url:'https://www.fcc.gov/consumers/guides/emergency-communications'},{label:'NOAA Weather Radio',url:'https://www.weather.gov/nwr/'}]},
  {slug:'psychological-resilience',category:'medical',title:'Psychological resilience in crisis',updated:'2024-01',summary:'How to manage fear, panic and decision paralysis during and after an emergency.',seeAlso:['trauma-care','communication-failure'],quickSteps:['Stop, Breathe, Think, Act (SBTA). When panic rises, physically stop what you are doing, take three slow breaths, inventory your situation factually, then act on the highest priority item only.','Assign roles and tasks to everyone capable. Purposeful activity reduces panic and paralysis, including your own.','Acknowledge fear in others: "I know this is scary. What you are feeling is normal." Then redirect: "The next thing we need to do is…"','Communicate your plan clearly even when it is imperfect. Uncertainty is more paralysing than a flawed plan stated with confidence.','After the acute event: eat, drink, sleep as soon as safely possible. Physical depletion accelerates psychological decompensation.'],sections:[{heading:'The survival mindset',body:['Research on survival situations consistently shows that mindset — particularly the will to survive — predicts outcome more than physical skills.','Positive self-talk is not denial. It is directing cognitive resources toward problem-solving instead of threat amplification.','Break the situation into five-minute tasks. The question is not "can I survive this week?" It is "what do I do in the next five minutes?"']},{heading:'Managing others in crisis',body:['Calm is contagious. Lower your voice, slow your movements, and make eye contact. This physiologically down-regulates people around you.','Children look to adults for cues. A calm adult presence reduces acute stress response in children more than any reassurance.','Identify and gently neutralise panic-spreaders. Give them a task that removes them from the group temporarily.']},{heading:'Post-crisis: acute stress and grief',body:['Acute stress responses (flashbacks, hypervigilance, difficulty sleeping) in the first 30 days are normal. They do not predict PTSD.','Seek professional support if symptoms persist beyond 30 days, worsen, or prevent functioning.','Reconnecting with community — even briefly — is one of the strongest predictors of recovery after disaster.']}],sources:[{label:'SAMHSA — Disaster mental health',url:'https://www.samhsa.gov/find-help/disaster-distress-helpline'},{label:'Psychology Today — Crisis resilience',url:'https://www.psychologytoday.com'}]},
  {slug:'cpr-guide',category:'medical',title:'CPR — adult, child and infant',updated:'2024-01',summary:'Step-by-step CPR for unresponsive, non-breathing victims. No training required to try — imperfect CPR saves lives.',seeAlso:['first-aid','medical-escalation'],quickSteps:['Confirm the scene is safe. Tap the person\'s shoulders firmly and shout "Are you OK?"','Call 911 (or have someone call) before starting. Put the phone on speaker.','Place the heel of one hand on the centre of the chest (lower half of the breastbone). Place the second hand on top. Lock your fingers.','Push down hard and fast: at least 2 inches (5 cm) deep, 100–120 compressions per minute (think of the song "Stayin\' Alive"). Allow full chest recoil between compressions.','After 30 compressions: tilt the head back, lift the chin, pinch the nose, seal your mouth over theirs, and give 2 rescue breaths — each over 1 second, enough to see the chest rise.','Continue 30:2 cycles until an AED arrives, emergency services take over, the person starts breathing normally, or you are physically unable to continue.'],sections:[{heading:'Compression-only CPR (hands only)',body:['If you are untrained or unwilling to give rescue breaths, continuous chest compressions alone are effective for the first few minutes of cardiac arrest.','Push hard and fast in the centre of the chest without stopping. This is better than doing nothing — do not wait.','Compression-only CPR is equally effective as standard CPR for witnessed adult cardiac arrest. For children and drowning victims, rescue breaths are more important — use 30:2 if you can.']},{heading:'Children (1 year to puberty)',body:['Procedure is the same as adults. Use one hand only for smaller children to avoid too much depth.','Compression depth: 2 inches (5 cm) or at least one-third of the chest depth.','For infants (under 1 year): use two fingers on the centre of the chest, just below the nipple line. Push down about 1.5 inches (4 cm).']},{heading:'AED use',body:['Power on the AED and follow the voice prompts exactly. It will tell you everything.','Apply pads as shown in the diagram: one below the right collarbone, one on the left side below the armpit. Dry the chest if wet.','Ensure no one is touching the person before the shock is delivered — shout "Clear!" and visually confirm before pressing the shock button.','After the shock, immediately resume CPR. The AED will prompt you when to stop and analyse again.']}],sources:[{label:'American Heart Association — CPR',url:'https://cpr.heart.org'},{label:'Red Cross — CPR steps',url:'https://www.redcross.org/take-a-class/cpr'}]},
  {slug:'bites-stings',category:'medical',title:'Bites, stings and envenomation',updated:'2024-01',summary:'First aid for snake bites, bee stings, severe allergic reactions, and tick removal.',seeAlso:['first-aid','medical-escalation'],quickSteps:['Snake bite: keep the person still and calm. Remove jewellery and tight clothing near the bite. Keep the bitten limb below heart level. Get to a hospital — antivenom is the definitive treatment.','Do NOT cut, suck, tourniquet, apply electricity or ice to a snake bite. These cause harm without helping.','Bee/wasp sting with no allergy: remove the stinger by scraping sideways with a card or fingernail (never squeeze). Apply a cold compress for pain.','Severe allergic reaction (anaphylaxis): adrenaline (epinephrine) auto-injector if prescribed, then call 911. Signs: throat swelling, difficulty breathing, hives, sudden drop in consciousness.','Tick removal: grasp the tick as close to the skin as possible with fine-tipped tweezers. Pull upward steadily — do not twist. Clean the site with alcohol. Do not crush the tick.'],sections:[{heading:'Identifying dangerous vs harmless snakes',body:['In North America: triangular head, elliptical pupils, heat pit between eye and nostril indicate a pit viper (rattlesnake, copperhead, cottonmouth). Coral snakes are slender with red-yellow-black bands ("Red touches yellow, kill a fellow").','Rule: treat all unknown snake bites as potentially venomous. Even non-venomous bites can cause infection.','Photograph the snake if safe to do so without approaching it. This helps medical staff identify treatment needed.','Time is critical with venom — do not delay transport to treat symptoms beyond basic first aid.']},{heading:'Anaphylaxis — act immediately',body:['Anaphylaxis can be fatal within minutes. Act before you are sure.','If prescribed: use the epinephrine auto-injector (EpiPen) into the outer thigh, through clothing if needed. Hold for 10 seconds.','After epinephrine: call 911 even if the person feels better. The reaction can return (biphasic anaphylaxis) in 1–12 hours.','Position: lie the person flat with legs elevated unless breathing is easier sitting up. If unconscious, recovery position.']},{heading:'Tick-borne illness prevention',body:['After outdoor activity: check the whole body including scalp, groin, armpits and behind ears.','A tick must usually be attached 36–48 hours to transmit Lyme disease. Daily checks and prompt removal are highly effective prevention.','After removing a tick: watch for a bull\'s-eye rash, fever, fatigue or joint pain in the following weeks. If these appear, seek medical care and mention the tick bite.','Dispose of removed ticks in alcohol, sealed bag, or by flushing. Never crush with fingers.']}],sources:[{label:'CDC — Venomous snakes',url:'https://www.cdc.gov/niosh/topics/snakes'},{label:'American College of Allergy — Anaphylaxis',url:'https://acaai.org/allergies/anaphylaxis'},{label:'CDC — Tick removal',url:'https://www.cdc.gov/ticks/removing_a_tick.html'}]},
  {slug:'hypothermia-frostbite',category:'medical',title:'Hypothermia and frostbite',updated:'2024-01',summary:'Recognising and treating dangerous cold injuries before they become fatal.',seeAlso:['extreme-heat-cold','shelter-building','first-aid'],quickSteps:['Hypothermia — suspect it in anyone who is cold AND confused, shivering uncontrollably, stumbling, or losing consciousness.','Move the person to shelter. Remove wet clothing. Insulate the whole body including the head. Warm the core first (torso, neck, groin, armpits) — not the extremities.','For mild hypothermia (shivering, confused but responsive): warm beverages if the person is fully conscious. Body-to-body warmth under insulation.','For severe hypothermia (not shivering, unconscious, stiff): handle gently — sudden movement can trigger cardiac arrest. Keep horizontal, insulate, and evacuate urgently.','Frostbite — do not rewarm if there is any risk of re-freezing. Walking on frozen feet is safer than thawed, refrozen feet.','Rewarm frostbite only if evacuation is not imminent: immerse in gently moving water at 37–39°C (98–102°F) for 15–30 minutes until the tissue turns pink-red and soft. This is very painful — give pain relief if available.'],sections:[{heading:'Stages of hypothermia',body:['Mild (32–35°C / 90–95°F): shivering, impaired coordination, pale skin, confusion. The person still generates body heat. Warm, dry, insulate — recovery is straightforward.','Moderate (28–32°C / 82–90°F): shivering stops (a danger sign), increasing confusion or sleepiness, heart rhythm may become abnormal. Medical evacuation required.','Severe (below 28°C / 82°F): unconscious, rigid muscles, barely detectable pulse. Can appear dead. Never declare death from hypothermia until warm and dead ("you\'re not dead until you\'re warm and dead"). Continue resuscitation.']},{heading:'Frostbite: assessment and care',body:['Frostnip (superficial): skin is red, painful, blistered — not frozen. Warm with body heat. Full recovery expected.','Superficial frostbite: skin is white/grey, firm on the surface but soft underneath. Rewarm actively (see above). Blisters form after rewarming — do not break them.','Deep frostbite: tissue is completely hard, cold and white or mottled. This requires hospital care. Keep frozen until definitive care is available. Avoid pressure and friction on the affected area.','After rewarming: elevate the limb, loosely bandage with clean dry material between toes/fingers. Do not walk on rewarmed feet if avoidable.']},{heading:'Prevention',body:['The wet-cold combination is more dangerous than dry cold. Prioritise staying dry over staying warm.','Layer clothing: moisture-wicking base layer, insulating mid-layer, wind/waterproof outer shell. Avoid cotton next to skin.','Identify early warning signs in yourself and others: numbness, clumsiness, slurred speech. Act on them before they worsen.','Calorie and fluid intake are critical in the cold. Dehydration and starvation accelerate hypothermia.']}],sources:[{label:'Wilderness Medical Society — Cold injuries',url:'https://www.wms.org'},{label:'CDC — Hypothermia',url:'https://www.cdc.gov/disasters/winter/staysafe/hypothermia.html'}]},
  {slug:'trauma-care',category:'medical',title:'Trauma care and wound management',updated:'2024-01',summary:'Managing serious injuries when emergency services cannot arrive quickly: bleeding, fractures, burns, impalement.',seeAlso:['first-aid','medical-escalation'],quickSteps:['Severe bleeding: apply direct pressure. If a limb — tourniquet 2–3 inches above the wound, tighten until bleeding stops, write the time.','For impaled objects: do NOT remove. Stabilise the object with improvised padding and bandage around it. Removal causes rapid, uncontrollable bleeding.','Burns: cool immediately with cool running water for 20 minutes. Do not use ice, butter or toothpaste. Cover with a clean non-fluffy material (cling wrap is ideal).','Fracture — improvised splint: pad the limb, apply rigid material (sticks, board) on both sides, bandage firmly. Splint the joint above and below the fracture.','Spinal injury suspicion: do not move the person unless in immediate danger. If you must move them, minimise spinal motion.'],sections:[{heading:'Wound closure and infection prevention',body:['Clean wounds: irrigate copiously with clean water under pressure (a syringe or squeeze bottle). Remove visible debris.','For gaping wounds: bring the edges together with strips of tape (butterfly closures), or strips of clean fabric if no tape is available.','Wound infection signs: increasing warmth, swelling, redness spreading from the wound, pus, red streaks running from the wound (tracking), fever. These require urgent medical care.','Keep wounds covered with the cleanest material available. Change dressings at least daily.']},{heading:'Chest injuries',body:['Open chest wound (sucking chest wound): seal three sides with plastic (creates one-way valve). The person may feel a little better quickly as the lung re-expands.','Tension pneumothorax: worsening breathing difficulty, absent breath sounds on one side, trachea deviated. This is a medical emergency requiring trained needle decompression.','Rib fractures: support the injury with the person\'s arm or a sling. Have the person take deliberate deep breaths regularly despite the pain to prevent lung complications.']},{heading:'Head injuries',body:['Any loss of consciousness, however brief, requires evacuation and evaluation.','Warning signs after head injury: worsening headache, repeated vomiting, seizure, unequal pupils, confusion or unusual behaviour. These indicate serious injury.','Keep the person awake and talking. The old advice of "keep them awake all night" is debated, but assess neurological status regularly.']}],sources:[{label:'Wilderness Medical Society — Field Guide',url:'https://www.wms.org'},{label:'Stop the Bleed',url:'https://www.stopthebleed.org'},{label:'Remote Area Medical',url:'https://www.ramusa.org'}]},
];

const ALERT_LEVELS = {
  1:{label:'Normal',desc:'No active emergency. Monitor conditions. Keep kit ready.',color:'alert-1'},
  2:{label:'Watch',desc:'Potential threat developing. Review plans. Charge devices.',color:'alert-2'},
  3:{label:'Warning',desc:'Threat is imminent or occurring. Activate your plan now.',color:'alert-3'},
  4:{label:'Emergency',desc:'Active emergency in your area. Follow official instructions.',color:'alert-4'},
  5:{label:'Critical',desc:'Severe conditions. Shelter in place or evacuate immediately.',color:'alert-5'},
};

const PHONETIC = [
  ['A','Alpha'],['B','Bravo'],['C','Charlie'],['D','Delta'],['E','Echo'],
  ['F','Foxtrot'],['G','Golf'],['H','Hotel'],['I','India'],['J','Juliet'],
  ['K','Kilo'],['L','Lima'],['M','Mike'],['N','November'],['O','Oscar'],
  ['P','Papa'],['Q','Quebec'],['R','Romeo'],['S','Sierra'],['T','Tango'],
  ['U','Uniform'],['V','Victor'],['W','Whiskey'],['X','X-ray'],['Y','Yankee'],['Z','Zulu'],
  ['0','Zero'],['1','One'],['2','Two'],['3','Three'],['4','Four'],
  ['5','Five'],['6','Six'],['7','Seven'],['8','Eight'],['9','Niner'],
];

const MORSE = {
  'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---',
  'K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-',
  'U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--','/':'-..-.','=':'-...-',
};

// === STORAGE AVAILABILITY PROBE ===
// Private browsing (quota=0), disabled cookies, or sandboxed iframes make
// localStorage throw. Probe once; if it fails, Store uses an in-memory Map.
let _lsAvailable = false;
try { localStorage.setItem('__ark_test', '1'); localStorage.removeItem('__ark_test'); _lsAvailable = true; } catch(e) {}
if (!_lsAvailable) {
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('storage-unavailable-banner');
    if (b) b.classList.remove('hidden');
    Toast.show('⚠️ Storage unavailable — data won\'t persist between sessions', 'error', 6000);
  });
}

function _isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
}

// === STORAGE WRAPPER ===
const Store = {
  _mem: new Map(),        // fallback when localStorage is unavailable
  lastSave: null,         // ISO timestamp of last successful Store.set() this session
  _lastErrToast: 0,       // throttle error toasts (Store.set can fire in loops)
  get persistent() { return _lsAvailable; },

  _errToast(msg) {
    const now = Date.now();
    if (now - this._lastErrToast < 10000) return;
    this._lastErrToast = now;
    try { Toast.show(msg, 'error', 5000); } catch(_) {}
  },

  // Returns true on success, false on failure.
  set(key, val) {
    let json;
    try { json = JSON.stringify(val); }
    catch(e) { console.error('Store.set: value not serializable', key, e); this._errToast('Could not save "' + key + '" — data format error'); return false; }
    if (json === undefined) json = 'null';
    if (!_lsAvailable) { this._mem.set('ark_' + key, json); this._markSaved(); return true; }
    try {
      localStorage.setItem('ark_' + key, json);
      this._markSaved();
      return true;
    } catch(e) {
      if (_isQuotaError(e)) {
        console.error('Store.set: quota exceeded', key, e);
        this._errToast('Storage full — delete old data (export a backup first)');
        const banner = document.getElementById('storage-warning-banner');
        if (banner) banner.classList.remove('hidden');
      } else {
        console.error('Store.set failed', key, e);
        this._errToast('Save failed — your last change may not be kept');
      }
      return false;
    }
  },

  _markSaved() {
    this.lastSave = new Date().toISOString();
    const el = document.getElementById('set-last-save');
    if (el) el.textContent = this.lastSaveLabel();
  },

  lastSaveLabel() {
    const mode = _lsAvailable ? '' : ' (memory only — not persisted)';
    if (!this.lastSave) return 'Last saved: nothing saved yet this session' + mode;
    return 'Last saved: ' + new Date(this.lastSave).toLocaleString() + mode;
  },

  get(key, def = null) {
    let v;
    try {
      v = _lsAvailable ? localStorage.getItem('ark_' + key) : (this._mem.has('ark_' + key) ? this._mem.get('ark_' + key) : null);
    } catch(e) { console.error('Store.get: read failed', key, e); return def; }
    if (v === null || v === undefined) return def;
    try { return JSON.parse(v); }
    catch(e) {
      // Corrupted entry: keep the raw value (no silent data loss) and fall back to default.
      console.warn('Store.get: corrupted JSON for "' + key + '", using default', e);
      return def;
    }
  },

  del(key) {
    if (!_lsAvailable) { this._mem.delete('ark_' + key); return; }
    try { localStorage.removeItem('ark_' + key); } catch(e) { console.error('Store.del failed', key, e); }
  },

  keys() {
    const ks = [];
    if (!_lsAvailable) {
      this._mem.forEach((_, k) => { if (k.startsWith('ark_')) ks.push(k.slice(4)); });
      return ks;
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ark_')) ks.push(k.slice(4));
      }
    } catch(e) { console.error('Store.keys failed', e); }
    return ks;
  },

  // Removes only ARK keys (never other apps' data on the same origin).
  clearAll() {
    this.keys().forEach(k => this.del(k));
    this._mem.clear();
  },

  exportAll() {
    const data = {};
    this.keys().forEach(k => { data[k] = this.get(k); });
    return data;
  }
};

// === INDEXEDDB WRAPPER ===
const DB = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    return new Promise((res, rej) => {
      const req = indexedDB.open('ARK_DB', 3);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('messages')) {
          const ms = db.createObjectStore('messages', {keyPath:'id'});
          ms.createIndex('channel','channel',{unique:false});
          ms.createIndex('ts','ts',{unique:false});
        }
        if (!db.objectStoreNames.contains('resources')) {
          db.createObjectStore('resources', {keyPath:'id',autoIncrement:true});
        }
        // v3: persistent map tile cache (key: "z/x/y", value: {key, blob, ts})
        if (!db.objectStoreNames.contains('map_tiles')) {
          const tileStore = db.createObjectStore('map_tiles', {keyPath:'key'});
          tileStore.createIndex('ts','ts',{unique:false});
        }
      };
      req.onsuccess = e => {
        this._db = e.target.result;
        // Prune tiles older than 30 days on open (non-blocking)
        this._pruneTiles().catch(()=>{});
        res(this._db);
      };
      req.onerror = e => { console.error('IDB error', e); rej(e); };
    });
  },
  // ── Tile cache helpers ─────────────────────────────────────────────────────
  async getTile(key) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const req = db.transaction('map_tiles','readonly').objectStore('map_tiles').get(key);
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => res(null);
      });
    } catch(e) { return null; }
  },
  async putTile(key, blob) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const req = db.transaction('map_tiles','readwrite').objectStore('map_tiles').put({key, blob, ts: Date.now()});
        req.onsuccess = () => res();
        req.onerror = () => res();
      });
    } catch(e) {}
  },
  async _pruneTiles() {
    try {
      const db = await this.open();
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
      const tx = db.transaction('map_tiles','readwrite');
      const idx = tx.objectStore('map_tiles').index('ts');
      const range = IDBKeyRange.upperBound(cutoff);
      idx.openCursor(range).onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { cur.delete(); cur.continue(); }
      };
    } catch(e) {}
  },
  async getAll(store) {
    try {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction(store,'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = rej;
      });
    } catch(e) { return []; }
  },
  async put(store, item) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const tx = db.transaction(store,'readwrite');
        const req = tx.objectStore(store).put(item);
        req.onsuccess = () => res(req.result);
        req.onerror = (e) => { console.error('IDB put error', store, e); res(undefined); };
      });
    } catch(e) { console.error('IDB put error', store, e); return undefined; }
  },
  async clear(store) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const tx = db.transaction(store,'readwrite');
        const req = tx.objectStore(store).clear();
        req.onsuccess = () => res();
        req.onerror = () => res();
      });
    } catch(e) {}
  },
  async delete(store, id) {
    try {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction(store,'readwrite');
        const req = tx.objectStore(store).delete(id);
        req.onsuccess = () => res();
        req.onerror = rej;
      });
    } catch(e) { console.error('IDB delete error', e); }
  }
};

// === TOAST ===
const Toast = {
  _t: null,
  _types: ['success', 'error', 'info', 'warning'],
  show(msg, type='info', dur=3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    if (!this._types.includes(type)) type = 'info';
    el.textContent = msg;
    el.className = 'show toast-' + type;
    clearTimeout(this._t);
    this._t = setTimeout(() => el.className = '', dur);
  }
};

// === BUTTON LOADING STATE ===
// Disables a button and swaps its label while async work runs; restore() puts the original label back.
const BtnLoading = {
  start(btn, label) {
    if (!btn || btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');
    btn.textContent = label || '⏳ …';
  },
  stop(btn) {
    if (!btn || btn.dataset.loading !== '1') return;
    btn.textContent = btn.dataset.label;
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('is-loading');
    delete btn.dataset.loading;
    delete btn.dataset.label;
  },
  all(selector) { return Array.from(document.querySelectorAll(selector)); }
};

// === MODAL ===
const Modal = {
  open(html, title = '') {
    const box = document.getElementById('ark-modal-box');
    const overlay = document.getElementById('ark-modal');
    if (!box || !overlay) return;
    box.innerHTML = title ? `<div id="modal-title" class="mb-12" style="font-weight:800;font-size:1.1rem">${title}</div>${html}` : html;
    // Untitled dialogs have no #modal-title; fall back to a generic accessible name.
    if (title) { box.setAttribute('aria-labelledby', 'modal-title'); box.removeAttribute('aria-label'); }
    else { box.removeAttribute('aria-labelledby'); box.setAttribute('aria-label', 'Dialog'); }
    // Only remember the trigger when opening fresh; re-opening over an open modal keeps the original.
    if (overlay.classList.contains('hidden')) Modal._prevFocus = document.activeElement;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (!Modal._trapBound) {
      overlay.addEventListener('keydown', Modal._onKeydown);
      Modal._trapBound = true;
    }
    setTimeout(() => {
      const first = box.querySelector(Modal._focusable);
      (first || box).focus();
    }, 50);
  },
  _focusable: 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
  _onKeydown(e) {
    const overlay = document.getElementById('ark-modal');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); Modal._onYes = null; Modal.close(); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(document.getElementById('ark-modal-box').querySelectorAll(Modal._focusable))
      .filter(el => el.offsetParent !== null);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },
  close() {
    const overlay = document.getElementById('ark-modal');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
    const prev = Modal._prevFocus;
    Modal._prevFocus = null;
    if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus();
  },
  // msg may contain trusted markup; callers must esc() any user data inside it.
  // onYes is kept by reference (not stringified) so closures survive.
  confirm(msg, onYes, yesLabel = 'Confirm', noLabel = 'Cancel') {
    this._onYes = onYes;
    this.open(`
      <div style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:20px">${msg}</div>
      <div class="flex wrap" style="gap:10px">
        <button class="btn btn-primary" style="flex:1" onclick="Modal._confirmYes()">${esc(yesLabel)}</button>
        <button class="btn btn-secondary" style="flex:1" onclick="Modal._onYes=null;Modal.close()">${esc(noLabel)}</button>
      </div>`);
  },
  _confirmYes() {
    const fn = this._onYes;
    this._onYes = null;
    this.close();
    if (typeof fn !== 'function') return;
    try { fn(); } catch(e) { console.warn('Modal.confirm action:', e); Toast.show('That action failed — please try again', 'error'); }
  }
};

// === UI CONTROLLER ===
const UI = {
  currentTab: 'home',
  _inited: false,
  init() {
    if (this._inited) return;
    this._inited = true;
    // Nav click handlers
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      // WAI-ARIA tabs pattern: arrow keys / Home / End move between tabs
      btn.addEventListener('keydown', e => {
        const all = Array.from(document.querySelectorAll('.nav-btn'));
        const i = all.indexOf(btn);
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = all[(i + 1) % all.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = all[(i - 1 + all.length) % all.length];
        else if (e.key === 'Home') next = all[0];
        else if (e.key === 'End') next = all[all.length - 1];
        if (!next) return;
        e.preventDefault();
        this.switchTab(next.dataset.tab);
        next.focus();
      });
    });
    this.startClock();
    this.checkOnline();
    window.addEventListener('online', () => this.checkOnline());
    window.addEventListener('offline', () => this.checkOnline());
  },
  switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });
    const panel = document.getElementById('tab-' + tab);
    if (panel) panel.classList.add('active');
    const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');
    }
    this.currentTab = tab;
    // Lazy init tabs
    if (tab === 'home') HomeStats.render();
    if (tab === 'survival') Guides.init();
    if (tab === 'radio') Radio.init();
    if (tab === 'map') MapTool.init();
    if (tab === 'messages') { Messages.refresh(); const ta = document.getElementById('msg-text'); if (ta) Messages._onTextInput(ta); }
    if (tab === 'resources') Resources.render();
    if (tab === 'household') Household.load();
    if (tab === 'settings') Settings.load();
    if (tab === 'medical') Medical.load();
    if (tab === 'network') {
      const el = document.getElementById('hub-url-input');
      const url = Store.get('hub_url','');
      if (el && url) el.value = url;
      Hub.updateSyncDisplay();
      // Auto-generate QR if hub URL is already set and display is empty
      if (url) {
        const qrDisplay = document.getElementById('qr-hub-display');
        if (qrDisplay && !qrDisplay.querySelector('svg')) Network.generateHubQR();
      }
    }
  },
  startClock() {
    const tick = () => {
      const now = new Date();
      const t = now.toLocaleTimeString();
      const d = now.toLocaleDateString(undefined, {weekday:'long',year:'numeric',month:'long',day:'numeric'});
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const sbTime = document.getElementById('sb-time');
      const hClock = document.getElementById('home-clock');
      const hDate = document.getElementById('home-date');
      const hTz = document.getElementById('home-tz');
      if (sbTime) sbTime.textContent = now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      if (hClock) hClock.textContent = t;
      if (hDate) hDate.textContent = d;
      if (hTz) hTz.textContent = 'Timezone: ' + tz;
    };
    tick();
    setInterval(tick, 1000);
  },
  checkOnline() {
    const online = navigator.onLine;
    const banner = document.getElementById('offline-banner');
    const ind = document.getElementById('offline-indicator');
    if (!online) {
      if (banner) banner.classList.add('show');
      if (ind) ind.textContent = '⚡ OFFLINE';
    } else {
      if (banner) banner.classList.remove('show');
      if (ind) ind.textContent = '';
    }
  },
  openAlertEditor() {
    const cur = Store.get('alert_level', 1);
    // Use ALERT_LEVELS as single source of truth — avoids duplicated/diverging descriptions
    const levels = [1,2,3,4,5].map(n => ({n, ...ALERT_LEVELS[n]}));
    const btns = levels.map(l => `
      <button class="btn ${l.n === cur ? 'btn-primary' : 'btn-secondary'} w-full mb-8" style="text-align:left;padding:10px 14px" onclick="UI._setAlert(${l.n})">
        <strong>Level ${l.n} — ${l.label}</strong><br>
        <span style="font-size:12px;opacity:.8">${l.desc}</span>
      </button>`).join('');
    Modal.open(`<div>${btns}<button class="btn btn-ghost btn-sm w-full" style="margin-top:4px" onclick="Modal.close()">Cancel</button></div>`, '📊 Set Alert Level');
  },
  _setAlert(level) {
    Modal.close();
    Store.set('alert_level', level);
    this.renderAlertLevel(level);
    Toast.show('Alert level set to ' + level, 'info');
  },
  renderAlertLevel(level = 1) {
    const info = ALERT_LEVELS[level] || ALERT_LEVELS[1];
    const el = document.getElementById('alert-display');
    if (!el) return;
    el.className = 'alert-banner ' + info.color;
    const numEl = document.getElementById('alert-num'); if (numEl) numEl.textContent = level;
    const titleEl = document.getElementById('alert-title'); if (titleEl) titleEl.textContent = 'Level ' + level + ' — ' + info.label;
    const descEl = document.getElementById('alert-desc'); if (descEl) descEl.textContent = info.desc;
  },
  quickPost(channel) {
    this.switchTab('messages');
    setTimeout(() => {
      const ch = document.getElementById('msg-channel');
      if (ch) ch.value = channel;
      const ta = document.getElementById('msg-text');
      if (ta) ta.focus();
    }, 100);
  },
  shareApp() { if (window.ShareARK) ShareARK.openModal(); },
  showConnStatus() {
    const pill = document.getElementById('conn-pill');
    const state = pill ? pill.textContent.trim() : 'OFFLINE';
    const hasHub = !!Hub.url;
    let icon, title, body, actionBtn = '';
    if (state === 'CONNECTED') {
      icon = '✅'; title = 'Connected — LOCAL hub';
      body = 'You are syncing with a hub on your local Wi-Fi. Messages reach everyone connected to the same hub.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'REGIONAL') {
      icon = '🌐'; title = 'REGIONAL connection';
      body = 'Your hub is connected to nearby hubs. Messages can reach a wider area.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'EXTENDED') {
      icon = '🕸️'; title = 'EXTENDED mesh';
      body = 'Multi-hop mesh is active. Messages can reach further via relay.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'GLOBAL') {
      icon = '🌍'; title = 'GLOBAL — internet available';
      body = 'An internet gateway is reachable. Messages may be relayed further.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'SYNCING…') {
      icon = '🔄'; title = 'Syncing…';
      body = 'ARK is syncing with the hub. This usually takes a few seconds.';
    } else if (state === 'ERROR') {
      icon = '⚠️'; title = 'Hub unreachable';
      body = 'ARK could not reach the hub. Make sure your phone is on the same Wi-Fi as the hub computer, then try again.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Try Again</button>`;
    } else {
      icon = '📵'; title = hasHub ? 'Cannot reach hub' : 'No hub connected';
      body = hasHub
        ? 'Your device cannot reach the hub right now. Make sure your phone is on the same Wi-Fi as the hub computer, then tap Sync Now.'
        : 'No hub is configured. ARK works fully offline — your messages are saved right here on this device. When you want to coordinate with neighbors, connect to a community hub on the Network tab.';
      actionBtn = hasHub
        ? `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Try Sync Now</button>`
        : `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();UI.switchTab('network')">📡 Set Up Hub Connection</button>`;
    }
    Modal.open(
      `<div style="text-align:center;padding:4px 0 8px">
        <div style="font-size:2.5rem">${icon}</div>
        <div class="mt-8" style="font-weight:800;font-size:1.1rem">${title}</div>
        <div style="color:var(--text-secondary);font-size:14px;margin-top:10px;line-height:1.6">${body}</div>
        ${actionBtn}
        <button class="btn btn-ghost btn-sm mt-8 w-full" onclick="Modal.close()" style="display:block">Dismiss</button>
      </div>`
    );
  }
};

// === SOFT HUB (Auto-hub: first opener becomes the hub when no external hub is set) ===
const SoftHub = (() => {
  const CHANNEL   = 'ark_softhub_v1';
  const ROLE_KEY  = 'softhub_role';   // 'hub' | 'peer'
  const CLAIM_KEY = 'softhub_claimed'; // ISO timestamp of when this tab claimed hub role
  const PEERS_KEY = 'softhub_peers';  // JSON array of {id, alias, lastSeen}
  const SELF_ID   = 'ark_' + (Store.get('hh_id') || Math.random().toString(36).slice(2));

  let _bc = null;
  let _role = 'peer';
  let _peers = [];
  let _heartbeatInterval = null;

  function _enabled()  { return typeof BroadcastChannel !== 'undefined'; }
  function isHub()     { return _role === 'hub'; }
  function peerCount() { return _peers.length; }

  function _savePeers(list) {
    _peers = list;
    try { localStorage.setItem(PEERS_KEY, JSON.stringify(list)); } catch(e) {}
  }

  function _broadcast(type, payload = {}) {
    if (_bc) try { _bc.postMessage({ type, from: SELF_ID, alias: Store.get('last_alias',''), ...payload }); } catch(e) {}
  }

  function _claimHub() {
    _role = 'hub';
    Store.set(ROLE_KEY, 'hub');
    const claimedAt = new Date().toISOString();
    Store.set(CLAIM_KEY, claimedAt);
    _broadcast('hub_claim', { claimedAt });
    _updateUI();
  }

  function _updateUI() {
    // Update Network tab hub status indicator if present
    const badge = document.getElementById('softhub-role-badge');
    if (badge) {
      badge.textContent = isHub() ? '🛰 You are the Hub' : '📡 Peer mode';
      badge.style.color = isHub() ? 'var(--gold, #8b6f3e)' : 'var(--text-secondary, #666)';
      badge.style.display = '';
    }
    // Show notification once when auto-promoted
    const notified = Store.get('softhub_notified');
    if (isHub() && !notified) {
      Store.set('softhub_notified', true);
      Toast.show('🛰 You\'re the ARK Hub — your device is sharing messages with neighbours', 'success', 6000);
    }
    // Update hero peer badge
    const heroPeers = document.getElementById('hero-sync-badge');
    if (heroPeers) heroPeers.textContent = _peers.length + ' Peer' + (_peers.length !== 1 ? 's' : '');
    // Delegate to Network's deploy UI updater
    if (typeof Network !== 'undefined' && Network._updateHubDeployUI) {
      Network._updateHubDeployUI();
    }
  }

  function _handleMessage(e) {
    const { type, from, alias } = e.data || {};
    if (!type || from === SELF_ID) return;

    if (type === 'hub_claim') {
      // Another tab / window is claiming hub role — yield if we claimed later
      const myClaim = new Date(Store.get(CLAIM_KEY, 0)).getTime();
      const theirClaim = e.data.claimedAt ? new Date(e.data.claimedAt).getTime() : 0;
      if (_role === 'hub' && theirClaim && theirClaim < myClaim) {
        _role = 'peer';
        Store.set(ROLE_KEY, 'peer');
        _updateUI();
      }
    }

    if (type === 'heartbeat') {
      // Record peer
      const now = Date.now();
      const existing = _peers.findIndex(p => p.id === from);
      const entry = { id: from, alias: alias || 'Unknown', lastSeen: now };
      if (existing >= 0) _peers[existing] = entry;
      else _peers.push(entry);
      // Prune peers not seen in 90s
      _savePeers(_peers.filter(p => now - p.lastSeen < 90000));
      _updateUI();
      // If hub, acknowledge
      if (isHub()) _broadcast('hub_ack', { peers: _peers.length });
    }

    if (type === 'hub_ack') {
      // We got a reply from a hub peer; update peer count
      _updateUI();
    }
  }

  async function init() {
    // Only activate SoftHub when no external hub URL is configured
    if (Store.get('hub_url')) return;

    if (!_enabled()) return; // BroadcastChannel not available (very old browser)

    try { _bc = new BroadcastChannel(CHANNEL); } catch(e) { return; }
    _bc.onmessage = _handleMessage;

    // Check if another tab already holds the hub role via localStorage timestamp
    const existingClaim = Store.get(CLAIM_KEY);
    const existingRole  = Store.get(ROLE_KEY);
    const wasManual     = Store.get('softhub_manual');

    if (existingRole === 'hub' && existingClaim) {
      // Another tab may own hub — wait a moment to let it heartbeat
      // But if the user manually pressed "Become Hub" last time, re-claim immediately
      if (wasManual) {
        setTimeout(() => { _claimHub(); }, 100);
      } else {
        // Wait for a hub_ack/heartbeat from the other tab; only claim if none arrives
        let gotAck = false;
        const prevOnMessage = _bc.onmessage;
        _bc.onmessage = (e) => {
          const { type } = e.data || {};
          if (type === 'hub_ack' || type === 'hub_claim' || type === 'heartbeat') gotAck = true;
          if (prevOnMessage) prevOnMessage(e);
        };
        setTimeout(() => {
          _bc.onmessage = _handleMessage; // restore normal handler
          if (!gotAck) _claimHub();       // no live hub found — claim it
        }, 2000);
      }
    } else {
      // First opener — claim hub role immediately
      await new Promise(r => setTimeout(r, 300)); // small delay for UI
      _claimHub();
    }

    // Send heartbeats every 15s
    _heartbeatInterval = setInterval(() => {
      _broadcast('heartbeat');
      // Prune peers > 90s
      const now = Date.now();
      _savePeers(_peers.filter(p => now - p.lastSeen < 90000));
      _updateUI();
    }, 15000);

    // Initial heartbeat
    _broadcast('heartbeat');
  }

  function stop() {
    if (_heartbeatInterval) clearInterval(_heartbeatInterval);
    if (_bc) { try { _bc.close(); } catch(e) {} _bc = null; }
    _role = 'peer';
  }

  // Called by Hub when an external hub URL is configured — SoftHub yields
  function yield_to_external() {
    stop();
    Store.del(ROLE_KEY);
    Store.del(CLAIM_KEY);
    Store.del('softhub_notified');
  }

  // One-tap manual hub claim (called from Network tab "Become Hub" button)
  async function claimHubManually() {
    // If BroadcastChannel not yet set up, init the channel first
    if (!_bc && _enabled()) {
      try { _bc = new BroadcastChannel(CHANNEL); _bc.onmessage = _handleMessage; } catch(e) {}
    }
    // Start heartbeat if not already running
    if (!_heartbeatInterval) {
      _heartbeatInterval = setInterval(() => {
        _broadcast('heartbeat');
        const now = Date.now();
        _savePeers(_peers.filter(p => now - p.lastSeen < 90000));
        _updateUI();
      }, 15000);
    }
    _claimHub();
    _broadcast('heartbeat');
    // Persist explicit choice so it survives page reload
    Store.set('softhub_manual', '1');
  }

  // === AUTO-DISCOVERY: broadcast "join me" on first open ===
  // On first open, ARK finds every other open tab/window and invites them in.
  // The invite shows a persistent banner with one-tap join.
  const DISCOVER_CHANNEL = 'ark_discover_v1';
  let _discoverBc = null;

  function _startDiscovery() {
    if (typeof BroadcastChannel === 'undefined') return;
    // Close any existing channel before reopening (prevents instance leak on double-call)
    if (_discoverBc) { try { _discoverBc.close(); } catch(e) {} _discoverBc = null; }
    try { _discoverBc = new BroadcastChannel(DISCOVER_CHANNEL); } catch(e) { return; }

    _discoverBc.onmessage = (e) => {
      const { type, fromAlias, hubIP, hubPort } = e.data || {};
      // Another ARK tab is announcing itself — show a join banner
      if (type === 'ark_here' && hubIP) {
        _showJoinBanner(fromAlias, hubIP, hubPort);
      }
      // A new tab just opened — if we're the hub, announce our address
      if (type === 'ark_new_tab' && isHub()) {
        const ip = Store.get('softhub_detected_ip');
        if (ip) {
          _discoverBc.postMessage({
            type: 'ark_here',
            fromAlias: Store.get('last_alias', 'ARK Hub'),
            hubIP: ip,
            hubPort: 8765
          });
        }
      }
    };

    // Announce ourselves as a new tab — existing hubs will respond
    _discoverBc.postMessage({ type: 'ark_new_tab', from: SELF_ID });

    // If we become hub and detect IP, announce to any other tabs
    setTimeout(() => {
      if (isHub()) {
        const ip = Store.get('softhub_detected_ip');
        if (ip) {
          _discoverBc.postMessage({
            type: 'ark_here',
            fromAlias: Store.get('last_alias', 'This device'),
            hubIP: ip,
            hubPort: 8765
          });
        }
      }
    }, 4000);
  }

  // Validate that an IP is a private-range address (safe for LAN hub use)
  const _PRIVATE_IP_RE = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

  function _showJoinBanner(alias, ip, port) {
    // Validate IP is a private-range address before trusting it
    if (!ip || !_PRIVATE_IP_RE.test(ip)) return;
    // Don't show if already connected to a hub
    if (Store.get('hub_url')) return;
    // Don't show if WE are the hub
    if (isHub()) return;
    // Don't show if already dismissed this IP recently
    const dismissKey = 'ark_join_dismiss_' + ip;
    if (Store.get(dismissKey)) return;

    const bannerId = 'ark-join-banner';
    if (document.getElementById(bannerId)) return; // already showing

    const hubUrl = 'http://' + ip + ':' + (parseInt(port) || 8765);
    const displayAlias = alias || 'a nearby device';

    const banner = document.createElement('div');
    banner.id = bannerId;
    banner.style.cssText = [
      'position:fixed', 'bottom:calc(80px + env(safe-area-inset-bottom,0px))', 'left:50%', 'transform:translateX(-50%)',
      'z-index:9999', 'max-width:min(420px,calc(100vw - 32px))', 'width:100%',
      'background:linear-gradient(135deg,#2a2016 0%,#1a1208 100%)',
      'border:1.5px solid rgba(139,111,62,.55)', 'border-radius:20px',
      'padding:16px 20px', 'box-shadow:0 8px 40px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04) inset',
      'display:flex', 'align-items:center', 'gap:14px',
      'animation:slideUpBanner .35s cubic-bezier(.34,1.56,.64,1) both'
    ].join(';');

    banner.innerHTML = `
      <span style="font-size:1.6rem;flex-shrink:0">📡</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:700;color:#c9a86c;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px">ARK Found Nearby</div>
        <div style="font-size:.85rem;color:#e8dcc8;line-height:1.3"><strong>${_esc(displayAlias)}</strong> has an ARK hub on this network. Join to sync messages.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="ark-join-btn"
          style="background:var(--accent,#8b6f3e);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap">
          Join →
        </button>
        <button class="ark-dismiss-btn"
          style="background:transparent;color:rgba(200,180,150,.6);border:none;font-size:.75rem;cursor:pointer;padding:2px 0">
          Dismiss
        </button>
      </div>`;

    // Wire buttons via data attributes — avoids string interpolation XSS in onclick
    banner.querySelector('.ark-join-btn').dataset.hubUrl = hubUrl;
    banner.querySelector('.ark-join-btn').addEventListener('click', function() {
      Network.joinFromBanner(this.dataset.hubUrl);
      banner.remove();
    });
    banner.querySelector('.ark-dismiss-btn').dataset.dismissKey = dismissKey;
    banner.querySelector('.ark-dismiss-btn').addEventListener('click', function() {
      Store.set(this.dataset.dismissKey, '1');
      banner.remove();
    });

    document.body.appendChild(banner);

    // Auto-remove after 25 seconds
    setTimeout(() => { banner.remove(); }, 25000);
  }

  function _esc(s) { return String(s).replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c])); }

  return { init, stop, yield_to_external, isHub, peerCount, claimHubManually, startDiscovery: _startDiscovery };
})();

// === HUB COMMUNICATION ===
const Hub = {
  _syncing: false,
  _interval: null,
  get url() { return Store.get('hub_url', ''); },
  startAutoSync() {
    if (this._interval) clearInterval(this._interval);
    let secs = parseInt(Store.get('sync_interval', 60));
    // Low-power mode: minimum 5-minute sync regardless of setting
    if (Store.get('low_power', false) && secs > 0 && secs < 300) secs = 300;
    if (secs > 0) this._interval = setInterval(() => this.sync(), secs * 1000);
  },
  async sync(manual = false) {
    if (this._syncing) return;
    if (!this.url || Store.get('offline_mode', false)) {
      if (manual) Toast.show(Store.get('offline_mode', false) ? 'Offline mode is on — turn it off in Settings to sync' : 'No hub connected yet — set one up on the Network tab', 'warning', 4000);
      return;
    }
    this._syncing = true;
    const syncBtns = BtnLoading.all('button[onclick*="Hub.sync("]');
    syncBtns.forEach(b => BtnLoading.start(b, '⏳ Syncing…'));
    document.getElementById('messages-list')?.setAttribute('aria-busy', 'true');
    this.updateConnState('syncing');
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(this.url + '/api/messages?limit=100', {signal: ctrl.signal});
      clearTimeout(tid);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const msgs = data.messages || data || [];
      if (Array.isArray(msgs)) {
        for (const m of msgs) {
          if (m.id) await DB.put('messages', {
            id: String(m.id),
            alias: m.alias || 'Anonymous',
            channel: m.channel || 'general',
            body: m.body || m.text || '',
            location: m.location || '',
            urgent: !!m.urgent,
            ts: m.ts || m.createdAt || new Date().toISOString()
          });
        }
      }
      Store.set('last_sync', new Date().toISOString());
      // Determine reach state from /api/status peers count
      try {
        const statusCtrl = new AbortController();
        const statusTimer = setTimeout(() => statusCtrl.abort(), 5000);
        const sr = await fetch(this.url + '/api/status', {signal: statusCtrl.signal});
        clearTimeout(statusTimer);
        const st = sr.ok ? await sr.json() : null;
        const peerList = st?.peers || [];
        const peerCount = Array.isArray(peerList) ? peerList.length : (typeof peerList === 'number' ? peerList : 0);
        this.updateConnState(peerCount > 0 ? 'regional' : 'local');
        // Populate peers list UI
        const peersListEl = document.getElementById('peers-list');
        const peerBadge = document.getElementById('peer-count-badge');
        if (peerBadge) peerBadge.textContent = peerCount + ' peer' + (peerCount !== 1 ? 's' : '');
        // Update hero badge
        const heroPeers = document.getElementById('hero-sync-badge');
        if (heroPeers) heroPeers.textContent = peerCount + ' Peer' + (peerCount !== 1 ? 's' : '');
        if (peersListEl) {
          if (!Array.isArray(peerList) || peerList.length === 0) {
            peersListEl.innerHTML = '<div class="text-muted font-xs">No peers connected</div>';
          } else {
            peersListEl.innerHTML = peerList.map(p =>
              `<div class="peer-item"><span class="font-sm">${esc(p.alias||p.id||'Unknown')}</span><span class="badge badge-muted font-xs">${esc(p.channel||'general')}</span></div>`
            ).join('');
          }
        }
      } catch { this.updateConnState('local'); }
      this.updateSyncDisplay();
      if (UI.currentTab === 'messages') Messages.refresh();
      // Drain offline queue
      await this.drainQueue();
      if (manual) Toast.show('Synced with hub', 'success', 2500);
    } catch(e) {
      this.updateConnState(this.url ? 'error' : 'offline');
      if (Store.get('dev_mode')) console.warn('Hub sync error:', e);
      if (manual || Store.get('dev_mode')) {
        const hubAddr = this.url || 'unknown';
        const why = e && e.name === 'AbortError'
          ? 'Hub at ' + hubAddr + ' timed out — is the hub device on the same Wi-Fi?'
          : 'Could not reach hub at ' + hubAddr + ' — check the address and that the hub device is on';
        Toast.show(why + ' Your messages are saved and will retry.', 'warning', 6000);
      }
    } finally {
      this._syncing = false;
      syncBtns.forEach(b => BtnLoading.stop(b));
      document.getElementById('messages-list')?.setAttribute('aria-busy', 'false');
    }
  },
  async drainQueue() {
    const queue = Store.get('msg_queue', []);
    if (!queue.length || !this.url) return;
    const remaining = [];
    for (const msg of queue) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 10000);
      try {
        const r = await fetch(this.url + '/api/messages', {
          method: 'POST',
          headers: {'content-type':'application/json'},
          body: JSON.stringify(msg),
          signal: ctrl.signal
        });
        if (!r.ok) remaining.push(msg);
      } catch(e) { console.warn('Hub drainQueue:', e); remaining.push(msg); }
      finally { clearTimeout(tid); }
    }
    Store.set('msg_queue', remaining);
    Messages.updateQueueBadge();
  },
  // state: 'offline' | 'syncing' | 'local' | 'regional' | 'extended' | 'global' | 'error'
  updateConnState(state) {
    const pill = document.getElementById('conn-pill');
    const detail = document.getElementById('hub-status-detail');
    const labels = {
      offline:  { cls: 'conn-offline',   text: 'OFFLINE',    detail: 'Not connected to any hub.' },
      syncing:  { cls: 'conn-syncing',   text: 'SYNCING…',   detail: 'Connecting to hub…' },
      local:    { cls: 'conn-local',     text: 'CONNECTED',  detail: 'Connected to a hub on this network.' },
      regional: { cls: 'conn-regional',  text: 'REGIONAL',   detail: 'Hub has online peers nearby.' },
      extended: { cls: 'conn-extended',  text: 'EXTENDED',   detail: 'Multi-hop mesh reachable.' },
      global:   { cls: 'conn-global',    text: 'GLOBAL',     detail: 'Internet gateway available.' },
      error:    { cls: 'conn-error',     text: 'ERROR',      detail: 'Hub unreachable' + (this.url ? ' (' + this.url + ')' : '') + ' — check URL and Wi-Fi.' },
    };
    const cfg = labels[state] || labels.offline;
    if (pill) {
      pill.className = 'conn-pill ' + cfg.cls; pill.textContent = cfg.text;
      pill.title = cfg.detail + ' Tap for connection details';
      pill.setAttribute('aria-label', 'Connection: ' + cfg.text + '. Show connection details');
    }
    if (detail) detail.textContent = cfg.detail;
    // Show/hide disconnect button in Network tab
    const disconnBtn = document.getElementById('hub-disconnect-btn');
    if (disconnBtn) {
      const connected = state === 'local' || state === 'regional' || state === 'extended' || state === 'global';
      disconnBtn.style.display = connected ? '' : 'none';
    }
    // Update hero status badge
    const heroStatus = document.getElementById('hero-status-badge');
    if (heroStatus) {
      const connected = state === 'local' || state === 'regional' || state === 'extended' || state === 'global';
      if (connected) {
        heroStatus.textContent = '● Connected';
        heroStatus.className = 'hero-badge active';
      } else if (state === 'syncing') {
        heroStatus.textContent = '◎ Syncing…';
        heroStatus.className = 'hero-badge';
      } else if (state === 'error') {
        heroStatus.textContent = '⚠ Hub Error';
        heroStatus.className = 'hero-badge';
      } else {
        // offline — neutral badge; "Offline Ready" means the app works, not that we're connected
        heroStatus.textContent = '◌ Offline Ready';
        heroStatus.className = 'hero-badge';
      }
    }
    // Show/hide heartbeat row in Network tab
    const hbRow = document.getElementById('hub-heartbeat-row');
    const hbLabel = document.getElementById('hub-heartbeat-label');
    if (hbRow && hbLabel) {
      const isConnected = state === 'local' || state === 'regional' || state === 'extended' || state === 'global';
      hbRow.style.display = isConnected ? '' : 'none';
      if (isConnected) {
        const ls = Store.get('last_sync');
        hbLabel.textContent = ls ? 'Last heartbeat: ' + Hub._relativeTime(ls) : 'Hub alive';
      }
    }
    // Update wifi-status badge in Network tab
    const wifiEl = document.getElementById('wifi-status');
    if (wifiEl) {
      if (state === 'local' || state === 'regional' || state === 'extended' || state === 'global') {
        wifiEl.textContent = '✓ Connected';
        wifiEl.className = 'badge badge-green';
      } else if (state === 'error') {
        wifiEl.textContent = '✗ Error';
        wifiEl.className = 'badge badge-red';
      } else if (state === 'offline') {
        wifiEl.textContent = '✗ No Hub';
        wifiEl.className = 'badge badge-red';
      } else {
        wifiEl.textContent = 'Syncing…';
        wifiEl.className = 'badge badge-blue';
      }
    }
  },
  // Legacy shim — keep callers that still pass a color+text pair working
  updateStatusDot(color, text) {
    if (color === 'green') this.updateConnState('local');
    else if (color === 'yellow') this.updateConnState('syncing');
    else if (color === 'red') this.updateConnState('offline');
    else this.updateConnState('offline');
  },
  updateSyncDisplay() {
    const ls = Store.get('last_sync');
    const syncText = ls ? 'Last synced: ' + this._relativeTime(ls) : 'Never synced';
    const el = document.getElementById('last-sync-display');
    const urlEl = document.getElementById('hub-url-display');
    if (el) el.textContent = ls ? 'Last sync: ' + new Date(ls).toLocaleString() : 'Never synced';
    if (urlEl) urlEl.textContent = this.url ? 'Hub: ' + this.url : 'Hub: not configured';
    // Update Network tab sync/interval display
    const netSyncEl = document.getElementById('net-last-sync');
    if (netSyncEl) netSyncEl.textContent = syncText;
    const secs = parseInt(Store.get('sync_interval', 60));
    const netIntervalEl = document.getElementById('net-sync-interval');
    if (netIntervalEl) {
      netIntervalEl.textContent = secs === 0 ? 'Manual sync only' : 'Auto-sync every ' + (secs >= 60 ? Math.round(secs/60) + ' min' : secs + 's');
    }
    // Show/hide appropriate home-tab hub buttons
    const syncBtn = document.getElementById('hub-sync-btn');
    const connectBtn = document.getElementById('hub-connect-btn');
    if (syncBtn) syncBtn.style.display = this.url ? '' : 'none';
    if (connectBtn) connectBtn.style.display = this.url ? 'none' : '';
    // Update heartbeat label with fresh relative time
    const hbLabel = document.getElementById('hub-heartbeat-label');
    if (hbLabel && ls) hbLabel.textContent = 'Last heartbeat: ' + this._relativeTime(ls);
    // Update Network tab QR share card visibility
    if (typeof Network !== 'undefined' && Network._updateHubDeployUI) Network._updateHubDeployUI();
  },
  _relativeTime(isoStr) {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + ' min ago';
    if (diff < 86400) return Math.floor(diff/3600) + ' hr ago';
    return new Date(isoStr).toLocaleString();
  },
  disconnect() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    Store.del('hub_url');
    this.updateConnState('offline');
    this.updateSyncDisplay();
    // Clear both hub URL inputs
    const ni = document.getElementById('hub-url-input'); if (ni) ni.value = '';
    const si = document.getElementById('set-hub-url'); if (si) si.value = '';
    Toast.show('Disconnected from hub', 'info', 2500);
  },
  async post(msg) {
    if (!this.url || Store.get('offline_mode', false)) {
      this.queueMsg(msg);
      return false;
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(this.url + '/api/messages', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify(msg),
        signal: ctrl.signal
      });
      return r.ok;
    } catch(e) {
      this.queueMsg(msg);
      return false;
    } finally {
      clearTimeout(tid);
    }
  },
  queueMsg(msg) {
    const q = Store.get('msg_queue', []);
    q.push(msg);
    Store.set('msg_queue', q);
    Messages.updateQueueBadge();
  }
};

// === MESSAGES ===
const Messages = {
  _channel: 'all',
  _searchTerm: '',
  _page: 0,
  _pageSize: 20,

  async post() {
    // Prevent double-send on rapid taps
    const postBtn = document.querySelector('button[onclick="Messages.post()"]');
    if (postBtn && postBtn.disabled) return;

    const alias = document.getElementById('msg-alias').value.trim() || 'Anonymous';
    const channel = document.getElementById('msg-channel').value;
    const body = document.getElementById('msg-text').value.trim();
    const location = document.getElementById('msg-location').value.trim();
    const urgent = document.getElementById('msg-urgent').checked;

    if (!body) { Toast.show('Please type a message before posting', 'error'); return; }
    if (body.length < 3) { Toast.show('Message is too short — add more detail', 'error'); return; }
    // Hard cap to prevent runaway pastes (HTML maxlength can be bypassed)
    if (body.length > 1000) { Toast.show('Message is too long — keep it under 1000 characters', 'error'); return; }

    BtnLoading.start(postBtn, '⏳ Posting…');
    try {
      Store.set('last_alias', alias);
      const msg = {
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        alias, channel, body, location, urgent,
        ts: new Date().toISOString()
      };

      // Save locally (with fallback warning if IDB is unavailable)
      const saved = await DB.put('messages', msg);
      if (saved === undefined) {
        // DB.put swallows IDB errors; warn but continue so the queue still carries it
        Toast.show('⚠️ Local storage unavailable — message queued for hub only', 'warning', 5000);
      }

      // Try to post to hub
      const sent = await Hub.post(msg);
      if (sent) Toast.show('✅ Message posted — neighbors with hubs will see it', 'success');
      else Toast.show('💾 Message saved on your device — will send when you connect to a hub', 'info', 5000);

      const msgTextEl = document.getElementById('msg-text');
      if (msgTextEl) { msgTextEl.value = ''; msgTextEl.focus(); }
      const msgLocEl = document.getElementById('msg-location'); if (msgLocEl) msgLocEl.value = '';
      const msgUrgEl = document.getElementById('msg-urgent'); if (msgUrgEl) msgUrgEl.checked = false;
      this.refresh();
      // Scroll messages list to top so the new message is visible
      const listEl = document.getElementById('messages-list');
      if (listEl) listEl.scrollTop = 0;
    } finally {
      BtnLoading.stop(postBtn);
      // Re-sync disabled state after BtnLoading restores button (textarea is now empty)
      const ta = document.getElementById('msg-text');
      if (ta) this._onTextInput(ta);
    }
  },

  async postSafe() {
    const safeBtn = document.querySelector('button[onclick="Messages.postSafe()"]');
    if (safeBtn && safeBtn.disabled) return;
    BtnLoading.start(safeBtn, '⏳ Posting…');
    try {
      const alias = document.getElementById('msg-alias').value.trim() ||
                    Store.get('last_alias', 'Anonymous');
      const msg = {
        id: 'local_safe_' + Date.now(),
        alias, channel: 'safe',
        body: alias + ' is safe. ' + new Date().toLocaleString(),
        urgent: false, ts: new Date().toISOString()
      };
      await DB.put('messages', msg);
      await Hub.post(msg);
      Toast.show('✅ Safe status posted', 'success');
      this.refresh();
    } finally {
      BtnLoading.stop(safeBtn);
    }
  },

  async refresh() {
    const all = await DB.getAll('messages');
    all.sort((a, b) => new Date(b.ts) - new Date(a.ts));

    // Update hero badge + btb badge with total message count
    const heroMsgs = document.getElementById('hero-msgs-badge');
    if (heroMsgs) heroMsgs.textContent = all.length + ' Message' + (all.length !== 1 ? 's' : '');
    // btb unread badge: messages not from self
    const myAlias = Store.get('alias', '');
    const unread = all.filter(m => m.alias !== myAlias).length;
    const btbBadge = document.getElementById('btb-msg-badge');
    if (btbBadge) {
      const btn = btbBadge.closest('.btb-btn');
      if (unread > 0 && UI && UI.currentTab !== 'messages') {
        if (btn) btn.classList.add('has-badge');
      } else {
        if (btn) btn.classList.remove('has-badge');
      }
    }

    let filtered = all;
    if (this._channel !== 'all') filtered = all.filter(m => m.channel === this._channel);
    if (this._searchTerm) {
      const q = this._searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        (m.body || '').toLowerCase().includes(q) ||
        (m.alias || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (m.channel || '').toLowerCase().includes(q)
      );
    }

    const page = filtered.slice(0, this._pageSize * (this._page + 1));
    const list = document.getElementById('messages-list');
    if (!list) return;

    // Show/hide load-more button
    const lmWrap = document.getElementById('load-more-wrap');
    if (lmWrap) lmWrap.style.display = filtered.length > page.length ? '' : 'none';

    if (!page.length) {
      // Show the rich empty state if present, else fallback text
      const emptyState = document.getElementById('msg-empty-state');
      if (emptyState) {
        list.innerHTML = '';
        list.appendChild(emptyState);
        emptyState.style.display = '';
      } else {
        list.innerHTML = '<div class="text-secondary font-sm" style="padding:16px 0">No messages yet. To post, type in the message box above and press Post Message. To receive community messages, connect to a hub on the Network tab and tap Sync Now.</div>';
      }
      return;
    }

    // Hide the empty state if it was showing
    const emptyState = document.getElementById('msg-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    list.innerHTML = page.map(m => {
      const ago = this.timeAgo(m.ts);
      const ch = m.channel || 'general';
      const chColors = {help:'red',safe:'green',offers:'blue',missing:'yellow',reunification:'yellow',general:'',resources:'blue',medical:'red',water:'blue',power:'yellow',shelter:'green'};
      const chLabel = {help:'🆘 Help',safe:'✅ Safe',offers:'🤝 Offers',missing:'🔍 Missing',reunification:'👨‍👩‍👧 Reunification',general:'💬 General',resources:'📦 Resources',medical:'🏥 Medical',water:'💧 Water',power:'⚡ Power',shelter:'🏠 Shelter'};
      const cc = chColors[ch] || '';
      // Show delivery warning for locally-originated messages not yet confirmed by hub
      const isLocal = m.id && m.id.startsWith('local_');
      const deliveryWarn = isLocal ? '<span class="badge badge-yellow" title="Not yet confirmed by hub — will sync when hub is reachable">⏳ Pending sync</span>' : '';
      const acked = MsgAck.isAcked(m.id);
      const ackCount = MsgAck.getCount(m.id);
      return `<div class="msg-item ${m.urgent ? 'msg-urgent' : ''} ${acked ? 'msg-acked' : ''}">
        <div class="msg-header">
          <span class="msg-alias">${esc(m.alias || 'Anonymous')}</span>
          <span class="badge badge-${cc || 'orange'}">${chLabel[ch] || esc(ch)}</span>
          ${m.urgent ? '<span class="badge badge-red">🚨 URGENT</span>' : ''}
          ${deliveryWarn}
          <span class="msg-time">${ago}</span>
          ${m.location ? `<span class="font-xs text-muted">📍 ${esc(m.location)}</span>` : ''}
        </div>
        <div class="msg-body">${esc(m.body)}</div>
        <div class="msg-actions">
          <button class="btn btn-ghost btn-xs ${acked ? 'msg-ack-active' : ''}" onclick="MsgAck.toggle('${esc(m.id)}');Messages.refresh()" title="${acked ? 'Acknowledged — click to remove' : 'Acknowledge this message'}">
            ${acked ? '✅ Acked' : '👍 Ack'}${ackCount > 1 ? ` <span class="ack-count">${ackCount}</span>` : ''}
          </button>
          <button class="btn btn-ghost btn-xs" onclick="Messages.prefillReply(${JSON.stringify(m.alias||'Anonymous')}, ${JSON.stringify(m.channel||'general')})" title="Reply in channel">↩ Reply</button>
        </div>
      </div>`;
    }).join('');
  },

  setChannel(ch) {
    this._channel = ch;
    this._page = 0;
    document.querySelectorAll('.ch-tab').forEach(t => {
      const isActive = t.dataset.ch === ch;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    this.refresh();
  },

  search() {
    const bar = document.getElementById('msg-search-bar');
    if (!bar) return;
    const isHiding = !bar.classList.contains('hidden');
    bar.classList.toggle('hidden');
    const inp = document.getElementById('msg-search-input');
    if (isHiding) {
      // Closing the bar — clear any active search so results are not left filtered
      if (inp) inp.value = '';
      this._searchTerm = '';
      this.refresh();
    } else if (inp) {
      inp.focus();
    }
  },

  filterSearch() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      const srchEl = document.getElementById('msg-search-input'); this._searchTerm = srchEl ? srchEl.value : '';
      this.refresh();
    }, 200);
  },

  loadMore() {
    this._page++;
    this.refresh();
  },

  exportTxt() {
    DB.getAll('messages').then(msgs => {
      msgs.sort((a,b) => new Date(a.ts) - new Date(b.ts));
      const txt = msgs.map(m =>
        `[${m.ts}] [${m.channel}]${m.urgent?' [URGENT]':''} ${m.alias||'Anonymous'}: ${m.body}${m.location?' — '+m.location:''}`
      ).join('\n');
      download('ARK-messages-' + new Date().toISOString().slice(0,10) + '.txt', txt, 'text/plain');
      Toast.show('📄 Messages saved to your downloads', 'success');
    });
  },

  exportBundle() {
    DB.getAll('messages').then(msgs => {
      const bundle = {protocol:'ARK-RELAY-1',exportedAt:new Date().toISOString(),packets:msgs};
      download('ARK-bundle-' + Date.now() + '.json', JSON.stringify(bundle,null,2), 'application/json');
      Toast.show('📦 Message bundle saved — ready to share', 'success');
    });
  },

  importBundleUI() {
    const area = document.getElementById('bundle-import-area');
    if (area) area.classList.toggle('hidden');
  },

  async importBundle() {
    const txt = document.getElementById('bundle-paste').value.trim();
    if (!txt) {
      document.getElementById('bundle-file').click();
      return;
    }
    try {
      const bundle = JSON.parse(txt);
      await this._applyBundle(bundle);
    } catch(e) {
      Toast.show('That doesn\'t look like a valid message bundle — please try again', 'error');
    }
  },

  async handleBundleFile(input) {
    const file = input.files[0];
    if (!file) return;
    const txt = await file.text();
    try {
      const bundle = JSON.parse(txt);
      await this._applyBundle(bundle);
    } catch(e) {
      Toast.show('That file doesn\'t look right — please choose a valid ARK bundle', 'error');
    }
  },

  async _applyBundle(bundle) {
    const packets = bundle.packets || [];
    let count = 0;
    for (const p of packets) {
      if (p.id && p.body) { await DB.put('messages', p); count++; }
    }
    Toast.show(`✅ Imported ${count} message${count !== 1 ? 's' : ''} from bundle`, 'success');
    const bpEl = document.getElementById('bundle-paste'); if (bpEl) bpEl.value = '';
    const biaEl = document.getElementById('bundle-import-area'); if (biaEl) biaEl.classList.add('hidden');
    this.refresh();
  },

  updateQueueBadge() {
    const q = Store.get('msg_queue', []);
    const badge = document.getElementById('queue-badge');
    if (!badge) return;
    if (q.length > 0) {
      badge.textContent = q.length + ' queued';
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  timeAgo(iso) {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.round(m / 60) + 'h ago';
    return Math.round(m / 1440) + 'd ago';
  },

  prefillReply(toAlias, channel) {
    // Switch to correct channel and pre-fill alias reference in text
    const chEl = document.getElementById('msg-channel');
    if (chEl && channel) chEl.value = channel;
    const textEl = document.getElementById('msg-text');
    if (textEl) {
      textEl.value = `@${toAlias} `;
      this._onTextInput(textEl);
      textEl.focus();
      textEl.setSelectionRange(textEl.value.length, textEl.value.length);
    }
    // Scroll to the compose form
    document.getElementById('msg-alias')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  _onTextInput(ta) {
    const len = (ta && ta.value) ? ta.value.length : 0;
    const counter = document.getElementById('msg-char-counter');
    if (counter) {
      counter.textContent = len + ' / 1000';
      counter.style.color = len > 900 ? 'var(--red)' : len > 700 ? 'var(--yellow)' : '';
    }
    const btn = document.getElementById('msg-post-btn');
    if (btn) btn.disabled = len < 1;
  },

  clearSearch() {
    const inp = document.getElementById('msg-search-input');
    if (inp) { inp.value = ''; inp.focus(); }
    this._searchTerm = '';
    this.refresh();
  }
};

// === GUIDES ===
const Guides = {
  _inited: false,
  _cat: 'all',
  _bookmarks: null,

  _loadBookmarks() {
    if (!this._bookmarks) this._bookmarks = Store.get('guide_bookmarks', []);
    return this._bookmarks;
  },

  _saveBookmarks() {
    Store.set('guide_bookmarks', this._bookmarks);
  },

  isBookmarked(slug) {
    return this._loadBookmarks().includes(slug);
  },

  toggleBookmark(slug) {
    const bm = this._loadBookmarks();
    const idx = bm.indexOf(slug);
    if (idx === -1) bm.push(slug);
    else bm.splice(idx, 1);
    this._saveBookmarks();
    this.render();
    Toast.show(idx === -1 ? '⭐ Guide bookmarked' : 'Bookmark removed', 'info', 2000);
  },

  printGuide(slug) {
    const g = ARK_GUIDES.find(x => x.slug === slug);
    if (!g) return;
    const steps = g.quickSteps.map((s,i) => `<li>${i+1}. ${s}</li>`).join('');
    const sections = (g.sections||[]).map(s => `<h4>${s.heading}</h4>${s.body.map(p=>`<p>${p}</p>`).join('')}`).join('');
    const sources = g.sources ? `<p><small>Sources: ${g.sources.map(s=>s.url?`${s.label} (${s.url})`:s.label).join(' · ')}</small></p>` : '';
    const w = window.open('','_blank','width=700,height=900');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${g.title}</title><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;line-height:1.6}h1{font-size:1.3rem}h4{margin-top:1rem}li{margin-bottom:.4rem}@media print{}</style></head><body><h1>${g.title}</h1><p><em>${g.summary}</em></p><p><strong>Last updated:</strong> ${g.updated||'2024'}</p><h3>Key steps:</h3><ol>${steps}</ol>${sections}${sources}</body></html>`);
    w.document.close();
    w.print();
  },

  shareGuide(slug) {
    const g = ARK_GUIDES.find(x => x.slug === slug);
    if (!g) return;
    const text = `📚 ARK Guide: ${g.title}\n${g.summary}\n\nKey steps:\n${g.quickSteps.map((s,i)=>`${i+1}. ${s}`).join('\n')}`;
    if (navigator.share) {
      navigator.share({title: g.title, text}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(()=>Toast.show('📋 Guide copied to clipboard','success',2500)).catch(()=>{
        Modal.open(`<pre style="white-space:pre-wrap;font-size:12px">${esc(text)}</pre><button class="btn btn-primary mt-8" onclick="Modal.close()">Close</button>`, 'Share Guide');
      });
    }
  },

  init() {
    if (this._inited) return;
    this._inited = true;
    // FIX: Do NOT call Radio.initPhonetic() here — that belongs only in Radio.init()
    this.render();
    // Category nav
    document.querySelectorAll('.guide-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._cat = btn.dataset.cat;
        document.querySelectorAll('.guide-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });
  },

  render() {
    const q = (document.getElementById('guide-search') || {}).value || '';
    const container = document.getElementById('guides-container');
    if (!container) return;
    let guides = ARK_GUIDES;
    if (this._cat === '__bookmarks__') {
      const bm = this._loadBookmarks();
      guides = guides.filter(g => bm.includes(g.slug));
    } else if (this._cat !== 'all') {
      guides = guides.filter(g => g.category === this._cat);
    }
    if (q) {
      const ql = q.toLowerCase();
      guides = guides.filter(g =>
        g.title.toLowerCase().includes(ql) ||
        g.summary.toLowerCase().includes(ql) ||
        (g.quickSteps||[]).some(s => s.toLowerCase().includes(ql)) ||
        (g.sections||[]).some(s => s.heading.toLowerCase().includes(ql) || s.body.some(b=>b.toLowerCase().includes(ql)))
      );
    }
    // Update count badge — show filtered count vs total
    const badge = document.getElementById('guide-count-badge');
    if (badge) {
      if (this._cat === 'all' && !q) {
        badge.textContent = `(${ARK_GUIDES.length} guides)`;
      } else {
        badge.textContent = `(${guides.length} of ${ARK_GUIDES.length} guides)`;
      }
    }
    if (!guides.length) {
      const msg = q ? 'No guides match your search.' : (this._cat === '__bookmarks__' ? 'No bookmarked guides yet. Click ⭐ on any guide to bookmark it.' : 'No guides in this category.');
      container.innerHTML = `<div class="text-secondary font-sm" style="padding:24px 0;text-align:center">${msg}</div>`;
      return;
    }
    container.innerHTML = guides.map(g => this.renderGuide(g, q)).join('');
  },

  _highlight(text, q) {
    const escaped = esc(text);
    if (!q) return escaped;
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      return escaped.replace(new RegExp('(' + safeQ + ')', 'gi'),
        '<mark class="guide-search-highlight">$1</mark>');
    } catch(e) { return escaped; }
  },

  renderGuide(g, q) {
    const h = (t) => this._highlight(t, q);
    const steps = g.quickSteps.map(s => `<li>${h(s)}</li>`).join('');
    const sections = (g.sections || []).map(s =>
      `<div class="guide-section"><h4>${h(s.heading)}</h4>${s.body.map(p => `<p>${h(p)}</p>`).join('')}</div>`
    ).join('');
    const sources = g.sources ? `<div class="guide-sources">Sources: ${g.sources.map(s => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>` : esc(s.label)).join(' · ')}</div>` : '';
    const isBookmarked = this.isBookmarked(g.slug);
    const bmLabel = isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark';
    const bmClass = isBookmarked ? 'bookmarked' : '';
    const updated = g.updated ? `<span class="guide-updated">Updated: ${esc(g.updated)}</span>` : '';
    const seeAlso = (g.seeAlso && g.seeAlso.length) ? `<div class="guide-seealso">See also: ${g.seeAlso.map(s=>{const ref=ARK_GUIDES.find(x=>x.slug===s);return ref?`<a href="#" onclick="Guides._openBySlug('${esc(s)}');return false">${esc(ref.title)}</a>`:esc(s);}).join(', ')}</div>` : '';
    return `<div class="guide-article" id="guide-${esc(g.slug)}">
      <div class="guide-toggle" onclick="const b=this.parentElement.querySelector('.guide-body');b.classList.toggle('open');this.setAttribute('aria-expanded',b.classList.contains('open'))" aria-expanded="false" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){this.click();event.preventDefault()}">
        <div style="flex:1;min-width:0">
          <div class="guide-meta-row">
            <span class="guide-title">${h(g.title)}</span>
            <span class="guide-offline-badge">✓ Offline</span>
            ${updated}
          </div>
          <div class="guide-summary">${h(g.summary)}</div>
        </div>
        <span class="guide-toggle-chevron" aria-hidden="true">▾</span>
      </div>
      <div class="guide-body">
        <div class="font-sm bold text-accent mt-8 mb-8">Do these first:</div>
        <ol class="guide-steps">${steps}</ol>
        ${sections}
        ${seeAlso}
        ${sources}
        <div class="guide-actions">
          <button class="${bmClass}" onclick="Guides.toggleBookmark('${esc(g.slug)}')" title="Bookmark this guide">${bmLabel}</button>
          <button onclick="Guides.printGuide('${esc(g.slug)}')" title="Print this guide">🖨️ Print</button>
          <button onclick="Guides.shareGuide('${esc(g.slug)}')" title="Share this guide">📤 Share</button>
        </div>
      </div>
    </div>`;
  },

  _openBySlug(slug) {
    // Switch to All, then scroll and open the guide
    this._cat = 'all';
    document.querySelectorAll('.guide-cat-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.guide-cat-btn[data-cat="all"]');
    if (allBtn) allBtn.classList.add('active');
    const searchEl = document.getElementById('guide-search');
    if (searchEl) searchEl.value = '';
    this.render();
    setTimeout(() => {
      const el = document.getElementById('guide-' + slug);
      if (el) {
        el.scrollIntoView({behavior:'smooth', block:'start'});
        const body = el.querySelector('.guide-body');
        if (body && !body.classList.contains('open')) body.classList.add('open');
      }
    }, 50);
  },

  search() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.render(), 200);
  }
};

// === RESOURCES ===
const Resources = {
  _defaults: {water:0, food:0, fuel:0, medical:0, shelter:0, power:0, notes:''},
  _data: null,

  load() {
    this._data = Store.get('resources', {...this._defaults});
    return this._data;
  },

  render() {
    const d = this.load();
    const container = document.getElementById('resource-meters');
    if (!container) return;

    const items = [
      {key:'water',   label:'💧 Water',   unit:'gal',  max:50},
      {key:'food',    label:'🍽️ Food',    unit:'days', max:30},
      {key:'fuel',    label:'⛽ Fuel',    unit:'gal',  max:20},
      {key:'medical', label:'🏥 Medical', unit:'/5',   max:5},
      {key:'shelter', label:'🏠 Shelter', unit:'ppl',  max:20},
      {key:'power',   label:'🔋 Power',   unit:'hrs',  max:72},
    ];

    // Calculate days-of-supply annotations
    const hhCount = Math.max(1, parseInt(Store.get('household', {}).count) || 1);
    // Water: ~1 gal/person/day (FEMA standard)
    const waterDays = d.water > 0 ? Math.floor(d.water / hhCount) : 0;
    // Food: already in days (per household)
    const foodDays = Number(d.food) > 0 ? Math.floor(Number(d.food)) : 0;
    // Power: convert hours to days+hours for readability
    const powerHrs = Number(d.power) || 0;
    const powerDays = Math.floor(powerHrs / 24);
    const powerRemHrs = powerHrs % 24;

    // Low stock warning: show only after the user has saved at least once
    const hasEverSaved = !!Store.get('resources_updated');
    const lowItems = hasEverSaved ? items.filter(it => {
      const v = Number(d[it.key]);
      if (isNaN(v) || it.key === 'shelter') return false; // shelter capacity is not a consumable
      return (v / it.max) * 100 < 25;
    }) : [];

    // Empty state: never saved
    if (!hasEverSaved) {
      container.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--text-secondary)">
        <div style="font-size:36px;margin-bottom:8px">📦</div>
        <div style="font-weight:600;margin-bottom:4px">No inventory saved yet</div>
        <div style="font-size:13px">Tap <strong>Update Inventory</strong> below to record your supplies.</div>
      </div>`;
    } else {
      // Survival duration summary banner
      let survivalBanner = '';
      if (waterDays > 0 || foodDays > 0) {
        const minDays = Math.min(waterDays || 999, foodDays || 999);
        const effDays = minDays === 999 ? (waterDays || foodDays) : minDays;
        let survColor = effDays >= 14 ? 'var(--green)' : effDays >= 3 ? 'var(--yellow)' : 'var(--red)';
        let survBg = effDays >= 14 ? 'var(--green-bg)' : effDays >= 3 ? 'var(--yellow-bg)' : 'var(--red-bg)';
        let survLabel = effDays >= 14 ? '✅ Well stocked' : effDays >= 3 ? '⚠️ Moderate supply' : '🚨 Critical — restock now';
        survivalBanner = `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;background:${survBg};border:1px solid ${survColor};margin-bottom:12px">
          <div style="font-size:13px;font-weight:600;color:${survColor}">${survLabel}</div>
          <div style="font-size:13px;font-weight:700;color:${survColor}">~${effDays}d / ${hhCount} ${hhCount===1?'person':'people'}</div>
        </div>`;
      }

      container.innerHTML = (lowItems.length ? `<div class="alert alert-warn mb-8" role="alert" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:6px;background:var(--warn-bg,#7c4a001a);border:1px solid var(--warn-border,#d97706);color:var(--warn-text,#92400e)"><span>⚠️</span><span>Low stock: ${lowItems.map(i=>i.label).join(', ')}</span></div>` : '') +
      survivalBanner +
      items.map(it => {
        let val = Number(d[it.key]);
        if (isNaN(val) || val < 0) val = 0;
        val = Math.min(val, it.max * 2);
        const pct = Math.min(100, (val / it.max) * 100);
        // Percentage-based color: red <25%, yellow 25-50%, green >=50%
        let barClass = 'bar-green';
        if (pct < 25) barClass = 'bar-red';
        else if (pct < 50) barClass = 'bar-yellow';
        let display = it.key === 'medical' ? val + '/5' : val + ' ' + it.unit;
        let extra = '';
        if (it.key === 'water' && waterDays > 0) extra = `<span class="resource-days"> (~${waterDays}d/${hhCount}p)</span>`;
        else if (it.key === 'food' && foodDays > 0) extra = `<span class="resource-days"> (${foodDays}d total)</span>`;
        else if (it.key === 'power' && powerDays > 0) extra = `<span class="resource-days"> (${powerDays}d ${powerRemHrs}h)</span>`;
        return `<div class="resource-row">
          <span class="resource-label">${it.label}</span>
          <div class="resource-bar-wrap"><div class="resource-bar ${barClass}" style="width:${pct}%"></div></div>
          <span class="resource-val">${display}${extra}</span>
        </div>`;
      }).join('') +
      (d.notes ? `<div style="margin-top:10px;padding:8px 10px;background:var(--bg-elevated);border-radius:6px;font-size:13px;color:var(--text-secondary)"><span style="font-weight:600">📝 Notes:</span> ${d.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '');
    }

    const upd = Store.get('resources_updated');
    const el = document.getElementById('resources-updated');
    if (el) el.textContent = upd ? 'Updated: ' + new Date(upd).toLocaleString() : 'Not yet updated';

    // Render history panel
    const histEl = document.getElementById('res-history');
    if (histEl) {
      const hist = Store.get('res_history', []);
      if (!hist.length) {
        histEl.textContent = 'No history yet — save a snapshot to track changes.';
      } else {
        histEl.innerHTML = hist.map(h => {
          const when = h.ts ? new Date(h.ts).toLocaleString() : '?';
          return `<div style="margin-bottom:6px"><span style="color:var(--text-muted)">${when}</span> — Water ${h.water||0}gal · Food ${h.food||0}d · Fuel ${h.fuel||0}gal · Medical ${h.medical||0}/5 · Shelter ${h.shelter||0}ppl · Power ${h.power||0}hrs</div>`;
        }).join('');
      }
    }
  },

  openEdit() {
    const d = this.load();
    const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    setVal('res-water', d.water); setVal('res-food', d.food); setVal('res-fuel', d.fuel);
    setVal('res-medical', d.medical); setVal('res-shelter', d.shelter); setVal('res-power', d.power);
    setVal('res-notes', d.notes);
    const recEl = document.getElementById('resource-edit-card'); if (recEl) recEl.classList.remove('hidden');
  },

  closeEdit() {
    const el = document.getElementById('resource-edit-card'); if (el) el.classList.add('hidden');
  },

  save() {
    const getVal = (id, def) => { const e = document.getElementById(id); return e ? e.value : String(def); };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const raw = {
      water:   parseFloat(getVal('res-water', 0)),
      food:    parseFloat(getVal('res-food', 0)),
      fuel:    parseFloat(getVal('res-fuel', 0)),
      medical: parseInt(getVal('res-medical', 0), 10),
      shelter: parseInt(getVal('res-shelter', 0), 10),
      power:   parseFloat(getVal('res-power', 0)),
    };
    // D2+D3: floor negatives to 0; cap each field at a sane maximum; guard NaN
    const d = {
      water:   clamp(isNaN(raw.water)   ? 0 : raw.water,   0, 9999),
      food:    clamp(isNaN(raw.food)    ? 0 : raw.food,    0, 9999),
      fuel:    clamp(isNaN(raw.fuel)    ? 0 : raw.fuel,    0, 9999),
      medical: clamp(isNaN(raw.medical) ? 0 : raw.medical, 0, 5),
      shelter: clamp(isNaN(raw.shelter) ? 0 : raw.shelter, 0, 9999),
      power:   clamp(isNaN(raw.power)   ? 0 : raw.power,   0, 9999),
      notes:   getVal('res-notes', '').trim().slice(0, 500) // enforce textarea maxlength in JS too
    };
    Store.set('resources', d);
    Store.set('resources_updated', new Date().toISOString());

    // Append history
    const hist = Store.get('res_history', []);
    hist.unshift({...d, ts: new Date().toISOString()});
    if (hist.length > 10) hist.pop();
    Store.set('res_history', hist);

    this.closeEdit();
    this.render();
    Toast.show('✅ Inventory updated and saved', 'success');
  },

  shareWithHub() {
    const d = this.load();
    // D6: strip control characters and newlines from notes before embedding in hub packet body
    const safeNotes = d.notes ? '. ' + String(d.notes).replace(/[\r\n\t]/g, ' ').slice(0, 200) : '';
    Hub.post({
      id: 'res_' + Date.now(),
      alias: Store.get('last_alias', 'Household'),
      channel: 'resources',
      body: `Resource update: Water ${d.water}gal, Food ${d.food}d, Fuel ${d.fuel}gal, Medical ${d.medical}/5, Shelter ${d.shelter}ppl${safeNotes}`,
      ts: new Date().toISOString()
    }).then(ok => Toast.show(ok ? '✅ Shared with your hub community' : 'Could not reach hub — will retry when you reconnect', ok ? 'success' : 'info'));
  },

  printReport() {
    window.print();
  },

  loadPreset(type) {
    // FEMA-based presets for 1 person — user adjusts for household size
    const presets = {
      '72hr':  {water:3,  food:3,  fuel:1,  medical:2, shelter:4, power:8,  notes:'72-hour emergency kit — FEMA baseline for 1 person. Multiply water and food by household size.'},
      '2week': {water:14, food:14, fuel:5,  medical:3, shelter:6, power:48, notes:'2-week extended preparedness supply for 1 person. Adjust quantities for your household.'},
      'month': {water:30, food:30, fuel:10, medical:4, shelter:8, power:120,notes:'30-day long-term preparedness plan for 1 person. Scale up for your full household.'},
    };
    const p = presets[type];
    if (!p) return;
    // Open the edit form first
    this.openEdit();
    // Then fill preset values
    const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    setVal('res-water', p.water); setVal('res-food', p.food); setVal('res-fuel', p.fuel);
    setVal('res-medical', p.medical); setVal('res-shelter', p.shelter); setVal('res-power', p.power);
    setVal('res-notes', p.notes);
    const labels = {'72hr':'72-Hour Kit', '2week':'2-Week Supply', 'month':'30-Day Plan'};
    Toast.show(`📋 Loaded ${labels[type]} preset — adjust quantities for your household`, 'info', 3500);
  },

  exportJSON() {
    const d = this.load();
    const hist = Store.get('res_history', []);
    const payload = JSON.stringify({resources: d, history: hist, exported: new Date().toISOString()}, null, 2);
    try {
      const blob = new Blob([payload], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ark-inventory-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      Toast.show('✅ Inventory exported', 'success');
    } catch(e) {
      // Fallback: show JSON in a modal/prompt for manual copy
      prompt('Copy this JSON to save your inventory:', payload);
    }
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const obj = JSON.parse(e.target.result);
          if (!obj.resources) { Toast.show('Invalid file — no resources data found', 'error', 3000); return; }
          const r = obj.resources;
          // Validate fields exist and are numeric/string
          const valid = typeof r === 'object' && ('water' in r || 'food' in r);
          if (!valid) { Toast.show('Invalid inventory file format', 'error', 3000); return; }
          Store.set('resources', r);
          if (Array.isArray(obj.history)) Store.set('res_history', obj.history);
          Store.set('resources_updated', new Date().toISOString());
          this.render();
          Toast.show('✅ Inventory imported successfully', 'success');
        } catch(err) {
          Toast.show('Could not parse file — make sure it is a valid ARK export', 'error', 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

// === HOUSEHOLD ===
const Household = {
  _members: [],

  load() {
    const d = Store.get('household', {});
    const hSetVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    hSetVal('hh-name', d.name || ''); hSetVal('hh-count', d.count || '');
    hSetVal('hh-location', d.location || '');
    const hhId = d.id || Store.get('hh_id') || generateID();
    if (!Store.get('hh_id')) Store.set('hh_id', hhId);
    hSetVal('hh-id', hhId);
    hSetVal('hh-needs', d.needs || ''); hSetVal('hh-meet1', d.meet1 || '');
    hSetVal('hh-meet2', d.meet2 || ''); hSetVal('hh-evac', d.evac || '');
    hSetVal('hh-ooa-name', d.ooaName || ''); hSetVal('hh-ooa-phone', d.ooaPhone || '');
    hSetVal('hh-ooa-rel', d.ooaRel || ''); hSetVal('hh-ooa-alt', d.ooaAlt || '');
    hSetVal('hh-veh1', d.veh1 || ''); hSetVal('hh-fuel', d.fuel || 'Half');
    hSetVal('hh-veh2', d.veh2 || ''); hSetVal('hh-fuel2', d.fuel2 || 'N/A');
    hSetVal('hh-pets', d.pets || ''); hSetVal('hh-gobag', d.gobag || '');
    this._members = Store.get('hh_members', []);
    this.renderMembers();
  },

  save() {
    const hGetVal = (id, def) => { const e = document.getElementById(id); return e ? e.value : (def || ''); };
    const d = {
      name: hGetVal('hh-name').trim(),
      count: hGetVal('hh-count') || String(this._members.length || ''),
      location: hGetVal('hh-location').trim(),
      id: hGetVal('hh-id'),
      needs: hGetVal('hh-needs').trim(),
      meet1: hGetVal('hh-meet1').trim(),
      meet2: hGetVal('hh-meet2').trim(),
      evac: hGetVal('hh-evac').trim(),
      ooaName: hGetVal('hh-ooa-name').trim(),
      ooaPhone: hGetVal('hh-ooa-phone').trim(),
      ooaRel: hGetVal('hh-ooa-rel').trim(),
      ooaAlt: hGetVal('hh-ooa-alt').trim(),
      veh1: hGetVal('hh-veh1').trim(),
      fuel: hGetVal('hh-fuel', 'Half'),
      veh2: hGetVal('hh-veh2').trim(),
      fuel2: hGetVal('hh-fuel2', 'N/A'),
      pets: hGetVal('hh-pets').trim(),
      gobag: hGetVal('hh-gobag').trim()
    };
    Store.set('household', d);
    Store.set('hh_id', d.id);
    // Keep hh-count field in sync with actual saved count
    const countEl = document.getElementById('hh-count');
    if (countEl && !countEl.value && this._members.length) countEl.value = String(this._members.length);
    Toast.show('✅ Household profile saved', 'success');
  },

  addMember() {
    Modal.open(`
      <p style="margin:0 0 12px">Enter details for each household member. Medical info is stored locally only.</p>
      <label class="font-sm semibold">Name</label>
      <input type="text" id="new-member-name" maxlength="60" class="form-input w-full" placeholder="e.g. Maria" style="margin:6px 0 12px">
      <label class="font-sm semibold">Role</label>
      <select id="new-member-role" class="form-input w-full" style="margin:6px 0 12px">
        <option value="member">👤 Member</option>
        <option value="head">🏠 Head of Household</option>
        <option value="spouse">💑 Spouse / Partner</option>
        <option value="child">🧒 Child</option>
        <option value="elderly">🧓 Elderly</option>
        <option value="pet">🐾 Pet</option>
        <option value="leader">👑 Team Leader</option>
        <option value="medic">🏥 Medic</option>
        <option value="radio">📻 Radio Operator</option>
        <option value="security">🛡️ Security</option>
        <option value="logistics">📦 Logistics</option>
        <option value="other">🔵 Other</option>
      </select>
      <label class="font-sm semibold">Age</label>
      <input type="number" id="new-member-age" min="0" max="120" class="form-input w-full" placeholder="e.g. 34" style="margin:6px 0 12px">
      <label class="font-sm semibold">Blood Type</label>
      <select id="new-member-blood" class="form-input w-full" style="margin:6px 0 12px">
        <option value="">Unknown</option>
        <option value="A+">A+</option>
        <option value="A-">A-</option>
        <option value="B+">B+</option>
        <option value="B-">B-</option>
        <option value="AB+">AB+</option>
        <option value="AB-">AB-</option>
        <option value="O+">O+</option>
        <option value="O-">O-</option>
      </select>
      <label class="font-sm semibold">Known Allergies</label>
      <input type="text" id="new-member-allergies" maxlength="200" class="form-input w-full" placeholder="e.g. Penicillin, peanuts" style="margin:6px 0 12px">
      <label class="font-sm semibold">Medical Conditions / Medications</label>
      <input type="text" id="new-member-conditions" maxlength="200" class="form-input w-full" placeholder="e.g. Diabetes, insulin dependent" style="margin:6px 0 12px">
      <label class="font-sm semibold">Special Needs / Notes</label>
      <input type="text" id="new-member-needs" maxlength="200" class="form-input w-full" placeholder="e.g. Wheelchair, oxygen tank, dietary restrictions" style="margin:6px 0 16px">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Household._doAddMember(document.getElementById('new-member-name').value.trim(),document.getElementById('new-member-role').value,document.getElementById('new-member-age').value,document.getElementById('new-member-blood').value,document.getElementById('new-member-allergies').value.trim(),document.getElementById('new-member-conditions').value.trim(),document.getElementById('new-member-needs').value.trim());">Add Member</button>
      </div>
    `, '👥 Add Household Member');
  },

  _doAddMember(name, role, age, bloodType, allergies, conditions, needs) {
    if (!name) { Toast.show('Please enter a name', 'error'); return; }
    const ageVal = age !== '' && age !== null && age !== undefined ? parseInt(age, 10) : null;
    if (age !== '' && age !== null && age !== undefined && (isNaN(ageVal) || ageVal < 0 || ageVal > 120)) {
      Toast.show('Age must be a number between 0 and 120', 'error'); return;
    }
    this._members.push({
      id: generateID(),
      name,
      role: role||'member',
      needs: needs || '',
      age: ageVal,
      bloodType: bloodType || '',
      allergies: allergies || '',
      conditions: conditions || ''
    });
    Store.set('hh_members', this._members);
    this.renderMembers();
    Modal.close();
    Toast.show('✅ ' + name + ' added to household', 'success');
  },

  renderMembers() {
    const list = document.getElementById('members-list');
    if (!list) return;
    if (!this._members.length) {
      const countBadge = document.getElementById('hh-member-count');
      if (countBadge) { countBadge.textContent = ''; countBadge.style.display = 'none'; }
      list.innerHTML = '<div class="text-secondary font-sm mb-12">No members added yet — add your household members for emergency planning.</div><button class="btn btn-primary btn-sm mt-8" onclick="Household.addMember()">+ Add First Member</button>';
      return;
    }
    const countBadge = document.getElementById('hh-member-count');
    if (countBadge) { countBadge.textContent = this._members.length + (this._members.length === 1 ? ' member' : ' members'); countBadge.style.display = 'inline'; }
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    list.innerHTML = this._members.map((m, i) => {
      const details = [
        m.age ? `Age ${m.age}` : null,
        m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
        m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
        m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
        m.needs ? `Needs: ${esc(m.needs)}` : null,
      ].filter(Boolean).join(' · ');
      return `
      <div class="member-item">
        <div class="member-avatar">${roleEmoji[m.role] || '👤'}</div>
        <div style="flex:1">
          <div class="font-sm bold">${esc(m.name)}</div>
          <div class="member-role">${esc(m.role)}</div>
          ${details ? `<div class="font-xs text-secondary" style="margin-top:2px">${details}</div>` : ''}
        </div>
        <div class="flex gap-4">
          <button class="btn btn-ghost btn-sm" onclick="Household.editMember('${m.id}')" aria-label="Edit ${esc(m.name)}" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="Household.removeMember(${i})" aria-label="Remove ${esc(m.name)}" title="Remove">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  editMember(memberId) {
    const m = this._members.find(x => x.id === memberId);
    if (!m) return;
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    const roleOptions = ['member','head','spouse','child','elderly','pet','leader','medic','radio','security','logistics','other']
      .map(r => `<option value="${r}"${m.role===r?' selected':''}>${roleEmoji[r]||'🔵'} ${r.charAt(0).toUpperCase()+r.slice(1)}</option>`).join('');
    const bloodOptions = ['','A+','A-','B+','B-','AB+','AB-','O+','O-']
      .map(b => `<option value="${b}"${m.bloodType===b?' selected':''}>${b||'Unknown'}</option>`).join('');
    Modal.open(`
      <p style="margin:0 0 12px">Edit household member details. Medical info is stored locally only.</p>
      <label class="font-sm semibold">Name</label>
      <input type="text" id="edit-member-name" maxlength="60" class="form-input w-full" value="${esc(m.name||'')}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Role</label>
      <select id="edit-member-role" class="form-input w-full" style="margin:6px 0 12px">${roleOptions}</select>
      <label class="font-sm semibold">Age</label>
      <input type="number" id="edit-member-age" min="0" max="120" class="form-input w-full" value="${m.age!=null?m.age:''}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Blood Type</label>
      <select id="edit-member-blood" class="form-input w-full" style="margin:6px 0 12px">${bloodOptions}</select>
      <label class="font-sm semibold">Known Allergies</label>
      <input type="text" id="edit-member-allergies" maxlength="200" class="form-input w-full" value="${esc(m.allergies||'')}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Medical Conditions / Medications</label>
      <input type="text" id="edit-member-conditions" maxlength="200" class="form-input w-full" value="${esc(m.conditions||'')}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Special Needs / Notes</label>
      <input type="text" id="edit-member-needs" maxlength="200" class="form-input w-full" value="${esc(m.needs||'')}" style="margin:6px 0 16px">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Household._doEditMember('${m.id}')">Save Changes</button>
      </div>
    `, '✏️ Edit Member');
  },

  _doEditMember(memberId) {
    const idx = this._members.findIndex(x => x.id === memberId);
    if (idx === -1) return;
    const name = document.getElementById('edit-member-name').value.trim();
    if (!name) { Toast.show('Please enter a name', 'error'); return; }
    const ageRaw = document.getElementById('edit-member-age').value;
    const ageVal = ageRaw !== '' ? parseInt(ageRaw, 10) : null;
    if (ageRaw !== '' && (isNaN(ageVal) || ageVal < 0 || ageVal > 120)) {
      Toast.show('Age must be a number between 0 and 120', 'error'); return;
    }
    this._members[idx] = {
      ...this._members[idx],
      name,
      role: document.getElementById('edit-member-role').value || 'member',
      age: ageVal,
      bloodType: document.getElementById('edit-member-blood').value || '',
      allergies: document.getElementById('edit-member-allergies').value.trim(),
      conditions: document.getElementById('edit-member-conditions').value.trim(),
      needs: document.getElementById('edit-member-needs').value.trim()
    };
    Store.set('hh_members', this._members);
    this.renderMembers();
    Modal.close();
    Toast.show('✅ ' + name + ' updated', 'success');
  },

  removeMember(i) {
    const member = this._members[i];
    if (!member) return;
    const memberId = member.id;
    const memberName = member.name || 'this member';
    Modal.confirm('Remove ' + esc(memberName) + ' from your household? This cannot be undone.', function() {
      const idx = Household._members.findIndex(m => m.id === memberId);
      if (idx !== -1) Household._members.splice(idx, 1);
      Store.set('hh_members', Household._members);
      Household.renderMembers();
    }, 'Remove', 'Keep');
  },

  showQuickRef() {
    const d = Store.get('household', {});
    const members = Store.get('hh_members', []);
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    const row = (label, value) => value ? `<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600;min-width:120px;color:var(--accent);flex-shrink:0">${label}</span><span>${value}</span></div>` : '';
    let memberBlock = '';
    if (members.length) {
      memberBlock = `<div style="margin-top:8px"><strong style="color:var(--accent)">👥 Members (${members.length})</strong>`;
      memberBlock += members.map(m => {
        const tags = [
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `⚠️ ${esc(m.allergies)}` : null,
          m.conditions ? esc(m.conditions) : null,
          m.needs ? `🦽 ${esc(m.needs)}` : null
        ].filter(Boolean).join(' · ');
        return `<div style="padding:4px 0 4px 8px;border-left:3px solid var(--accent);margin:4px 0"><strong>${roleEmoji[m.role]||'👤'} ${esc(m.name||'')}</strong>${m.age!=null?' age '+m.age:''}${tags ? '<br><span style="font-size:12px;color:var(--text-secondary)">'+tags+'</span>' : ''}</div>`;
      }).join('');
      memberBlock += '</div>';
    } else {
      memberBlock = '<div style="color:var(--text-secondary);font-size:13px;padding:6px 0">No members added yet.</div>';
    }
    const ooaContact = [d.ooaName, d.ooaRel ? '('+d.ooaRel+')' : '', d.ooaPhone, d.ooaAlt].filter(Boolean).join(' · ');
    const vehInfo = [d.veh1 ? d.veh1+(d.fuel?' — '+d.fuel:'') : '', d.veh2 && d.veh2 !== '' ? d.veh2+(d.fuel2 && d.fuel2!=='N/A'?' — '+d.fuel2:'') : ''].filter(Boolean).join('; ');
    const html = `
      <div style="border:2px solid var(--accent);border-radius:8px;padding:12px;background:var(--bg-elevated);font-size:13px;line-height:1.6">
        <div style="font-size:15px;font-weight:700;color:var(--accent);margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--accent)">🏘️ ${esc(d.name||'Household')} · ID: ${esc(d.id||Store.get('hh_id','?'))}</div>
        ${row('📍 Area', d.location)}
        ${row('🗓️ Members', d.count || (members.length ? String(members.length) : null))}
        ${row('⚠️ Special Needs', d.needs)}
        ${row('📌 Meet Point 1', d.meet1)}
        ${row('📌 Meet Point 2', d.meet2)}
        ${row('🚗 Evacuate to', d.evac)}
        ${row('📞 Out-of-Area', ooaContact)}
        ${row('🚘 Vehicle(s)', vehInfo)}
        ${row('🐾 Pets', d.pets)}
        ${row('🎒 Go-bag', d.gobag)}
        <div style="margin-top:10px">${memberBlock}</div>
        <div style="font-size:10px;color:var(--text-secondary);margin-top:8px;padding-top:6px;border-top:1px solid var(--border)">ARK Crisis Suite · ${new Date().toLocaleDateString()}</div>
      </div>`;
    const card = document.getElementById('hh-qrc-card');
    const content = document.getElementById('hh-qrc-content');
    if (card && content) {
      content.innerHTML = html;
      card.style.display = 'block';
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  printCard() {
    const d = Store.get('household', {});
    const members = Store.get('hh_members', []);
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    let memberRows = '';
    if (members.length) {
      memberRows = members.map(m => {
        const details = [
          m.age != null ? `Age: ${esc(String(m.age))}` : null,
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
          m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
          m.needs ? `Needs: ${esc(m.needs)}` : null,
        ].filter(Boolean).join('<br>');
        return `<tr><td>${roleEmoji[m.role]||'👤'} ${esc(m.name||'')}</td><td>${esc(m.role||'')}</td><td>${details || '—'}</td></tr>`;
      }).join('');
    } else {
      memberRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No members added</td></tr>';
    }
    const memberTable = `<h3>Household Members</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0">
<thead><tr style="background:#eee"><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Name</th><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Role</th><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Medical Info</th></tr></thead>
<tbody>${memberRows}</tbody></table>`;
    const ooaLine = [d.ooaName, d.ooaRel ? '('+d.ooaRel+')' : '', d.ooaPhone, d.ooaAlt].filter(Boolean).join(' | ');
    const veh2Line = d.veh2 ? `<div class="row"><span class="label">Vehicle 2:</span>${esc(d.veh2)} — ${esc(d.fuel2||'')}</div>` : '';
    const html = `<h2>ARK Household Emergency Card</h2>
<div class="row"><span class="label">Household:</span>${esc(d.name||'')}</div>
<div class="row"><span class="label">HH ID:</span>${esc(d.id||Store.get('hh_id',''))}</div>
<div class="row"><span class="label">Members:</span>${esc(d.count||String(members.length||''))}</div>
<div class="row"><span class="label">Area:</span>${esc(d.location||'')}</div>
<div class="row"><span class="label">Special Needs:</span>${esc(d.needs||'')}</div>
<h3>Meeting &amp; Evacuation</h3>
<div class="row"><span class="label">Meet Point 1:</span>${esc(d.meet1||'')}</div>
<div class="row"><span class="label">Meet Point 2:</span>${esc(d.meet2||'')}</div>
<div class="row"><span class="label">Evacuate to:</span>${esc(d.evac||'')}</div>
<h3>Out-of-Area Contact</h3>
<div class="row"><span class="label">Contact:</span>${ooaLine}</div>
<h3>Vehicles &amp; Pets</h3>
<div class="row"><span class="label">Vehicle 1:</span>${esc(d.veh1||'')} — ${esc(d.fuel||'')}</div>
${veh2Line}
<div class="row"><span class="label">Pets:</span>${esc(d.pets||'')}</div>
<div class="row"><span class="label">Go-bag:</span>${esc(d.gobag||'')}</div>
${memberTable}
<p style="font-size:11px;margin-top:16px">ARK Crisis Suite — Generated ${new Date().toLocaleDateString()}</p>`;
    const w = window.open('', '_blank');
    if (!w) { Toast.show('Pop-up blocked — allow pop-ups for this page and try again', 'warning', 4000); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Household Emergency Card</title>
<style>body{font:14px Arial,sans-serif;padding:20px;max-width:680px}h2{font-size:16px;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:12px}h3{font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:14px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}.row{display:flex;gap:10px;margin:4px 0}.label{font-weight:bold;min-width:120px;flex-shrink:0}td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left}@media print{body{margin:0}button{display:none}.no-print{display:none}}</style></head><body>
${html}
<div style="text-align:center;margin:20px 0" class="no-print"><button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;background:#333;color:#fff;border:none;border-radius:4px">🖨️ Print</button></div>
</body></html>`);
    w.document.close();
    w.onload = function() { w.focus(); w.print(); };
    setTimeout(() => { if (w && !w.closed) { w.focus(); w.print(); } }, 1200);
  },

  shareWithHub() {
    const d = Store.get('household', {});
    const memberCount = this._members.length || d.count || '?';
    Hub.post({
      id: 'hh_' + Date.now(),
      alias: d.name || 'Household',
      channel: 'general',
      body: `Household registered: ${memberCount} people. Location: ${d.location||'not given'}. ${d.needs ? 'Needs: '+d.needs : ''}`,
      ts: new Date().toISOString()
    }).then(ok => Toast.show(ok ? '✅ Shared with your hub community' : '💾 Saved on your device — will send when you connect to a hub', ok ? 'success' : 'info'));
  }
};

// === MEDICAL ===
const Medical = {
  _meds: [],

  load() {
    this._meds = Store.get('medications', []);
    this.renderMeds();
  },

  addMed() {
    const f = document.getElementById('med-add-form');
    if (f) f.classList.toggle('hidden');
  },

  saveMed() {
    const person = document.getElementById('med-person').value.trim();
    const name = document.getElementById('med-name').value.trim();
    const sched = document.getElementById('med-sched').value.trim();
    const supply = document.getElementById('med-supply').value;
    if (!name) { Toast.show('Enter a medication name', 'warn'); return; }
    this._meds.push({id: generateID(), person, name, sched, supply, lastTaken: null});
    Store.set('medications', this._meds);
    // Clear form fields
    ['med-person','med-name','med-sched','med-supply'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('med-add-form').classList.add('hidden');
    this.renderMeds();
    Toast.show('✅ Medication added', 'success');
  },

  closeMedForm() {
    document.getElementById('med-add-form').classList.add('hidden');
  },

  renderMeds() {
    const list = document.getElementById('med-list');
    if (!list) return;
    if (!this._meds.length) {
      list.innerHTML = '<div class="text-secondary font-sm">No medications tracked.</div>';
      return;
    }
    list.innerHTML = this._meds.map((m, i) => `
      <div class="member-item">
        <div class="member-avatar">💊</div>
        <div style="flex:1">
          <div class="font-sm bold">${esc(m.name)}</div>
          <div class="font-xs text-secondary">${m.person ? esc(m.person) + ' · ' : ''}${esc(m.sched||'')}</div>
          ${m.supply ? `<div class="font-xs text-muted">${esc(m.supply)} days supply</div>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Medical.removeMed(${i})" aria-label="Remove ${esc(m.name)}">✕</button>
      </div>
    `).join('');
  },

  removeMed(i) {
    this._meds.splice(i, 1);
    Store.set('medications', this._meds);
    this.renderMeds();
  },

  generateCards() {
    const members = Store.get('hh_members', []);
    const meds = this._meds;
    const preview = document.getElementById('med-card-preview');
    if (!preview) return;
    const html = members.map(m =>
      `<div class="font-sm" style="border:1px solid var(--border);padding:12px;margin:8px 0;border-radius:8px">
        <strong>Name:</strong> ${esc(m.name)}<br>
        <strong>Medications:</strong> ${meds.filter(md => md.person === m.name).map(md => esc(md.name) + ' (' + esc(md.sched) + ')').join(', ') || 'None'}<br>
        <strong>Household:</strong> ${esc(Store.get('household', {}).name || '')}
      </div>`
    ).join('');
    preview.innerHTML = html || '<div class="font-sm text-secondary">Add household members first.</div>';
  }
};

// === CPR ===
const CPR = {
  _int: null, _elapsedInt: null,
  _count: 0, _cycleCount: 0, _startTime: 0, _pausedElapsed: 0,
  _running: false,
  _mode: 'adult', // 'adult' | 'child' | 'infant'
  _modes: {
    adult:  { bpm: 100, ms: 600,  label: 'Adult (8+ yrs) — 100–120/min · 2 hands · 2 in deep',   breaths: 30 },
    child:  { bpm: 100, ms: 600,  label: 'Child (1–8 yrs) — 100–120/min · 1–2 hands · 2 in deep', breaths: 30 },
    infant: { bpm: 120, ms: 500,  label: 'Infant (<1 yr) — 100–120/min · 2 fingers · 1.5 in deep', breaths: 30 },
  },
  _fmt(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return String(m).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
  },
  setMode(mode) {
    this.reset();
    this._mode = mode;
    const cfg = this._modes[mode];
    const lbl = document.getElementById('cpr-mode-label');
    if (lbl) lbl.textContent = cfg.label;
    const btn = document.getElementById('cpr-start-btn');
    if (btn) btn.textContent = `▶ START`;
    ['adult','child','infant'].forEach(m => {
      const el = document.getElementById('cpr-steps-' + m);
      if (el) el.style.display = m === mode ? '' : 'none';
    });
    ['adult','child','infant'].forEach(m => {
      const b = document.getElementById('cpr-mode-' + m);
      if (!b) return;
      if (m === mode) { b.style.background = 'var(--accent)'; b.style.color = '#000'; b.style.fontWeight = '700'; b.className = 'btn btn-sm'; }
      else { b.style.background = ''; b.style.color = ''; b.style.fontWeight = ''; b.className = 'btn btn-secondary btn-sm'; }
    });
    // Update animation speed to match bpm
    const heart = document.getElementById('cpr-heart');
    if (heart) heart.style.animationDuration = cfg.ms + 'ms';
  },
  start() {
    if (this._running) return;
    this._running = true;
    const cfg = this._modes[this._mode];
    const counter = document.getElementById('cpr-counter');
    const box = document.getElementById('cpr-box');
    const startBtn = document.getElementById('cpr-start-btn');
    if (box) { box.classList.remove('cpr-paused'); box.classList.add('cpr-active'); }
    if (startBtn) { startBtn.textContent = '▶ RUNNING'; startBtn.disabled = true; }
    // Set animation speed to match bpm
    const heart = document.getElementById('cpr-heart');
    if (heart) heart.style.animationDuration = cfg.ms + 'ms';
    this._startTime = Date.now() - this._pausedElapsed;
    // Compression interval
    this._int = setInterval(() => {
      this._count++;
      this._cycleCount++;
      if (counter) { counter.textContent = this._count; counter.style.color = ''; }
      // Every 30 compressions: show breath cue for 3 seconds
      if (this._cycleCount >= cfg.breaths) {
        this._cycleCount = 0;
        const cue = document.getElementById('cpr-breath-cue');
        if (cue) {
          cue.style.display = '';
          if (counter) counter.style.color = 'var(--blue)';
          clearTimeout(this._breathTimeout);
          this._breathTimeout = setTimeout(() => {
            if (cue) cue.style.display = 'none';
            if (counter) counter.style.color = '';
          }, 3000);
        }
      }
    }, cfg.ms);
    // Elapsed time interval
    this._elapsedInt = setInterval(() => {
      const el = document.getElementById('cpr-elapsed');
      if (el) el.textContent = this._fmt(Date.now() - this._startTime);
    }, 500);
    Toast.show(`CPR started — ${cfg.bpm}/min · 30 compressions then 2 breaths`, 'info');
  },
  pause() {
    if (!this._running) return;
    this._running = false;
    this._pausedElapsed = Date.now() - this._startTime;
    clearInterval(this._int); this._int = null;
    clearInterval(this._elapsedInt); this._elapsedInt = null;
    const box = document.getElementById('cpr-box');
    if (box) { box.classList.add('cpr-paused'); box.classList.remove('cpr-active'); }
    const startBtn = document.getElementById('cpr-start-btn');
    if (startBtn) { startBtn.textContent = '▶ RESUME'; startBtn.disabled = false; }
  },
  reset() {
    this._running = false;
    clearInterval(this._int); this._int = null;
    clearInterval(this._elapsedInt); this._elapsedInt = null;
    clearTimeout(this._breathTimeout);
    this._count = 0; this._cycleCount = 0; this._pausedElapsed = 0;
    const box = document.getElementById('cpr-box');
    if (box) { box.classList.add('cpr-paused'); box.classList.remove('cpr-active'); }
    const counter = document.getElementById('cpr-counter');
    if (counter) { counter.textContent = '0'; counter.style.color = ''; }
    const elapsed = document.getElementById('cpr-elapsed');
    if (elapsed) elapsed.textContent = '00:00';
    const cue = document.getElementById('cpr-breath-cue');
    if (cue) cue.style.display = 'none';
    const startBtn = document.getElementById('cpr-start-btn');
    if (startBtn) { startBtn.textContent = '▶ START'; startBtn.disabled = false; }
  },
  // Keep stop() as alias for reset() for backward compat
  stop() { this.reset(); }
};

// === MAP TOOL ===
const MapTool = {
  _canvas: null, _ctx: null, _mode: 'select',
  _markers: [], _inited: false,
  // Map view state — lat/lon center + zoom
  _lat: 39.8283, _lon: -98.5795, _zoom: 4, // defaults to continental US
  // Pan drag state
  _drag: false, _dragStartX: 0, _dragStartY: 0, _dragStartLat: 0, _dragStartLon: 0,
  // Pinch-zoom state
  _pinchDist: 0, _pinchZoom: 4,
  // Tile cache: "z/x/y" → HTMLImageElement (capped at 512 to avoid memory leak)
  _tileCache: {},
  _tileCacheKeys: [], // insertion-order list for FIFO eviction
  _tileCacheMax: 512,
  _tileSize: 256,
  _pendingClick: null,

  // ── OSM tile math ──────────────────────────────────────────────────────────
  _lon2tile(lon, z) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); },
  _lat2tile(lat, z) {
    const r = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z));
  },
  // pixel offset within a tile for a given lat/lon at zoom z
  _latlon2px(lat, lon, z, tileX, tileY) {
    const n = Math.pow(2, z);
    const px = (lon + 180) / 360 * n * this._tileSize - tileX * this._tileSize;
    const latR = lat * Math.PI / 180;
    const py = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n * this._tileSize - tileY * this._tileSize;
    return {px, py};
  },
  // canvas (x,y) → lat/lon given current view center
  _canvasToLatLon(cx, cy) {
    if (!this._canvas) return {lat: this._lat, lon: this._lon};
    const W = this._canvas.width, H = this._canvas.height;
    const n = Math.pow(2, this._zoom);
    const ts = this._tileSize;
    // world pixel of center
    const centerTX = (this._lon + 180) / 360 * n;
    const latR = this._lat * Math.PI / 180;
    const centerTY = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;
    // delta from center in tiles
    const dTX = (cx - W / 2) / ts;
    const dTY = (cy - H / 2) / ts;
    const tX = centerTX + dTX;
    const tY = centerTY + dTY;
    const lon = tX / n * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * tY / n))) * 180 / Math.PI;
    return {lat, lon};
  },
  // lat/lon → canvas (x,y)
  _latLonToCanvas(lat, lon) {
    if (!this._canvas) return {x: 0, y: 0};
    const W = this._canvas.width, H = this._canvas.height;
    const n = Math.pow(2, this._zoom);
    const ts = this._tileSize;
    const centerTX = (this._lon + 180) / 360 * n;
    const centerLatR = this._lat * Math.PI / 180;
    const centerTY = (1 - Math.log(Math.tan(centerLatR) + 1 / Math.cos(centerLatR)) / Math.PI) / 2 * n;
    const latR = lat * Math.PI / 180;
    const tX = (lon + 180) / 360 * n;
    const tY = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;
    return { x: W / 2 + (tX - centerTX) * ts, y: H / 2 + (tY - centerTY) * ts };
  },

  // ── Tile loading (memory cache → IndexedDB → network) ────────────────────
  _getTile(z, x, y) {
    const key = z + '/' + x + '/' + y;
    // 1) Already in memory — return instantly
    if (this._tileCache[key]) return this._tileCache[key];
    // 2) Evict oldest entry if cap exceeded (FIFO)
    if (this._tileCacheKeys.length >= this._tileCacheMax) {
      const evict = this._tileCacheKeys.shift();
      delete this._tileCache[evict];
    }
    // 3) Create placeholder img, start async resolution
    const img = new Image();
    img.crossOrigin = 'anonymous';
    this._tileCache[key] = img; // prevent duplicate fetches
    this._tileCacheKeys.push(key);
    // Try IDB first, fall back to network
    DB.getTile(key).then(record => {
      if (record && record.blob) {
        // Load from local cache
        const url = URL.createObjectURL(record.blob);
        img.onload = () => { URL.revokeObjectURL(url); this.draw(); };
        img.onerror = () => { img._failed = true; this._fetchTileFromNetwork(img, key, z, x, y); };
        img.src = url;
      } else {
        this._fetchTileFromNetwork(img, key, z, x, y);
      }
    }).catch(() => { this._fetchTileFromNetwork(img, key, z, x, y); });
    return img;
  },
  _fetchTileFromNetwork(img, key, z, x, y) {
    const servers = ['a', 'b', 'c'];
    const s = servers[(x + y) % 3];
    const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    // Use fetch so we can get the blob for IDB storage
    fetch(url).then(r => {
      if (!r.ok) throw new Error('tile ' + r.status);
      return r.blob();
    }).then(blob => {
      DB.putTile(key, blob).catch(()=>{}); // persist asynchronously
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(objUrl); this.draw(); };
      img.onerror = () => { img._failed = true; };
      img.src = objUrl;
    }).catch(() => { img._failed = true; this.draw(); });
  },

  // ── Draw ───────────────────────────────────────────────────────────────────
  draw() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const W = this._canvas.width, H = this._canvas.height;
    const ts = this._tileSize;
    const z = this._zoom;
    const n = Math.pow(2, z);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a2235'; // ocean/bg color
    ctx.fillRect(0, 0, W, H);

    // Center tile
    const centerTX = (this._lon + 180) / 360 * n;
    const latR = this._lat * Math.PI / 180;
    const centerTY = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;

    // Tile range to cover canvas
    const tilesX = Math.ceil(W / ts) + 2;
    const tilesY = Math.ceil(H / ts) + 2;
    const startTX = Math.floor(centerTX - tilesX / 2);
    const startTY = Math.floor(centerTY - tilesY / 2);

    let tilesDrawn = 0, tilesFailed = 0, tilesLoading = 0;
    for (let tx = startTX; tx <= startTX + tilesX; tx++) {
      for (let ty = startTY; ty <= startTY + tilesY; ty++) {
        // wrap x, clamp y
        const wtx = ((tx % n) + n) % n;
        if (ty < 0 || ty >= n) continue;
        const img = this._getTile(z, wtx, ty);
        const canX = W / 2 + (tx - centerTX) * ts;
        const canY = H / 2 + (ty - centerTY) * ts;
        if (img.complete && !img._failed && img.naturalWidth) {
          ctx.drawImage(img, Math.round(canX), Math.round(canY), ts, ts);
          tilesDrawn++;
        } else if (img._failed) {
          // Failed tile — gray placeholder
          ctx.fillStyle = '#24272c';
          ctx.fillRect(Math.round(canX), Math.round(canY), ts - 1, ts - 1);
          tilesFailed++;
        } else {
          // placeholder while loading
          ctx.fillStyle = '#24272c';
          ctx.fillRect(Math.round(canX), Math.round(canY), ts - 1, ts - 1);
          ctx.fillStyle = '#3a3f47';
          ctx.font = '11px sans-serif';
          ctx.fillText('loading…', Math.round(canX) + 8, Math.round(canY) + 20);
          tilesLoading++;
        }
      }
    }

    // Offline tile overlay — full: no tiles at all; partial: some failed some loaded
    if (tilesFailed > 0 && tilesDrawn === 0 && tilesLoading === 0) {
      // Complete offline — no cached tiles for this area
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H / 2 - 36, W, 72);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px "Geist",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ Tiles unavailable offline', W / 2, H / 2 - 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Geist",system-ui,sans-serif';
      ctx.fillText('Connect to the internet or tap 📥 Cache Area first', W / 2, H / 2 + 12);
      ctx.textAlign = 'left';
    } else if (tilesFailed > 0 && tilesLoading === 0) {
      // Partial offline — some tiles missing (not yet cached); banner above scale+attribution
      ctx.fillStyle = 'rgba(245,158,11,0.9)';
      ctx.fillRect(0, H - 66, W, 20);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ ${tilesFailed} tile${tilesFailed > 1 ? 's' : ''} not cached — tap 📥 Cache Area for full offline use`, W / 2, H - 52);
      ctx.textAlign = 'left';
    }

    // OSM attribution (required)
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('© OpenStreetMap contributors', 4, H - 5);

    // Markers
    const icons = {meeting:'📍',water:'💧',shelter:'🏠',hazard:'⚠️',medical:'🏥',gps:'📶'};
    this._markers.forEach(m => {
      if (m.lat == null || m.lon == null) return; // skip legacy pixel-only markers
      const {x, y} = this._latLonToCanvas(m.lat, m.lon);
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return; // off-screen
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.fillText(icons[m.type] || '📌', x, y);
      if (m.label) {
        ctx.font = 'bold 11px "Geist",system-ui,sans-serif';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(m.label, x, y + 16);
        ctx.fillText(m.label, x, y + 16);
      }
    });
    ctx.textAlign = 'left';

    // GPS dot
    const gps = Store.get('last_gps');
    if (gps) {
      const {x, y} = this._latLonToCanvas(gps.lat, gps.lon);
      if (x >= 0 && x <= W && y >= 0 && y <= H) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,120,255,0.3)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#0078ff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }

    // Zoom label
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W - 50, 6, 44, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('z' + z, W - 8, 20);
    ctx.textAlign = 'left';

    // Scale bar — snap to nearest tidy distance
    const metersPerPx = 156543.03392 * Math.cos(this._lat * Math.PI / 180) / Math.pow(2, z);
    const rawMeters = metersPerPx * 80; // target ~80px wide
    const mag = Math.pow(10, Math.floor(Math.log10(rawMeters)));
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
    const niceMeters = niceSteps.reduce((prev, cur) => {
      const pv = prev * mag;
      const cv = cur * mag;
      return (Math.abs(cv - rawMeters) < Math.abs(pv - rawMeters)) ? cur : prev;
    }) * mag;
    const barPx = niceMeters / metersPerPx;
    const label = niceMeters >= 1000 ? (niceMeters / 1000).toFixed(niceMeters >= 10000 ? 0 : 1) + ' km' : niceMeters + ' m';
    const sbX = 10, sbY = H - 28;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(sbX - 2, sbY - 10, barPx + 4, 18);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(sbX, sbY - 4, barPx, 4);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, sbX, sbY - 6);
  },

  // ── Init + events ──────────────────────────────────────────────────────────
  init() {
    if (this._inited) return;
    this._inited = true;
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._markers = Store.get('map_markers', []);

    // Resize canvas to fit container — taller on mobile for usable map area
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.min(Math.round(rect.width) || 860, 1200);
      const isMobile = canvas.width < 500;
      canvas.height = Math.round(canvas.width * (isMobile ? 0.75 : 0.52));
      this.draw();
    };
    resize();
    window.addEventListener('resize', resize);

    // If GPS available, center on user
    this.startGPS(true);

    // Click: place marker or pan
    canvas.addEventListener('click', e => this._onClick(e));

    // Wheel: zoom
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      this._zoom = Math.max(2, Math.min(18, this._zoom + delta));
      this.draw();
    }, {passive: false});

    // Touch/mouse pan
    canvas.addEventListener('mousedown', e => this._startDrag(e));
    canvas.addEventListener('mousemove', e => this._doDrag(e));
    canvas.addEventListener('mouseup', () => { this._drag = false; });
    canvas.addEventListener('mouseleave', () => { this._drag = false; });

    // Touch pan + pinch-zoom
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this._startDrag(e.touches[0]);
      } else if (e.touches.length === 2) {
        // Start pinch — record initial distance
        this._drag = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._pinchDist = Math.hypot(dx, dy);
        this._pinchZoom = this._zoom;
      }
    }, {passive: true});
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        if (!this._pinchDist) this._doDrag(e.touches[0]);
      } else if (e.touches.length === 2 && this._pinchDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const scale = newDist / this._pinchDist;
        this._zoom = Math.max(2, Math.min(18, Math.round(this._pinchZoom + Math.log2(scale))));
        this.draw();
      }
    }, {passive: false});
    canvas.addEventListener('touchend', () => { this._drag = false; this._pinchDist = 0; this._didDrag = false; });

    this.renderSavedLocations();
  },

  _startDrag(e) {
    this._drag = true;
    this._didDrag = false;
    const rect = this._canvas.getBoundingClientRect();
    this._dragStartX = e.clientX - rect.left;
    this._dragStartY = e.clientY - rect.top;
    this._dragStartLat = this._lat;
    this._dragStartLon = this._lon;
  },

  _doDrag(e) {
    if (!this._drag) return;
    const rect = this._canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = cx - this._dragStartX;
    const dy = cy - this._dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._didDrag = true;
    const n = Math.pow(2, this._zoom);
    const ts = this._tileSize;
    // convert pixel delta to lon/lat delta
    const dLon = -dx / (ts * n) * 360;
    const startLatR = this._dragStartLat * Math.PI / 180;
    const startTY = (1 - Math.log(Math.tan(startLatR) + 1 / Math.cos(startLatR)) / Math.PI) / 2 * n;
    const newTY = startTY + dy / ts;
    const newLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * newTY / n))) * 180 / Math.PI;
    this._lat = Math.max(-85, Math.min(85, newLat));
    this._lon = this._dragStartLon + dLon;
    this.draw();
  },

  _onClick(e) {
    if (this._didDrag) { this._didDrag = false; return; } // was a pan, not a click
    if (this._mode === 'select') return;
    const rect = this._canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (this._canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (this._canvas.height / rect.height);
    const {lat, lon} = this._canvasToLatLon(cx, cy);
    this._pendingGeo = {lat, lon};
    Modal.open(`
      <p style="margin:0 0 12px">Give this marker a short label (optional).</p>
      <label class="font-sm semibold">Label</label>
      <input type="text" id="marker-label-input" maxlength="60" class="form-input w-full" placeholder="e.g. Food stash, Road block…" style="margin:6px 0 16px">
      <div class="font-xs text-muted mb-12">📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}</div>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close();MapTool._placeMarker('',MapTool._pendingGeo.lat,MapTool._pendingGeo.lon)">No label</button>
        <button class="btn btn-primary" onclick="Modal.close();MapTool._placeMarker(document.getElementById('marker-label-input').value.trim(),MapTool._pendingGeo.lat,MapTool._pendingGeo.lon)">Place Marker</button>
      </div>
    `, '📌 Label This Marker');
  },

  _pendingGeo: null,

  _placeMarker(label, lat, lon) {
    this._markers.push({lat, lon, type: this._mode, label: label||'', ts: new Date().toISOString()});
    Store.set('map_markers', this._markers);
    this.draw();
    this.renderSavedLocations();
  },

  setMode(mode, btn) {
    this._mode = mode;
    // Only remove active from map-toolbar buttons — not from radio filter bar
    const toolbar = btn ? btn.closest('.map-toolbar') : null;
    if (toolbar) {
      toolbar.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
    } else {
      // Fallback: scope to map canvas toolbar only (first .map-toolbar in map tab)
      const mapTab = document.getElementById('tab-map');
      if (mapTab) mapTab.querySelectorAll('.map-toolbar .map-btn').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    const canvas = this._canvas;
    if (canvas) canvas.style.cursor = mode === 'select' ? 'grab' : 'crosshair';
  },

  zoomIn()  { this._zoom = Math.min(18, this._zoom + 1); this.draw(); },
  zoomOut() { this._zoom = Math.max(2,  this._zoom - 1); this.draw(); },

  locateMe() {
    const gps = Store.get('last_gps');
    if (gps) {
      this._lat = gps.lat; this._lon = gps.lon; this._zoom = 15;
      this.draw();
      return;
    }
    // No cached GPS — request fresh fix with loading feedback
    if (!navigator.geolocation) {
      Toast.show('GPS not supported on this device', 'warning', 4000); return;
    }
    const btn = document.getElementById('map-btn-locate');
    const origText = btn ? btn.textContent : null;
    if (btn) { btn.textContent = '⏳ Locating…'; btn.style.pointerEvents = 'none'; }
    navigator.geolocation.getCurrentPosition(pos => {
      if (btn) { btn.textContent = origText; btn.style.pointerEvents = ''; }
      const {latitude: lat, longitude: lon} = pos.coords;
      Store.set('last_gps', {lat, lon, accuracy: pos.coords.accuracy, ts: new Date().toISOString()});
      this._lat = lat; this._lon = lon; this._zoom = 15;
      this.draw();
      this.renderSavedLocations(); // refresh distances
    }, err => {
      if (btn) { btn.textContent = origText; btn.style.pointerEvents = ''; }
      const msgs = {1:'GPS permission denied — tap the lock icon to enable location',2:'GPS unavailable — check device location settings',3:'GPS timed out — try again'};
      Toast.show(msgs[err.code] || err.message, 'warning', 6000);
    }, {enableHighAccuracy: true, timeout: 10000, maximumAge: 30000});
  },

  clearAll() {
    Modal.confirm('Remove all markers from the map? This cannot be undone.', function() {
      MapTool._markers = [];
      Store.set('map_markers', []);
      MapTool.draw();
      MapTool.renderSavedLocations();
    }, 'Clear All', 'Cancel');
  },

  exportImg() {
    if (!this._canvas) { Toast.show('Map not loaded yet — open the map tab first', 'warning'); return; }
    this.draw();
    try {
      const dataUrl = this._canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'ARK-map-' + Date.now() + '.png';
      a.click();
      Toast.show('📸 Map image saved to your downloads', 'success');
    } catch(e) {
      Toast.show('Map export blocked — tiles loaded cross-origin. Try after full tile cache.', 'warning');
      return;
    }
  },

  calcDistance() {
    const a = document.getElementById('dist-a').value.trim().split(',').map(Number);
    const b = document.getElementById('dist-b').value.trim().split(',').map(Number);
    if (a.length !== 2 || b.length !== 2 || a.some(isNaN) || b.some(isNaN)) {
      Toast.show('Those coordinates don\'t look right — check the format and try again', 'error'); return;
    }
    if (Math.abs(a[0]) > 90 || Math.abs(b[0]) > 90) {
      Toast.show('Latitude must be between -90 and 90', 'error'); return;
    }
    if (Math.abs(a[1]) > 180 || Math.abs(b[1]) > 180) {
      Toast.show('Longitude must be between -180 and 180', 'error'); return;
    }
    const R = 6371;
    const dLat = (b[0]-a[0]) * Math.PI / 180;
    const dLon = (b[1]-a[1]) * Math.PI / 180;
    const aa = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180) * Math.cos(b[0]*Math.PI/180) * Math.sin(dLon/2)**2;
    const dist = R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
    const miles = dist * 0.621371;
    // Bearing from A to B
    const y = Math.sin(dLon) * Math.cos(b[0]*Math.PI/180);
    const x = Math.cos(a[0]*Math.PI/180)*Math.sin(b[0]*Math.PI/180) - Math.sin(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.cos(dLon);
    const bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    const directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const cardinal = directions[Math.round(bearing / 22.5) % 16];
    document.getElementById('dist-result').innerHTML =
      `<div>Distance: <strong>${dist.toFixed(2)} km</strong> / ${miles.toFixed(2)} mi</div>` +
      `<div>Bearing A→B: <strong>${bearing.toFixed(1)}° ${cardinal}</strong></div>`;
  },

  fillDistPoint(field) {
    if (!navigator.geolocation) { Toast.show('GPS not available', 'warning'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const val = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      const inp = document.getElementById(field);
      if (inp) inp.value = val;
      Toast.show('📍 Coordinates filled from GPS', 'success', 2000);
    }, err => {
      Toast.show('GPS unavailable — enter coordinates manually', 'warning');
    }, {enableHighAccuracy: true, timeout: 8000, maximumAge: 60000});
  },

  startGPS(centerOnFirst = false) {
    if (!navigator.geolocation) {
      const el = document.getElementById('gps-coords');
      if (el) el.textContent = 'GPS: not supported';
      return;
    }
    let centered = false;
    navigator.geolocation.watchPosition(pos => {
      const {latitude: lat, longitude: lon, accuracy} = pos.coords;
      Store.set('last_gps', {lat, lon, accuracy, ts: new Date().toISOString()});
      const el = document.getElementById('gps-coords');
      if (el) el.textContent = `GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)} (±${Math.round(accuracy)}m)`;
      const dot = document.getElementById('gps-dot');
      const status = document.getElementById('gps-status');
      if (dot) dot.className = 'status-dot dot-green';
      if (status) status.textContent = 'GPS active';
      if (centerOnFirst && !centered) {
        centered = true;
        this._lat = lat; this._lon = lon; this._zoom = 15;
      }
      this.draw();
    }, err => {
      const msgs = {
        1: 'GPS permission denied — tap the lock icon to enable location',
        2: 'GPS unavailable — check device location settings',
        3: 'GPS timed out — retrying…'
      };
      const msg = msgs[err.code] || err.message;
      Toast.show(msg, 'warning', 6000);
      // Fall back to last known position if available
      const last = Store.get('last_gps', null);
      if (last) {
        const coords = document.getElementById('gps-coords');
        if (coords) coords.textContent = `Last known: ${last.lat.toFixed(5)}, ${last.lon.toFixed(5)}`;
      }
    }, {enableHighAccuracy: true, maximumAge: 30000});
  },

  _preCaching: false,
  async preCacheArea() {
    if (this._preCaching) { Toast.show('Cache already in progress — please wait', 'info'); return; }
    if (!navigator.onLine) { Toast.show('Already offline — tiles cached from previous visits will work', 'info'); return; }
    const pos = Store.get('last_gps', null);
    if (!pos) { Toast.show('GPS location needed — start GPS first', 'warning'); return; }

    this._preCaching = true;
    const btn = document.getElementById('map-btn-cache');
    const origBtnText = btn ? btn.textContent : null;
    if (btn) { btn.style.pointerEvents = 'none'; }

    const _restoreBtn = () => {
      this._preCaching = false;
      if (btn) { btn.textContent = origBtnText || '📥 Cache Area'; btn.style.pointerEvents = ''; }
    };

    const { lat, lon } = pos;
    const zoomMin = 12, zoomMax = 16;
    let total = 0, done = 0, errors = 0;

    function latLonToTile(lat, lon, z) {
      const n = Math.pow(2, z);
      const x = Math.floor((lon + 180) / 360 * n);
      const latRad = lat * Math.PI / 180;
      const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
      return { x, y };
    }

    const tileSets = [];
    for (let z = zoomMin; z <= zoomMax; z++) {
      const n = Math.pow(2, z);
      const radius = Math.max(2, Math.floor(5 / (40075016 / n / 256 / 1000)));
      const center = latLonToTile(lat, lon, z);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const ty = center.y + dy;
          if (ty < 0 || ty >= n) continue; // skip invalid y (poles)
          const tx = ((center.x + dx) % n + n) % n; // wrap x around antimeridian
          tileSets.push({ z, x: tx, y: ty });
        }
      }
    }
    total = tileSets.length;

    if (btn) btn.textContent = `⏳ 0/${total}`;
    Toast.show(`Caching ${total} tiles for offline use…`, 'info', 4000);

    const batchSize = 6;
    for (let i = 0; i < tileSets.length; i += batchSize) {
      const batch = tileSets.slice(i, i + batchSize);
      await Promise.all(batch.map(async ({z, x, y}) => {
        const key = `${z}/${x}/${y}`;
        try {
          const existing = await DB.getTile(key);
          if (existing) { done++; return; }
          const sub = ['a','b','c'][Math.abs(x + y) % 3];
          const url = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
          const resp = await fetch(url);
          if (resp.ok) {
            const blob = await resp.blob();
            await DB.putTile(key, blob);
            done++;
          }
        } catch(e) { errors++; }
      }));
      if (btn) btn.textContent = `⏳ ${done}/${total}`;
    }

    _restoreBtn();
    Toast.show(`✓ Cached ${done} tiles for offline use${errors ? ` (${errors} failed)` : ''}`, 'success', 5000);
  },

  startCompass() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      Toast.show('Compass not supported on this device', 'warning');
      const compassCard = document.getElementById('compass-heading');
      if (compassCard) compassCard.textContent = 'Compass: not available on this device';
      const compassBtn = document.querySelector('[onclick="MapTool.startCompass()"]');
      if (compassBtn) compassBtn.style.display = 'none';
      return;
    }
    if (DeviceOrientationEvent.requestPermission) {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') {
          this._listenCompass();
        } else {
          Toast.show('Compass permission denied — check device settings', 'warning');
        }
      }).catch(() => {
        Toast.show('Compass permission request failed', 'warning');
      });
    } else {
      this._listenCompass();
    }
  },

  _listenCompass() {
    window.addEventListener('deviceorientation', e => {
      const rawHeading = (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null)
        ? e.webkitCompassHeading           // iOS: clockwise from north, correct
        : (360 - (e.alpha || 0)) % 360;    // Android: convert counterclockwise to clockwise
      const h = Math.round(rawHeading);
      const el = document.getElementById('compass-heading');
      if (el) el.textContent = 'Heading: ' + h + '°';
      const compass = document.getElementById('compass-display');
      if (compass) compass.style.transform = 'rotate(' + (-h) + 'deg)';
    });
    Toast.show('🧭 Compass is now active', 'success');
  },

  renderSavedLocations() {
    const list = document.getElementById('saved-locations');
    if (!list) return;
    if (!this._markers.length) {
      list.innerHTML = '<div class="text-secondary font-sm" style="padding:12px 0;text-align:center">No locations saved — tap the map or use Add Location</div>';
      return;
    }
    const icons = {meeting:'📍',water:'💧',shelter:'🏠',hazard:'⚠️',medical:'🏥',gps:'📶'};
    const gps = Store.get('last_gps', null);
    list.innerHTML = this._markers.map((m, i) => {
      let distHtml = '';
      if (gps && m.lat != null) {
        const R = 6371;
        const dLat = (m.lat - gps.lat) * Math.PI / 180;
        const dLon = (m.lon - gps.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(gps.lat*Math.PI/180) * Math.cos(m.lat*Math.PI/180) * Math.sin(dLon/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distHtml = ` · <span style="color:var(--accent)">${dist < 1 ? (dist*1000).toFixed(0)+'m' : dist.toFixed(2)+'km'}</span>`;
      }
      return `
      <div class="member-item">
        <div class="member-avatar" style="font-size:20px">${icons[m.type]||'📌'}</div>
        <div style="flex:1">
          <div class="font-sm bold">${esc(m.label || m.type)}</div>
          <div class="font-xs text-muted">${esc(m.type)} · ${m.lat != null ? m.lat.toFixed(4)+', '+m.lon.toFixed(4) : ''}${distHtml}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="MapTool.flyTo(${i})" title="Fly to" aria-label="Fly to location" style="margin-right:4px">🎯</button>
        <button class="btn btn-ghost btn-sm" onclick="MapTool.removeMarker(${i})" aria-label="Remove marker" title="Remove">✕</button>
      </div>`;
    }).join('');
  },

  flyTo(i) {
    const m = this._markers[i];
    if (m && m.lat != null) {
      this._lat = m.lat; this._lon = m.lon; this._zoom = 16;
      this.draw();
    }
  },

  removeMarker(i) {
    const m = this._markers[i];
    const label = m ? (m.label || m.type || 'this location') : 'this location';
    Modal.confirm(`Remove "${label}" from the map?`, function() {
      MapTool._markers.splice(i, 1);
      Store.set('map_markers', MapTool._markers);
      MapTool.draw();
      MapTool.renderSavedLocations();
    }, 'Remove', 'Cancel');
  },

  openLocationForm() {
    Modal.open(`
      <p style="margin:0 0 12px">Add a location by coordinates.</p>
      <label class="font-sm semibold">Location Name</label>
      <input type="text" id="loc-name-input" maxlength="60" class="form-input w-full" placeholder="e.g. Community Center" style="margin:6px 0 12px">
      <label class="font-sm semibold">Coordinates (lat, lon)</label>
      <input type="text" id="loc-coords-input" maxlength="60" class="form-input w-full" placeholder="e.g. 37.7749, -122.4194" style="margin:6px 0 12px">
      <label class="font-sm semibold">Type</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0 16px">
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='meeting'">📍 Meeting Point</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='water'">💧 Water Source</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='shelter'">🏠 Shelter</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='hazard'">⚠️ Hazard Zone</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start;grid-column:1/-1" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='medical'">🏥 Medical</button>
      </div>
      <input type="hidden" id="loc-type-val" value="meeting">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="MapTool._doAddLocation(document.getElementById('loc-name-input').value.trim(),document.getElementById('loc-coords-input').value.trim(),document.getElementById('loc-type-val').value)">Add Location</button>
      </div>
    `, '🗺️ Add Location');
  },

  _doAddLocation(name, coords, type) {
    if (!name) {
      const inp = document.getElementById('loc-name-input');
      if (inp) {
        inp.style.borderColor = 'var(--error, #ef4444)';
        inp.setAttribute('aria-invalid', 'true');
        let err = document.getElementById('loc-name-error');
        if (!err) {
          err = document.createElement('div');
          err.id = 'loc-name-error';
          err.style.cssText = 'color:var(--error,#ef4444);font-size:12px;margin-top:-8px;margin-bottom:8px';
          err.textContent = 'Location name is required';
          inp.parentNode.insertBefore(err, inp.nextSibling);
        }
        inp.focus();
      }
      return;
    }
    let lat = this._lat, lon = this._lon;
    if (coords) {
      const parts = coords.split(',').map(Number);
      if (parts.length === 2 && !parts.some(isNaN)) {
        const pLat = parts[0], pLon = parts[1];
        if (pLat < -90 || pLat > 90) { Toast.show('Latitude must be between -90 and 90', 'error'); return; }
        if (pLon < -180 || pLon > 180) { Toast.show('Longitude must be between -180 and 180', 'error'); return; }
        lat = pLat; lon = pLon;
      } else {
        Toast.show('Coordinates not recognised — use format: 37.7749, -122.4194', 'error'); return;
      }
    }
    Modal.close();
    this._markers.push({lat, lon, type: type||'meeting', label: name, ts: new Date().toISOString()});
    Store.set('map_markers', this._markers);
    this._lat = lat; this._lon = lon; this._zoom = 15;
    this.draw();
    this.renderSavedLocations();
  }
};

// === RADIO ===
const Radio = {
  _inited: false,
  _audioCtx: null,
  _morseTimeout: null,
  _morseEndTimer: null,

  init() {
    if (this._inited) return;
    this._inited = true;
    this.initPhonetic();
    this.initMorseChart();
  },

  initPhonetic() {
    const grid = document.getElementById('phonetic-grid');
    if (!grid) return;
    grid.innerHTML = PHONETIC.map(([l, w]) => `
      <div class="phonetic-item">
        <div class="phonetic-letter">${l}</div>
        <div class="phonetic-word">${w}</div>
      </div>
    `).join('');
  },

  initMorseChart() {
    const chart = document.getElementById('morse-chart');
    if (!chart) return;
    chart.innerHTML = Object.entries(MORSE).map(([c, m]) => `
      <div class="morse-item">
        <span class="morse-char">${c === ' ' ? 'SPC' : esc(c)}</span>
        <span class="morse-code">${esc(m)}</span>
      </div>
    `).join('');
  },

  _setMorsePlaying(active) {
    const btn = document.getElementById('morse-play-btn');
    const status = document.getElementById('morse-status');
    if (btn) {
      btn.textContent = active ? '⏸ Playing…' : '▶ Play';
      if (active) btn.classList.add('morse-playing');
      else btn.classList.remove('morse-playing');
    }
    if (status) status.style.display = active ? 'inline' : 'none';
  },

  updateEncodeOutput() {
    const rawInput = document.getElementById('morse-input');
    const out = document.getElementById('morse-encode-output');
    if (!rawInput || !out) return;
    const input = rawInput.value.trim().toUpperCase();
    if (!input) { out.style.display = 'none'; return; }
    const parts = [];
    for (const char of input) {
      if (char === ' ') { parts.push('/'); continue; }
      const code = MORSE[char];
      if (code) parts.push(code); else parts.push('?');
    }
    out.textContent = parts.join(' ');
    out.style.display = 'block';
  },

  playMorse() {
    const rawInput = document.getElementById('morse-input').value.trim();
    if (!rawInput) { Toast.show('Enter text to encode as Morse', 'warning'); return; }
    const input = rawInput.toUpperCase();
    this.stopMorse();
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      Toast.show('Audio not available in this browser', 'error'); return;
    }
    const ctx = this._audioCtx;
    // Resume is mandatory on user gesture — browsers start AudioContext suspended.
    const startPlayback = () => {
      const speedEl = document.getElementById('morse-speed');
      const dot = speedEl ? parseFloat(speedEl.value) : 0.1; // seconds per dot unit
      let t = ctx.currentTime + 0.05;
      let totalDur = 0;

      const playTone = (dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 650;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        gain.gain.linearRampToValueAtTime(0, t + dur - 0.01);
        osc.start(t); osc.stop(t + dur);
        // Visual flash + vibration synced to tone
        const wallDelay = (t - ctx.currentTime) * 1000;
        setTimeout(() => {
          const flash = document.getElementById('morse-flash');
          if (flash) { flash.style.display = 'block'; flash.style.opacity = '1'; }
          if (navigator.vibrate) navigator.vibrate(Math.round(dur * 1000));
          setTimeout(() => {
            if (flash) { flash.style.opacity = '0'; setTimeout(() => { if (flash) flash.style.display = 'none'; }, 100); }
          }, Math.round(dur * 1000));
        }, wallDelay);
        t += dur;
      };

      for (const char of input) {
        if (char === ' ') { t += dot * 7; continue; }
        const code = MORSE[char];
        if (!code) continue;
        for (const sym of code) {
          if (sym === '.') playTone(dot);
          else if (sym === '-') playTone(dot * 3);
          t += dot; // inter-element gap
        }
        t += dot * 2; // inter-character gap
      }
      totalDur = (t - ctx.currentTime) * 1000;
      this._setMorsePlaying(true);
      // Auto-clear playing state when sequence finishes
      this._morseEndTimer = setTimeout(() => this._setMorsePlaying(false), totalDur + 100);
      Toast.show('Playing Morse: ' + input, 'info');
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(startPlayback);
    } else {
      startPlayback();
    }
  },

  stopMorse() {
    if (this._morseEndTimer) { clearTimeout(this._morseEndTimer); this._morseEndTimer = null; }
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch(e) {}
      this._audioCtx = null;
    }
    const flash = document.getElementById('morse-flash');
    if (flash) { flash.style.opacity = '0'; flash.style.display = 'none'; }
    if (navigator.vibrate) navigator.vibrate(0);
    this._setMorsePlaying(false);
  },

  decodeMorse(inputOverride) {
    const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
    const raw = inputOverride !== undefined
      ? inputOverride
      : (document.getElementById('morse-decode-input') ? document.getElementById('morse-decode-input').value.trim() : '');
    if (!raw) { Toast.show('Enter Morse code to decode', 'warning'); return; }
    const words = raw.split(' / ');
    const decoded = words.map(word => {
      if (!word.trim()) return '';
      return word.trim().split(' ').map(sym => {
        sym = sym.trim();
        if (!sym) return '';
        return MORSE_REV[sym] || '?';
      }).join('');
    }).join(' ');
    const out = document.getElementById('morse-decode-output');
    if (out) {
      out.style.display = 'block';
      out.textContent = decoded;
    }
    return decoded;
  },

  copyFreq(text, el) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        Toast.show('Copied: ' + text, 'success', 1800);
        if (el) {
          const orig = el.style.background;
          el.style.background = 'var(--accent-glow)';
          setTimeout(() => { el.style.background = orig; }, 600);
        }
      }).catch(() => {
        Toast.show('Could not copy — select the frequency manually', 'warning');
      });
    } else {
      Toast.show('Clipboard not available in this browser', 'warning');
    }
  },

  setFilter(band, btn) {
    // Update active button
    const bar = document.getElementById('radio-filter-bar');
    if (bar) bar.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    // Show/hide cards
    const panel = document.getElementById('tab-radio');
    if (!panel) return;
    panel.querySelectorAll('.card[data-radio-band]').forEach(card => {
      if (band === 'all') {
        card.style.display = '';
      } else {
        card.style.display = card.dataset.radioBand === band ? '' : 'none';
      }
    });
    // Cards without data-radio-band (the logbook) are always visible
    panel.querySelectorAll('.card:not([data-radio-band])').forEach(card => {
      card.style.display = '';
    });
  }
};

// === NETWORK ===
const Network = {
  async connectHub() {
    const hubInputEl = document.getElementById('hub-url-input');
    let url = hubInputEl ? hubInputEl.value.trim() : '';
    if (!url) { Toast.show('Enter a hub address (e.g. 192.168.1.100:3000)', 'error'); return; }
    // Normalize: strip trailing slash, add http:// if scheme is missing
    url = url.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    if (hubInputEl) hubInputEl.value = url; // show normalized URL to user
    Store.set('hub_url', url);
    SoftHub.yield_to_external(); // yield soft-hub role to the external hub
    // Keep Settings panel in sync
    const settingsEl = document.getElementById('set-hub-url');
    if (settingsEl) settingsEl.value = url;
    document.getElementById('hub-url-display') && (document.getElementById('hub-url-display').textContent = 'Hub: ' + url);
    Toast.show('Connecting to hub…', 'info');
    const btn = document.querySelector('button[onclick*="Network.connectHub("]');
    BtnLoading.start(btn, '⏳ Connecting…');
    try { await Hub.sync(true); } finally { BtnLoading.stop(btn); Hub.updateSyncDisplay(); }
  },

  async scanHub() {
    const btn = document.querySelector('button[onclick*="Network.scanHub("]');
    if (btn && btn.dataset.loading === '1') return;
    BtnLoading.start(btn, '⏳ Scanning…');
    try { await this._scanHub(); }
    catch (e) {
      console.warn('Network.scanHub error:', e);
      Toast.show('Hub scan failed — enter the hub URL manually above', 'error', 4000);
    }
    finally { BtnLoading.stop(btn); }
  },

  async _scanHub() {
    const results = document.getElementById('scan-results');
    if (results) results.innerHTML = '<div class="font-sm text-secondary">🔍 Scanning for ARK hubs…</div>';

    const found = new Map(); // url → label

    // 1. mDNS scan via connected hub's /api/scan-local (hub does the LAN multicast)
    if (Hub.url) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 7000);
        try {
          const r = await fetch(Hub.url + '/api/scan-local', {signal: ctrl.signal});
          if (r.ok) {
            const data = await r.json();
            for (const h of (data.hubs || [])) found.set(h.url, h.name || h.url);
          }
        } finally { clearTimeout(tid); }
      } catch {}
    }

    // 2. Common IP sweep (parallel, 1.5 s timeout each)
    const common = ['10.42.0.1','192.168.1.1','192.168.0.1','192.168.4.1','172.16.0.1','10.0.0.1'];
    if (results) results.innerHTML = `<div class="font-sm text-secondary">🔍 Checking ${common.length} common hub addresses…</div>`;
    let checked = 0;
    await Promise.all(common.map(async ip => {
      const url = 'http://' + ip + ':8080';
      if (found.has(url)) { checked++; return; }
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 1500);
      try {
        const r = await fetch(url + '/api/status', {signal: ctrl.signal});
        if (r.ok) { const st = await r.json().catch(() => ({})); found.set(url, st.name || url); }
      } catch {}
      finally {
        clearTimeout(tid);
        checked++;
        if (results && found.size === 0) results.innerHTML = `<div class="font-sm text-secondary">🔍 Checked ${checked}/${common.length}…</div>`;
      }
    }));

    if (!results) return;
    if (found.size) {
      results.innerHTML = [...found.entries()].map(([u, label]) =>
        `<div class="font-sm mb-8"><span class="text-green">✓ </span><b>${esc(label)}</b> — <a href="#" class="text-accent" data-url="${esc(u)}" onclick="Network.useHub(this.dataset.url);return false">${esc(u)}</a></div>`
      ).join('');
    } else {
      results.innerHTML = '<div class="font-sm text-secondary">No hubs found. Enter the hub URL manually above.</div>';
    }
  },

  useHub(url) {
    const el = document.getElementById('hub-url-input'); if (el) el.value = url;
    this.connectHub();
  },

  generateHubQR() {
    const url = Store.get('hub_url', '');
    if (!url) { Toast.show('No hub URL yet — connect to a hub above first, then generate its QR code', 'warning', 4000); return; }
    const display = document.getElementById('qr-hub-display');
    const btn = document.querySelector('button[onclick*="Network.generateHubQR("]');
    if (btn && btn.dataset.loading === '1') return;
    BtnLoading.start(btn, '⏳ Generating…');
    // Yield a frame so the loading label paints before the synchronous QR encode runs
    setTimeout(() => {
      try {
        if (display) display.innerHTML = this.makeQRSVG(url);
      } catch (e) {
        console.warn('Network.generateHubQR error:', e);
        Toast.show('QR generation failed — share the hub URL as text instead', 'error', 4000);
      } finally {
        BtnLoading.stop(btn);
      }
    }, 30);
  },

  makeQRSVG(text) {
    // Real QR code generation using QR.js (embedded minimal implementation)
    try {
      const matrix = ARKQr.encode(text);
      const n = matrix.length;
      const cell = 6;
      const quiet = 4; // quiet zone in cells
      const total = (n + quiet * 2) * cell;
      let rects = '';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c]) {
            rects += `<rect x="${(c + quiet) * cell}" y="${(r + quiet) * cell}" width="${cell}" height="${cell}"/>`;
          }
        }
      }
      return `<div style="background:#fff;padding:10px;border-radius:6px;display:inline-block;text-align:center">
        <svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" style="display:block">
          <rect width="${total}" height="${total}" fill="#fff"/>
          <g fill="#000">${rects}</g>
        </svg>
        <div style="font-size:10px;color:#333;margin-top:4px;max-width:${total}px;word-break:break-all;font-family:monospace">${esc(text)}</div>
      </div>`;
    } catch(e) {
      // Graceful fallback: show URL in a box if QR encoding fails
      return `<div style="background:#fff;padding:10px;border-radius:6px;display:inline-block;text-align:center">
        <div class="flex-center" style="width:128px;height:128px;background:#fff;border:2px solid #000;padding:8px">
          <div style="font-size:9px;color:#000;word-break:break-all;font-family:monospace">${esc(text)}</div>
        </div>
        <div style="font-size:10px;color:#333;margin-top:4px">Share this URL</div>
      </div>`;
    }
  },

  _qrScanTimer: null,

  async startQRScan() {
    const container = document.getElementById('qr-video-container');
    const video = document.getElementById('qr-video');
    if (!container || !video) return;

    // Check for BarcodeDetector support first
    const hasBarcodeDetector = typeof BarcodeDetector !== 'undefined';
    if (!hasBarcodeDetector && !navigator.mediaDevices) {
      Toast.show('QR scanning not supported on this browser — enter the hub address manually', 'warning', 5000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
      video.srcObject = stream;
      container.classList.remove('hidden');

      if (hasBarcodeDetector) {
        // Use native BarcodeDetector for real QR decoding
        const detector = new BarcodeDetector({formats: ['qr_code']});
        const scanFrame = async () => {
          if (!video.srcObject) return; // stopped
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              const rawValue = codes[0].rawValue;
              // Expect a URL — populate input and connect
              if (rawValue && (rawValue.startsWith('http://') || rawValue.startsWith('https://'))) {
                this.stopQRScan();
                const urlInput = document.getElementById('hub-url-input');
                if (urlInput) urlInput.value = rawValue;
                Toast.show('QR code scanned — tap Connect to join', 'success', 4000);
                return; // stop scanning
              }
            }
          } catch(e) {}
          this._qrScanTimer = setTimeout(scanFrame, 400);
        };
        video.addEventListener('loadedmetadata', () => { scanFrame(); }, {once: true});
        Toast.show('Camera started — point at a hub QR code', 'info');
      } else {
        // No BarcodeDetector — inform user it won't auto-read
        Toast.show('Camera started — your browser does not support QR decoding. Enter the address manually.', 'warning', 6000);
      }
    } catch(e) {
      Toast.show('Camera not available — ' + (e.name === 'NotAllowedError' ? 'camera permission denied' : e.message) + '. Enter the hub address manually.', 'error', 5000);
    }
  },

  stopQRScan() {
    if (this._qrScanTimer) { clearTimeout(this._qrScanTimer); this._qrScanTimer = null; }
    const video = document.getElementById('qr-video');
    const container = document.getElementById('qr-video-container');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    if (container) container.classList.add('hidden');
  },

  // === ONE-TAP SOFT HUB ===
  startSoftHub() {
    SoftHub.claimHubManually();
    this._updateHubDeployUI();
    // Detect IP then broadcast our hub address to any other open ARK tabs
    this.detectLocalIP().then(ip => {
      if (ip) {
        // Clear any stale QR so _updateHubDeployUI regenerates with the real IP
        const qrDeploy = document.getElementById('hub-deploy-qr');
        const qrShare2 = document.getElementById('qr-hub-display');
        if (qrDeploy) qrDeploy.innerHTML = '';
        if (qrShare2) qrShare2.innerHTML = '';
      }
      this._updateHubDeployUI();
      if (ip && SoftHub.startDiscovery) SoftHub.startDiscovery();
    });
  },

  stopSoftHub() {
    SoftHub.stop();
    this._updateHubDeployUI();
  },

  // Called from the auto-discovery "Join →" banner
  async joinFromBanner(hubUrl) {
    if (!hubUrl) return;
    Store.set('hub_url', hubUrl);
    Hub.updateSyncDisplay && Hub.updateSyncDisplay();
    SoftHub.yield_to_external && SoftHub.yield_to_external();
    Toast.show('🔗 Connecting to hub…', 'info', 3000);
    try { await Hub.sync(true); } catch(e) {}
    // Update the hub URL input if visible
    const urlInput = document.getElementById('hub-url-input');
    if (urlInput) urlInput.value = hubUrl;
    // Update Network tab display
    this._updateHubDeployUI();
    Hub.updateSyncDisplay && Hub.updateSyncDisplay();
  },

  _updateHubDeployUI() {
    const card    = document.getElementById('hub-deploy-card');
    const peer    = document.getElementById('hub-deploy-peer-state');
    const active  = document.getElementById('hub-deploy-active-state');
    const badge   = document.getElementById('hero-hub-badge');
    const homeStatus = document.getElementById('softhub-home-status');
    const qrShare = document.getElementById('hub-qr-share-card');

    const isHub = SoftHub.isHub();
    if (card)   { card.classList.toggle('hub-is-active', isHub); }
    if (peer)   peer.style.display   = isHub ? 'none' : '';
    if (active) active.style.display = isHub ? ''     : 'none';
    if (badge)  { badge.style.display = isHub ? '' : 'none'; }
    if (homeStatus) {
      homeStatus.textContent = isHub ? '🛰 You are the Hub' : '📡 Peer mode';
      homeStatus.style.color = isHub ? 'var(--accent)' : 'var(--text-muted)';
    }
    // Show QR share card when soft-hub OR connected to external hub
    const hasExternalHub = !!Hub.url;
    if (qrShare) qrShare.style.display = (isHub || hasExternalHub) ? '' : 'none';
    // Hide first-use tip once the user has taken any network action
    const tipEl = document.getElementById('network-first-use-tip');
    if (tipEl && (isHub || hasExternalHub)) tipEl.style.display = 'none';
    if (isHub) {
      const ipEl = document.getElementById('hub-ip-value');
      const ip = Store.get('softhub_detected_ip', '');
      if (ipEl) ipEl.textContent = ip || 'Detecting…';
      // Auto-generate QR if we have an IP
      if (ip) {
        const hubAddr = 'http://' + ip + ':8080';
        const qrDeploy = document.getElementById('hub-deploy-qr');
        if (qrDeploy && !qrDeploy.innerHTML) {
          try { qrDeploy.innerHTML = this.makeQRSVG(hubAddr); } catch(e) {}
        }
        // Also update the share card QR
        const qrShare2 = document.getElementById('qr-hub-display');
        if (qrShare2 && !qrShare2.querySelector('svg')) {
          try { qrShare2.innerHTML = this.makeQRSVG(hubAddr); } catch(e) {}
        }
      }
    } else if (hasExternalHub) {
      // For external hub: auto-populate share QR with the connected hub URL
      const qrShare2 = document.getElementById('qr-hub-display');
      if (qrShare2 && !qrShare2.querySelector('svg')) {
        try { qrShare2.innerHTML = this.makeQRSVG(Hub.url); } catch(e) {}
      }
    }
    // Update peer count badge
    const peerBadge = document.getElementById('hub-deploy-peer-count');
    if (peerBadge) {
      const n = SoftHub.peerCount();
      peerBadge.textContent = n + (n === 1 ? ' peer' : ' peers');
    }
  },

  async detectLocalIP() {
    // Use RTCPeerConnection trick to detect LAN IP
    return new Promise(resolve => {
      try {
        const pc = new RTCPeerConnection({iceServers: []});
        pc.createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o));
        pc.onicecandidate = e => {
          if (!e || !e.candidate) { pc.close(); resolve(null); return; }
          const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          // Accept private-range IPs only (10.x, 172.16-31.x, 192.168.x, NOT 127.x or 169.254.x)
          if (m) {
            const ip = m[1];
            const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
            if (isPrivate) {
              Store.set('softhub_detected_ip', ip);
              pc.close(); resolve(ip);
            }
          }
        };
        setTimeout(() => { pc.close(); resolve(null); }, 3000);
      } catch(e) { resolve(null); }
    });
  },

  copyHubIP() {
    const ip = Store.get('softhub_detected_ip', '');
    if (!ip) {
      Toast.show('IP not detected yet — make sure Wi-Fi is connected and try again', 'warning', 4000);
      return;
    }
    const addr = 'http://' + ip + ':8080';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(() => Toast.show('Address copied: ' + addr, 'success', 3500));
    } else {
      // Fallback: select a temp input
      const t = document.createElement('textarea');
      t.value = addr; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); Toast.show('Address copied!', 'success'); } catch(e) {}
      document.body.removeChild(t);
    }
  },

  // === BUG REPORTING + AUTO-PATCH (hardened) ===
  PATCH_URL: 'ARK.php?patches',
  BUG_URL:   'ARK.php?bugs',
  _patchCheckInterval: null,

  // Current app version — bump this when deploying new HTML
  APP_VERSION: '1.1.0',

  _submitting: false, // in-flight guard

  async submitBugReport() {
    if (this._submitting) return; // prevent double-tap spam
    const textEl   = document.getElementById('bug-report-text');
    const statusEl = document.getElementById('bug-report-status');
    const btn      = document.querySelector('button[onclick*="submitBugReport"]');
    const text     = textEl ? textEl.value.trim() : '';
    if (!text) { Toast.show('Please describe the bug first', 'warning'); return; }
    this._submitting = true;

    // Collect useful but non-identifying diagnostic context
    const report = {
      schema: 1,
      ts: new Date().toISOString(),
      appVersion: this.APP_VERSION,
      patchLevel: Store.get('ark_patch_level', 'none'),
      url: window.location.href.substring(0, 300), // page URL (capped) for context
      ua: navigator.userAgent.substring(0, 200), // cap UA length
      online: navigator.onLine,
      hubConnected: !!Hub.url,
      softHubRole: SoftHub.isHub() ? 'hub' : 'peer',
      activeTab: document.querySelector('.tab-panel.active') ? document.querySelector('.tab-panel.active').id : 'unknown',
      bug: text.substring(0, 2000), // cap report length
      // Last few console errors if captured
      recentErrors: (window._arkErrors || []).slice(-5)
    };

    BtnLoading.start(btn, '📤 Sending…');
    if (statusEl) statusEl.textContent = '📤 Submitting…';

    let sent = false;

    // 1. Try remote endpoint (internet)
    try {
      const r = await fetch(this.BUG_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(8000)
      });
      if (r.ok || r.status === 201 || r.status === 204) { sent = true; }
    } catch(e) {}

    // 2. Try hub relay (LAN fallback)
    if (!sent && Hub.url) {
      try {
        const r = await fetch(Hub.url + '/api/bug-report', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(report),
          signal: AbortSignal.timeout(5000)
        });
        if (r.ok) { sent = true; }
      } catch(e) {}
    }

    // 3. Queue locally for next-available send
    if (!sent) {
      try {
        const queue = JSON.parse(localStorage.getItem('ark_bug_queue') || '[]');
        queue.push(report);
        // Keep last 20 reports max
        if (queue.length > 20) queue.splice(0, queue.length - 20);
        localStorage.setItem('ark_bug_queue', JSON.stringify(queue));
      } catch(e) {}
    }

    BtnLoading.stop(btn);

    if (sent) {
      if (statusEl) statusEl.textContent = '✅ Sent! Thank you for the report.';
      if (textEl) textEl.value = '';
      Toast.show('Bug reported — we\'ll push a fix!', 'success', 5000);
    } else {
      // Fallback: pre-filled email — use capped report.bug (not raw text which may be huge)
      const body = encodeURIComponent(
        'ARK Bug Report\n' +
        '================\n' +
        'Issue: ' + report.bug + '\n\n' +
        'App: v' + this.APP_VERSION + '\n' +
        'Patch: ' + (Store.get('ark_patch_level','none')) + '\n' +
        'UA: ' + navigator.userAgent.substring(0, 150)
      );
      window.open('mailto:hello@halosuite.ai?subject=ARK+Bug+Report&body=' + body);
      if (statusEl) statusEl.textContent = '📧 Offline — opened email draft. Report queued locally.';
      if (textEl) textEl.value = '';
    }

    this._submitting = false;
    // Try to drain any queued reports if we're online
    if (navigator.onLine) this._drainBugQueue();
  },

  _draining: false, // concurrency guard

  // Silently drain queued bug reports when connection available
  async _drainBugQueue() {
    if (this._draining) return; // prevent concurrent drain loops
    this._draining = true;
    try {
      let queue;
      try {
        queue = JSON.parse(localStorage.getItem('ark_bug_queue') || '[]');
        if (!Array.isArray(queue)) throw new Error('not array');
      } catch(e) {
        // Corrupt queue — wipe it and bail
        localStorage.removeItem('ark_bug_queue');
        return;
      }
      if (!queue.length) return;
      const remaining = [];
      for (const report of queue) {
        try {
          const r = await fetch(this.BUG_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(report),
            signal: AbortSignal.timeout(5000)
          });
          if (!r.ok) remaining.push(report);
        } catch(e) { remaining.push(report); break; } // stop on network error
      }
      localStorage.setItem('ark_bug_queue', JSON.stringify(remaining));
    } catch(e) {}
    finally { this._draining = false; }
  },

  // Semver compare: "1.2.3" > "1.1.0" => true
  _semverGt(a, b) {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const ai = pa[i] || 0, bi = pb[i] || 0;
      if (ai > bi) return true;
      if (ai < bi) return false;
    }
    return false;
  },

  async checkForUpdates(silent = false) {
    const statusEl = document.getElementById('patch-status');
    const btn = document.querySelector('button[onclick*="checkForUpdates"]');
    if (!silent) { if (statusEl) statusEl.textContent = '🔍 Checking for updates…'; }
    if (btn && !silent) BtnLoading.start(btn, '🔍 Checking…');

    let patch = null;

    // Try sources in priority order: hub LAN → CDN remote
    const sources = [];
    if (Hub.url) sources.push(Hub.url + '/patches/latest.json');
    sources.push(this.PATCH_URL);

    for (const src of sources) {
      try {
        const r = await fetch(src + '?v=' + Date.now(), { // bust cache
          signal: AbortSignal.timeout(6000),
          headers: {'Cache-Control': 'no-cache'}
        });
        if (!r.ok) continue;
        const data = await r.json();
        // Validate structure
        if (data && typeof data.version === 'string') { patch = data; break; }
      } catch(e) {}
    }

    if (btn && !silent) BtnLoading.stop(btn);

    if (!patch) {
      if (!silent) {
        if (statusEl) statusEl.textContent = '📡 No update server reachable. ' + (navigator.onLine ? 'Try again later.' : 'You\'re offline.');
      }
      return false;
    }

    const currentV  = this.APP_VERSION;
    const patchedV  = Store.get('ark_patch_level', '0.0.0');
    const effectiveV = this._semverGt(patchedV, currentV) ? patchedV : currentV;

    if (!this._semverGt(patch.version, effectiveV)) {
      if (!silent) {
        if (statusEl) statusEl.textContent = '✅ Up to date — v' + effectiveV + '.';
      }
      return false;
    }

    // === APPLY PATCHES ===
    // Security: validate each operation before executing
    const ALLOWED_ACTIONS = new Set(['replace_text','replace_html','add_css','store_set','remove_element','show_element','hide_element','set_attr','remove_class','add_class']);
    let applied = 0, skipped = 0;
    const errors = [];

    // Validate patches is an array — a plain object or null would cause errors / silent skip
    const patchList = Array.isArray(patch.patches) ? patch.patches : [];
    for (const p of patchList) {
      if (!p || !ALLOWED_ACTIONS.has(p.action)) { skipped++; continue; }

      try {
        if (p.action === 'replace_text') {
          if (!p.selector || typeof p.value !== 'string') { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.textContent = p.value; applied++; });
        }
        else if (p.action === 'replace_html') {
          if (!p.selector || typeof p.value !== 'string') { skipped++; continue; }
          // Sanitize patched HTML: strip scripts, event handlers, javascript: URIs, iframes
          const _sanitizePatchHtml = (html) => {
            const tpl = document.createElement('template');
            tpl.innerHTML = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // script blocks
              .replace(/<script[^>]*\/?>/gi, '');                  // self-closing or open script tags
            tpl.content.querySelectorAll('*').forEach(el => {
              [...el.attributes].forEach(attr => {
                if (/^on/i.test(attr.name) ||
                    /^javascript:/i.test(attr.value) ||
                    /^data:/i.test(attr.value)) {
                  el.removeAttribute(attr.name);
                }
              });
            });
            tpl.content.querySelectorAll('iframe,object,embed,script,base,link[rel=import]').forEach(el => el.remove());
            // Also strip svg <use> elements that can load external resources
            tpl.content.querySelectorAll('use').forEach(el => {
              if ((el.getAttribute('href') || el.getAttribute('xlink:href') || '').includes(':')) el.remove();
            });
            const div = document.createElement('div');
            div.appendChild(tpl.content.cloneNode(true));
            return div.innerHTML;
          };
          const safe = _sanitizePatchHtml(p.value);
          document.querySelectorAll(p.selector).forEach(el => { el.innerHTML = safe; applied++; });
        }
        else if (p.action === 'add_css') {
          if (typeof p.value !== 'string') { skipped++; continue; }
          // Block CSS constructs that can exfiltrate data or load remote resources:
          // @import, url(), expression() (IE), and javascript: in CSS values
          if (/@import|url\s*\(|expression\s*\(|javascript\s*:/i.test(p.value)) { skipped++; continue; }
          const style = document.createElement('style');
          style.id = 'ark-patch-css-' + (applied);
          style.dataset.patchVersion = patch.version;
          style.textContent = p.value;
          document.head.appendChild(style); applied++;
        }
        else if (p.action === 'store_set') {
          if (!p.key || typeof p.key !== 'string') { skipped++; continue; }
          // Only allow patching safe known keys — not hub_url, credentials etc
          // Prefix keys: ark_*, checklist_*, guide_* — exact keys: alert_level, hh_name, last_alias
          const SAFE_STORE_KEYS = /^(ark_|checklist_|guide_)[a-z0-9_-]+$|^(alert_level|hh_name|last_alias|custom_checklists)$/;
          if (!SAFE_STORE_KEYS.test(p.key)) { skipped++; continue; }
          // Only allow primitive values to prevent store corruption
          if (typeof p.value !== 'string' && typeof p.value !== 'number' && typeof p.value !== 'boolean') { skipped++; continue; }
          Store.set(p.key, p.value); applied++;
        }
        else if (p.action === 'remove_element') {
          if (!p.selector) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.remove(); applied++; });
        }
        else if (p.action === 'show_element') {
          if (!p.selector) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.style.display = ''; applied++; });
        }
        else if (p.action === 'hide_element') {
          if (!p.selector) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.style.display = 'none'; applied++; });
        }
        else if (p.action === 'add_class') {
          if (!p.selector || !p.value) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.classList.add(p.value); applied++; });
        }
        else if (p.action === 'remove_class') {
          if (!p.selector || !p.value) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.classList.remove(p.value); applied++; });
        }
        else if (p.action === 'set_attr') {
          if (!p.selector || !p.attr || typeof p.attr !== 'string') { skipped++; continue; }
          // Block dangerous attributes (event handlers, navigation, inline html, style injection)
          if (/^on/i.test(p.attr) ||
              /^(href|src|srcdoc|style|action|formaction|formmethod|xlink:href|data|xmlns)$/i.test(p.attr)) { skipped++; continue; }
          // Also block dangerous values regardless of attribute (javascript: and data: URIs)
          if (typeof p.value === 'string' && /^\s*(javascript|data|vbscript)\s*:/i.test(p.value)) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.setAttribute(p.attr, p.value || ''); applied++; });
        }
      } catch(e) {
        errors.push(p.action + ':' + (p.selector || ''));
        console.warn('[ARK patch error]', p, e);
      }
    }

    // Only persist patch level when at least one op was successfully applied
    if (applied > 0) {
      Store.set('ark_patch_level', patch.version);
      Store.set('ark_patch_ts', new Date().toISOString());
      Store.set('ark_patch_summary', patch.summary || '');
    }

    const summary = patch.summary || (applied + ' fix' + (applied !== 1 ? 'es' : '') + ' applied');

    if (applied > 0) {
      if (statusEl) statusEl.textContent = '✅ Patch v' + patch.version + ' — ' + summary + (skipped ? ' (' + skipped + ' skipped)' : '') + '.';
      if (!silent) {
        Toast.show('🔧 ARK patched to v' + patch.version + ': ' + summary, 'success', 7000);
      } else {
        // Silent patch: show a brief non-intrusive status bar indicator
        const sb = document.getElementById('status-bar');
        if (sb) {
          const patchNote = document.createElement('span');
          patchNote.id = 'ark-patch-note';
          patchNote.style.cssText = 'margin-left:8px;font-size:.7rem;color:var(--accent,#8b6f3e);font-weight:600';
          patchNote.textContent = '🔧 Patched v' + patch.version;
          sb.appendChild(patchNote);
          setTimeout(() => { patchNote.remove(); }, 10 * 60 * 1000); // remove after 10 min
        }
      }
      // Log for support
      console.info('[ARK] Patch', patch.version, 'applied:', applied, 'ops,', skipped, 'skipped,', errors.length, 'errors');
    } else if (skipped > 0) {
      if (!silent) {
        if (statusEl) statusEl.textContent = '⚠️ Patch available but could not apply (' + skipped + ' ops skipped).';
      }
    }

    return applied > 0;
  },

  // Auto-check for patches on startup (silent)
  async initPatchCheck() {
    // Check after 10s on first load, then every 2 hours
    setTimeout(() => this.checkForUpdates(true), 10000);
    this._patchCheckInterval = setInterval(() => this.checkForUpdates(true), 2 * 60 * 60 * 1000);
    // Also drain any queued bug reports
    if (navigator.onLine) setTimeout(() => this._drainBugQueue(), 15000);
    // Listen for online event to drain queue
    window.addEventListener('online', () => this._drainBugQueue());
  }
};

// === CHECKLIST ===
const Checklist = {
  // Active checklist id
  _activeId: 'daily',

  // Pre-built checklist templates — keyed by id
  TEMPLATES: {
    daily: {
      id: 'daily',
      label: '📋 Daily Check',
      builtIn: true,
      items: [
        {id:'headcount',  label:'👨‍👩‍👧 Family headcount',   desc:'Confirm all household members are present and accounted for.'},
        {id:'injury',     label:'🩹 Injury check',           desc:'Assess everyone for wounds, burns, or unresponsiveness requiring first aid.'},
        {id:'medical',    label:'💊 Medication check',       desc:'Locate prescriptions, insulin, EpiPen, and first aid kit — verify supply.'},
        {id:'shelter',    label:'🏠 Shelter secure',         desc:'Check for structural damage, gas leaks, fire hazards, and broken glass.'},
        {id:'water',      label:'💧 Water supply',           desc:'1 gal/person/day minimum. Fill bathtubs now if mains may fail.'},
        {id:'food',       label:'🍽️ Food supply',            desc:'Verify at least a 72-hour supply of ready-to-eat food is accessible.'},
        {id:'power',      label:'🔋 Power check',            desc:'Test batteries, flashlights, generator fuel, and solar chargers.'},
        {id:'radio',      label:'📻 Radio check',            desc:'Tune to emergency broadcast. Confirm ARK hub is reachable if configured.'},
        {id:'comms',      label:'📱 Devices charged',        desc:'Charge phones, power banks, and satellite communicator if available.'},
        {id:'documents',  label:'📄 Documents secured',      desc:'Gather IDs, insurance papers, cash, and go-bag document copies.'},
        {id:'evacroute',  label:'🗺️ Evacuation route',       desc:'Confirm primary and at least one alternate route out of the area.'},
        {id:'safe',       label:'✅ Posted safe status',     desc:'Post "I\'m safe" to the ARK community board so others know.'},
      ]
    },
    bugout: {
      id: 'bugout',
      label: '🎒 Bug-Out Bag',
      builtIn: true,
      items: [
        {id:'bo-water',       label:'💧 Water (2L min per person)',        desc:'Fill reusable bottles. Include water purification tablets or filter.'},
        {id:'bo-food',        label:'🍫 Food (3-day supply)',              desc:'Energy bars, dried fruit, nuts, crackers — no cooking required.'},
        {id:'bo-firstaid',    label:'🩹 First aid kit',                   desc:'Bandages, antiseptic, pain relievers, blister pads, scissors.'},
        {id:'bo-meds',        label:'💊 Prescriptions (7-day supply)',     desc:'All daily medications, plus extras. Keep in waterproof bag.'},
        {id:'bo-docs',        label:'📄 Document copies',                  desc:'IDs, insurance cards, medication list, emergency contacts — laminated or in waterproof sleeve.'},
        {id:'bo-cash',        label:'💵 Cash (small bills)',               desc:'ATMs may be offline. Include coins. Recommend $100+ in small denominations.'},
        {id:'bo-flashlight',  label:'🔦 Flashlight + spare batteries',    desc:'LED flashlight or headlamp. Test before packing.'},
        {id:'bo-radio',       label:'📻 Hand-crank or battery radio',     desc:'For emergency broadcasts when power is out.'},
        {id:'bo-phone',       label:'📱 Phone + charger + power bank',    desc:'Fully charged. Include a car charger as backup.'},
        {id:'bo-clothing',    label:'👕 Change of clothes',               desc:'Season-appropriate layers. Sturdy shoes. Rain gear.'},
        {id:'bo-warmth',      label:'🧥 Warmth layer + emergency blanket',desc:'Mylar emergency blanket weighs almost nothing but is critical.'},
        {id:'bo-firestarter', label:'🔥 Fire starter',                    desc:'Waterproof matches or lighter. Firestarter cubes as backup.'},
        {id:'bo-knife',       label:'🔪 Knife or multi-tool',             desc:'Fixed blade or folding — for cutting, preparing food, repairs.'},
        {id:'bo-whistle',     label:'📯 Signal whistle',                  desc:'Pea-less whistle (Fox 40 style) — audible over 1 mile.'},
        {id:'bo-map',         label:'🗺️ Paper map of local area',         desc:'GPS fails. Know two routes out of your neighborhood.'},
        {id:'bo-hygiene',     label:'🧴 Basic hygiene kit',               desc:'Hand sanitizer, soap, toothbrush, toilet paper in zip-lock bag.'},
        {id:'bo-pet',         label:'🐾 Pet supplies (if applicable)',     desc:'Food, water, carrier, vaccination records, collar with ID.'},
      ]
    },
    shelterinplace: {
      id: 'shelterinplace',
      label: '🏠 Shelter-in-Place',
      builtIn: true,
      items: [
        {id:'sip-headcount',    label:'👨‍👩‍👧 Account for all household members',   desc:'Bring everyone indoors immediately. Locate pets.'},
        {id:'sip-seal',         label:'🪟 Seal doors and windows',                desc:'For chemical/air hazard: plastic sheeting + duct tape. Seal gaps around pipes.'},
        {id:'sip-hvac',         label:'🌀 Turn off HVAC and ventilation',          desc:'Turn off fans, air conditioning, heating systems. Close fireplace damper.'},
        {id:'sip-water-fill',   label:'💧 Fill water containers now',             desc:'Fill bathtubs, pots, bottles. Water mains may fail during prolonged shelter.'},
        {id:'sip-food',         label:'🍽️ Stock 72-hour food supply indoors',     desc:'Pull from your pantry or bug-out bag. No trips outside.'},
        {id:'sip-meds',         label:'💊 Locate all medications',                desc:'Gather prescriptions, first aid kit, and medical devices in one location.'},
        {id:'sip-radio',        label:'📻 Monitor emergency broadcasts',          desc:'Battery-powered radio. NOAA weather radio if available. Follow official instructions.'},
        {id:'sip-phone',        label:'📱 Charge all devices',                    desc:'Phone, power bank, medical devices — charge everything before power fails.'},
        {id:'sip-flashlights',  label:'🔦 Test all flashlights',                  desc:'Check batteries. Place a flashlight in every room.'},
        {id:'sip-sanitation',   label:'🚽 Prepare sanitation backup',             desc:'If water/sewage fails: 5-gallon bucket, heavy-duty bags, kitty litter as odor control.'},
        {id:'sip-contacts',     label:'📞 Notify out-of-area contact',            desc:'Text (not call) an out-of-area family contact that you are sheltering in place.'},
        {id:'sip-pets',         label:'🐾 Pets secured indoors',                  desc:'Bring all pets inside. Provide extra food and water.'},
        {id:'sip-documents',    label:'📄 Documents accessible',                  desc:'Emergency binder: IDs, insurance, medical records, contacts — in one grab-and-go location.'},
      ]
    },
    evacuation: {
      id: 'evacuation',
      label: '🚶 Evacuation',
      builtIn: true,
      items: [
        {id:'ev-alert',       label:'📻 Confirm evacuation order',              desc:'Listen to official channels. Know your evacuation zone (Zone A/B/C).'},
        {id:'ev-notify',      label:'📞 Notify household + out-of-area contact', desc:'Tell family where you are going. Text your out-of-area contact.'},
        {id:'ev-bugout',      label:'🎒 Grab bug-out bags',                     desc:'Each person carries their own bag. Know where bags are stored.'},
        {id:'ev-meds',        label:'💊 All medications accounted for',         desc:'Do not leave without prescription medications and medical devices.'},
        {id:'ev-docs',        label:'📄 Documents and valuables',               desc:'IDs, insurance, cash, house keys, irreplaceable items.'},
        {id:'ev-route',       label:'🗺️ Primary route confirmed clear',         desc:'Check radio for road closures. Know alternate route if primary is blocked.'},
        {id:'ev-destination', label:'🏁 Destination confirmed',                 desc:'Pre-designated meeting point, shelter location, or family address.'},
        {id:'ev-fuel',        label:'⛽ Vehicle has fuel',                       desc:'Keep tank above half when alerts are issued. Gas stations may be closed.'},
        {id:'ev-pets',        label:'🐾 Pets and carriers loaded',              desc:'Carrier, leash, food, water, vaccination records for each pet.'},
        {id:'ev-utilities',   label:'🔌 Utilities off (if time allows)',         desc:'Turn off gas, water, electricity at main shutoffs if time permits.'},
        {id:'ev-lock',        label:'🔒 Home secured',                          desc:'Lock doors and windows. Leave a note of your destination and departure time.'},
        {id:'ev-phone',       label:'📱 Devices charged in vehicle',             desc:'Plug in to car charger while driving. Enable location sharing with family.'},
        {id:'ev-water',       label:'💧 Water in vehicle',                      desc:'At least 1 gallon per person for travel.'},
        {id:'ev-checkin',     label:'✅ Check in at destination',               desc:'Post safe status on ARK. Tell emergency management you have evacuated.'},
      ]
    },
    kit72: {
      id: 'kit72',
      label: '🕐 72-Hour Kit',
      builtIn: true,
      items: [
        {id:'k72-water',      label:'💧 Water (3 gal/person — 72hr)',           desc:'1 gallon per person per day for drinking and sanitation. Store in sealed containers.'},
        {id:'k72-food',       label:'🥫 Food (3-day, no-cook supply)',          desc:'Canned goods (with pull tabs or manual opener), energy bars, dried foods, comfort foods.'},
        {id:'k72-opener',     label:'🔧 Manual can opener',                     desc:'Check it works. Keep it with the food kit.'},
        {id:'k72-firstaid',   label:'🩹 First aid kit (complete)',              desc:'Bandages, gauze, antiseptic, CPR mask, thermometer, pain relievers, tweezers, scissors.'},
        {id:'k72-meds',       label:'💊 7-day prescription supply',             desc:'Rotate regularly. Keep a list of medications with dosages.'},
        {id:'k72-flashlight', label:'🔦 Two flashlights + batteries',           desc:'LED. Store batteries separately to prevent corrosion.'},
        {id:'k72-radio',      label:'📻 Battery/hand-crank radio',              desc:'NOAA weather frequencies. Test monthly.'},
        {id:'k72-phone',      label:'🔋 High-capacity power bank (20,000 mAh+)', desc:'Can charge phone 5× times. Keep charged — recharge every 3 months.'},
        {id:'k72-whistle',    label:'📯 Whistle (pea-less)',                    desc:'To signal for help without using energy.'},
        {id:'k72-blanket',    label:'🌡️ Mylar emergency blankets (1 per person)', desc:'Lightweight, reflects 90% of body heat. Fits in a pocket.'},
        {id:'k72-clothing',   label:'👕 Extra clothing (season-appropriate)',   desc:'Full change per person including socks, underwear, rain poncho.'},
        {id:'k72-shoes',      label:'👟 Sturdy footwear',                       desc:'Closed-toe shoes that can walk over debris. Near the kit.'},
        {id:'k72-docs',       label:'📄 Copies of key documents',               desc:'Sealed waterproof bag: IDs, insurance, bank info, emergency contacts, medical records.'},
        {id:'k72-cash',       label:'💵 Cash (small denominations)',             desc:'$100+ in small bills. ATMs may be offline.'},
        {id:'k72-hygiene',    label:'🧴 Sanitation kit',                        desc:'Hand sanitizer, soap, wet wipes, toothbrushes, feminine hygiene, diapers if needed.'},
        {id:'k72-tools',      label:'🔧 Multi-tool or knife + duct tape',       desc:'Utility knife, pliers, screwdrivers. Duct tape has hundreds of emergency uses.'},
        {id:'k72-firestarter',label:'🔥 Fire starters + waterproof matches',   desc:'Lighter + backup waterproof matches stored in zip-lock bag.'},
        {id:'k72-pet',        label:'🐾 Pet kit (if applicable)',               desc:'3-day food/water, carrier, ID tags, vaccination records, familiar toy.'},
        {id:'k72-baby',       label:'👶 Infant/special needs supplies',         desc:'Formula, diapers, medications, comfort items for children or elderly family members.'},
        {id:'k72-rotate',     label:'🗓️ Rotation date labeled on kit',         desc:'Check and rotate water/food every 6–12 months. Record the date on the kit.'},
      ]
    }
  },

  // Get the active checklist definition
  get items() {
    const cl = this._getActiveChecklist();
    return cl ? cl.items : [];
  },

  _getActiveChecklist() {
    // Check built-in templates first
    if (this.TEMPLATES[this._activeId]) return this.TEMPLATES[this._activeId];
    // Check custom checklists
    const custom = Store.get('custom_checklists', []);
    return custom.find(c => c.id === this._activeId) || this.TEMPLATES['daily'];
  },

  _getAllChecklists() {
    const custom = Store.get('custom_checklists', []);
    return [...Object.values(this.TEMPLATES), ...custom];
  },

  _storeKey() {
    // Built-in checklists use date-keyed state (daily resets), custom use persistent state
    const cl = this._getActiveChecklist();
    if (!cl || cl.builtIn) return 'checklist_' + this._activeId + '_' + today();
    return 'checklist_custom_' + this._activeId;
  },

  // Prune checklist keys older than 7 days to prevent localStorage from filling up.
  _pruneOldKeys() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    Store.keys().forEach(k => {
      // Only prune the daily check (old format) and new date-keyed built-in checklist states
      const m = k.match(/^checklist_(daily|bugout|shelterinplace|evacuation|kit72)_(\d{4}-\d{2}-\d{2})$/);
      if (m && m[2] < cutoffStr) Store.del(k);
      // Also prune legacy plain date keys
      if (k.startsWith('checklist_') && k.length === 'checklist_YYYY-MM-DD'.length) {
        const dateStr = k.slice('checklist_'.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr < cutoffStr) Store.del(k);
      }
    });
  },

  // Update the progress line, all-clear banner, and browser tab title.
  _updateProgress(checked) {
    const el = document.getElementById('checklist-progress');
    const banner = document.getElementById('checklist-allclear');
    if (!el) return;
    const items = this._getActiveChecklist()?.items || [];
    const done = items.filter(i => checked[i.id]).length;
    const total = items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const allDone = done === total && total > 0;

    if (allDone) {
      el.innerHTML = `<span style="color:var(--green);font-weight:600">✅ ${done} / ${total} complete — 100%</span>`;
    } else {
      el.innerHTML = `<span style="color:${done > 0 ? 'var(--accent)' : 'var(--text-muted)'}">${done} / ${total} complete (${pct}%)</span>`;
    }

    if (banner) banner.style.display = allDone ? 'block' : 'none';

    // Tab title badge: show "(X/N)" when partially done, "✅ ARK" when all done
    const baseTitle = document.title.replace(/^\(.*?\)\s*|^✅\s*/, '');
    if (allDone) {
      document.title = '✅ ' + baseTitle;
    } else if (done > 0) {
      document.title = `(${done}/${total}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  },

  // Render date in header.
  _renderDate() {
    const el = document.getElementById('checklist-header-date');
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  },

  // Render the checklist type tabs
  _renderTabs() {
    const row = document.getElementById('checklist-tab-row');
    if (!row) return;
    const all = this._getAllChecklists();
    row.innerHTML = all.map(cl => `
      <button class="btn btn-sm ${this._activeId === cl.id ? 'btn-primary' : 'btn-ghost'}"
        onclick="Checklist.switchTo('${esc(cl.id)}')" style="font-size:12px">${esc(cl.label)}</button>
    `).join('') +
    `<button class="btn btn-ghost btn-sm" onclick="Checklist.newCustom()" style="font-size:12px" title="Create custom checklist">＋ Custom</button>`;
  },

  switchTo(id) {
    this._activeId = id;
    this._renderTabs();
    this.init(true); // skip tab re-render to avoid loop
  },

  init(skipTabs) {
    const container = document.getElementById('checklist-container');
    if (!container) return;
    this._pruneOldKeys();
    this._renderDate();
    if (!skipTabs) this._renderTabs();
    const cl = this._getActiveChecklist();
    const items = cl ? cl.items : [];
    const checked = Store.get(this._storeKey(), {});
    if (!items.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">No items — add some with + Custom.</div>';
      return;
    }
    container.innerHTML =
      '<div id="checklist-progress" class="font-sm" style="padding:6px 0 8px"></div>' +
      items.map(item => `
      <div class="checklist-item" onclick="Checklist.toggleRow('${esc(item.id)}')" role="button" tabindex="-1">
        <div class="check-box ${checked[item.id] ? 'checked' : ''}" id="check-${esc(item.id)}" role="checkbox" tabindex="0" aria-checked="${checked[item.id] ? 'true' : 'false'}" aria-labelledby="label-${esc(item.id)}" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();Checklist.toggleRow('${esc(item.id)}')}">
          ${checked[item.id] ? '✓' : ''}
        </div>
        <div class="check-label-wrap">
          <span class="check-label ${checked[item.id] ? 'checked-text' : ''}" id="label-${esc(item.id)}">${esc(item.label)}</span>
          ${item.desc ? `<span class="check-desc">${esc(item.desc)}</span>` : ''}
        </div>
      </div>
    `).join('') +
      '<div id="checklist-allclear" class="checklist-allclear" style="display:none">🏁 All items checked — stay safe and stay prepared.</div>';
    this._updateProgress(checked);
  },

  // Toggle by item id — called from both row click and checkbox click.
  toggleRow(id) {
    const key = this._storeKey();
    const checked = Store.get(key, {});
    checked[id] = !checked[id];
    Store.set(key, checked);

    const box = document.getElementById('check-' + id);
    if (box) {
      box.classList.toggle('checked', checked[id]);
      box.setAttribute('aria-checked', checked[id] ? 'true' : 'false');
      box.textContent = checked[id] ? '✓' : '';
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    }
    const label = document.getElementById('label-' + id);
    if (label) label.classList.toggle('checked-text', checked[id]);
    this._updateProgress(checked);
  },

  reset() {
    Store.del(this._storeKey());
    document.title = document.title.replace(/^\(.*?\)\s*|^✅\s*/, '');
    this.init(true);
  },

  printCurrent() {
    // Delegate to PrintARK with current checklist context
    PrintARK.checklist();
  },

  newCustom() {
    Modal.open(`
      <p style="margin:0 0 12px">Create a named checklist with custom items. Each item on a new line.</p>
      <label class="font-sm semibold">Checklist Name <span style="color:#cc0000">*</span></label>
      <input type="text" id="cl-name" maxlength="60" class="form-input w-full" placeholder="e.g. Vehicle Kit" style="margin:6px 0 2px">
      <div id="cl-name-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Items (one per line) <span style="color:#cc0000">*</span></label>
      <textarea id="cl-items" maxlength="2000" class="form-input w-full" rows="8" placeholder="Jumper cables&#10;Spare tire (inflated)&#10;First aid kit&#10;Flares or reflective triangles&#10;Blanket" style="margin:6px 0 8px"></textarea>
      <div id="cl-items-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="if(Checklist._doNewCustom())Modal.close();">Create</button>
      </div>
    `, '➕ New Custom Checklist');
  },

  _doNewCustom() {
    const nameEl = document.getElementById('cl-name');
    const nameErr = document.getElementById('cl-name-err');
    const itemsEl = document.getElementById('cl-items');
    const itemsErr = document.getElementById('cl-items-err');

    const name = (nameEl?.value || '').trim();
    if (!name) { if (nameErr) nameErr.textContent = 'Name is required.'; nameEl?.focus(); return false; }
    if (nameErr) nameErr.textContent = '';

    const lines = (itemsEl?.value || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { if (itemsErr) itemsErr.textContent = 'Add at least one item.'; itemsEl?.focus(); return false; }
    if (itemsErr) itemsErr.textContent = '';

    const id = 'custom_' + Date.now();
    const custom = Store.get('custom_checklists', []);
    custom.push({
      id,
      label: name,
      builtIn: false,
      items: lines.map((l, i) => ({id: id + '_' + i, label: l, desc: ''}))
    });
    Store.set('custom_checklists', custom);
    this._activeId = id;
    this.init();
    Toast.show('Checklist "' + name + '" created', 'success');
    return true;
  }
};

// === MISSING PERSONS ===
const MissingPersons = {
  _list: [],
  _STATUSES: ['Active Search', 'Located', 'Deceased'],

  init() {
    this._list = Store.get('missing_persons', []);
    this.render();
  },

  filterSearch() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.render(), 200);
  },

  _filtered() {
    const q = (document.getElementById('missing-search')?.value || '').trim().toLowerCase();
    if (!q) return this._list;
    return this._list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.lastSeen || '').toLowerCase().includes(q)
    );
  },

  render() {
    const container = document.getElementById('missing-persons-list');
    if (!container) return;

    // Count badge
    const badge = document.getElementById('missing-count-badge');
    if (badge) {
      const activeCount = this._list.filter(p => p.status === 'Active Search').length;
      if (activeCount) {
        badge.textContent = activeCount + ' active report' + (activeCount !== 1 ? 's' : '');
        badge.style.display = '';
      } else if (this._list.length) {
        badge.textContent = this._list.length + ' record' + (this._list.length !== 1 ? 's' : '');
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    // Search row visibility
    const searchRow = document.getElementById('missing-search-row');
    if (searchRow) searchRow.style.display = this._list.length > 1 ? '' : 'none';

    if (!this._list.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">No missing persons reports — tap Add to create a report.</div>';
      return;
    }

    const visible = this._filtered();
    if (!visible.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">No records match your search.</div>';
      return;
    }

    container.innerHTML = visible.map((p) => {
      const i = this._list.indexOf(p);
      const statusColor = p.status === 'Located' ? '#1a7a1a' : p.status === 'Deceased' ? '#555' : '#cc0000';
      const photoHtml = (p.photoUrl && (/^data:image\//i.test(p.photoUrl) || /^https:\/\//i.test(p.photoUrl)))
        ? `<img src="${esc(p.photoUrl)}" alt="Photo of ${esc(p.name||'')}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color,#ddd)">`
        : `<div style="width:48px;height:48px;border-radius:6px;border:2px dashed #aaa;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--surface-alt,#f5f5f5)">🔍</div>`;
      return `
      <div class="member-item" style="margin-bottom:8px;align-items:flex-start">
        <div style="flex-shrink:0">${photoHtml}</div>
        <div style="flex:1;min-width:0">
          <div class="font-sm bold">${esc(p.name||'Unknown')} <span style="color:${statusColor};font-size:11px;font-weight:600">${esc(p.status||'Active Search')}</span></div>
          <div class="member-role">Age: ${esc(String(p.age||'?'))} · Last seen: ${esc(p.lastSeen||'—')}${p.lastSeenTime ? ' at ' + esc(p.lastSeenTime) : ''}</div>
          <div class="font-xs text-secondary" style="margin-top:2px">${esc(p.description||'')}</div>
          ${p.contactInfo ? `<div class="font-xs text-secondary" style="margin-top:2px">Contact: ${esc(p.contactInfo)}</div>` : ''}
          <div class="font-xs text-muted" style="margin-top:2px">Reported: ${p.ts ? new Date(p.ts).toLocaleString() : '—'}</div>
        </div>
        <div class="flex gap-8" style="flex-direction:column;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="PrintARK.missingPerson('${esc(p.id||'')}')" title="Print flyer">🖨️ Flyer</button>
          <button class="btn btn-primary btn-sm" onclick="MissingPersons.broadcast(${i})" title="Broadcast to network">📡 Broadcast</button>
          <button class="btn btn-secondary btn-sm" onclick="MissingPersons.updateStatus('${esc(p.id||'')}')" title="Update status">✏️ Status</button>
          <button class="btn btn-ghost btn-sm" onclick="MissingPersons.remove(${i})" aria-label="Remove record">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  addForm() {
    Modal.open(`
      <p style="margin:0 0 12px">Record details to help locate this person. All data stays on this device.</p>
      <label class="font-sm semibold">Full Name <span style="color:#cc0000">*</span></label>
      <input type="text" id="mp-name" maxlength="80" class="form-input w-full" placeholder="e.g. James Okafor" style="margin:6px 0 2px">
      <div id="mp-name-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Age (0–120)</label>
      <input type="number" id="mp-age" min="0" max="120" class="form-input w-full" placeholder="e.g. 12" style="margin:6px 0 2px">
      <div id="mp-age-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Status</label>
      <select id="mp-status" class="form-input w-full" style="margin:6px 0 12px">
        <option value="Active Search">Active Search</option>
        <option value="Located">Located</option>
        <option value="Deceased">Deceased</option>
      </select>
      <label class="font-sm semibold">Description (clothing, hair, distinguishing features)</label>
      <textarea id="mp-description" maxlength="300" class="form-input w-full" placeholder="e.g. Blue jacket, red backpack, brown hair" style="margin:6px 0 12px;min-height:60px"></textarea>
      <label class="font-sm semibold">Last Seen Location <span style="color:#cc0000">*</span></label>
      <input type="text" id="mp-lastseen" maxlength="200" class="form-input w-full" placeholder="e.g. Main St near school" style="margin:6px 0 2px">
      <div id="mp-lastseen-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Last Seen Time (optional)</label>
      <input type="text" id="mp-lastseen-time" maxlength="50" class="form-input w-full" placeholder="e.g. 3:00 PM, this morning" style="margin:6px 0 12px">
      <label class="font-sm semibold">Contact Information (optional)</label>
      <input type="text" id="mp-contact" maxlength="150" class="form-input w-full" placeholder="e.g. Radio channel, meeting point" style="margin:6px 0 12px">
      <label class="font-sm semibold">Photo (optional)</label>
      <input type="file" id="mp-photo" accept="image/*" class="form-input w-full" style="margin:6px 0 8px" onchange="MissingPersons._previewPhoto()">
      <div id="mp-photo-preview" style="display:none;margin-bottom:12px;text-align:center">
        <img id="mp-photo-img" src="" alt="Photo preview" style="max-width:120px;max-height:120px;border-radius:6px;border:2px solid var(--border-color,#ddd)">
        <div class="font-xs text-muted" style="margin-top:4px">Photo preview</div>
      </div>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="if(MissingPersons._doAdd())Modal.close();">Report Missing</button>
      </div>
    `, '🔍 Report Missing Person');
  },

  _previewPhoto() {
    const input = document.getElementById('mp-photo');
    const preview = document.getElementById('mp-photo-preview');
    const img = document.getElementById('mp-photo-img');
    if (!input || !input.files || !input.files[0]) { if (preview) preview.style.display = 'none'; return; }
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      Toast.show('Please select a valid image file (JPEG, PNG, etc.)', 'error');
      input.value = '';
      if (preview) preview.style.display = 'none';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      if (img) img.src = e.target.result;
      if (preview) preview.style.display = '';
    };
    reader.readAsDataURL(file);
  },

  _doAdd() {
    let valid = true;
    const nameEl = document.getElementById('mp-name');
    const nameErr = document.getElementById('mp-name-err');
    const ageEl = document.getElementById('mp-age');
    const ageErr = document.getElementById('mp-age-err');
    const lastSeenEl = document.getElementById('mp-lastseen');
    const lastSeenErr = document.getElementById('mp-lastseen-err');

    const name = (nameEl?.value || '').trim();
    if (!name) {
      if (nameErr) nameErr.textContent = 'Name is required.';
      if (nameEl) nameEl.focus();
      valid = false;
    } else { if (nameErr) nameErr.textContent = ''; }

    const ageRaw = (ageEl?.value || '').trim();
    if (ageRaw !== '') {
      const ageNum = Number(ageRaw);
      if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120) {
        if (ageErr) ageErr.textContent = 'Age must be a whole number between 0 and 120.';
        valid = false;
      } else { if (ageErr) ageErr.textContent = ''; }
    } else { if (ageErr) ageErr.textContent = ''; }

    const lastSeen = (lastSeenEl?.value || '').trim();
    if (!lastSeen) {
      if (lastSeenErr) lastSeenErr.textContent = 'Last seen location is required.';
      if (!valid || name) lastSeenEl?.focus();
      valid = false;
    } else { if (lastSeenErr) lastSeenErr.textContent = ''; }

    if (!valid) return false;

    // Resolve photo — read from preview img src (already validated as data:image/ in _previewPhoto)
    let photoUrl = '';
    const previewImg = document.getElementById('mp-photo-img');
    if (previewImg && previewImg.src && /^data:image\//i.test(previewImg.src)) {
      photoUrl = previewImg.src;
    }

    const record = {
      id: generateID(),
      name,
      age: ageRaw,
      status: document.getElementById('mp-status')?.value || 'Active Search',
      description: (document.getElementById('mp-description')?.value || '').trim(),
      lastSeen,
      lastSeenTime: (document.getElementById('mp-lastseen-time')?.value || '').trim(),
      contactInfo: (document.getElementById('mp-contact')?.value || '').trim(),
      photoUrl,
      ts: new Date().toISOString()
    };
    this._list.push(record);
    Store.set('missing_persons', this._list);
    this.render();
    Toast.show('Missing person record saved', 'success');
    return true;
  },

  async broadcast(i) {
    const p = this._list[i];
    if (!p) return;
    const msg = {
      id: 'local_mp_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      alias: Store.get('last_alias', 'ARK User'),
      channel: 'missing',
      body: `🚨 MISSING PERSON ALERT: ${p.name||'Unknown'}, Age: ${p.age||'?'}, Last seen: ${p.lastSeen||'unknown location'}${p.lastSeenTime ? ' at ' + p.lastSeenTime : ''}. ${p.description ? 'Description: ' + p.description + '.' : ''} ${p.contactInfo ? 'Contact: ' + p.contactInfo + '.' : ''} Reported: ${p.ts ? new Date(p.ts).toLocaleString() : '—'}`.trim(),
      urgent: true,
      ts: new Date().toISOString()
    };
    // Save locally so the alert appears in the message board even when offline
    await DB.put('messages', msg);
    Hub.post(msg).then(sent => {
      Toast.show(sent ? 'Alert broadcast to network' : 'Queued — will send when hub is reachable', sent ? 'success' : 'warning', 3000);
    }).catch(() => {
      Toast.show('Queued — will send when hub is reachable', 'warning', 3000);
    });
    if (typeof Messages !== 'undefined') Messages.refresh();
  },

  remove(i) {
    const name = this._list[i] ? this._list[i].name : 'this record';
    Modal.confirm('Remove missing person record for ' + esc(name) + '?', () => {
      MissingPersons._list.splice(i, 1);
      Store.set('missing_persons', MissingPersons._list);
      MissingPersons.render();
    }, 'Remove', 'Keep');
  },

  updateStatus(id) {
    const p = this._list.find(x => x.id === id);
    if (!p) return;
    Modal.open(`
      <p style="margin:0 0 12px">Update status for <strong>${esc(p.name||'Unknown')}</strong>.</p>
      <label class="font-sm semibold">Status</label>
      <select id="mp-update-status" class="form-input w-full" style="margin:6px 0 16px">
        <option value="Active Search"${p.status === 'Active Search' ? ' selected' : ''}>Active Search</option>
        <option value="Located"${p.status === 'Located' ? ' selected' : ''}>Located — Person found</option>
        <option value="Deceased"${p.status === 'Deceased' ? ' selected' : ''}>Deceased</option>
      </select>
      <label class="font-sm semibold">Update Note (optional)</label>
      <input type="text" id="mp-update-note" maxlength="200" class="form-input w-full" placeholder="e.g. Found at community centre" style="margin:6px 0 16px">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="MissingPersons._doUpdateStatus('${esc(id)}');Modal.close();">Save Status</button>
      </div>
    `, '✏️ Update Status');
  },

  _doUpdateStatus(id) {
    const p = this._list.find(x => x.id === id);
    if (!p) return;
    const newStatus = document.getElementById('mp-update-status')?.value || p.status;
    const note = (document.getElementById('mp-update-note')?.value || '').trim();
    p.status = newStatus;
    if (note) p.updateNote = note;
    p.updatedTs = new Date().toISOString();
    Store.set('missing_persons', this._list);
    this.render();
    Toast.show('Status updated to: ' + newStatus, 'success');
  }
};

// === SETTINGS ===
const Settings = {
  load() {
    const hubEl = document.getElementById('set-hub-url'); if (hubEl) hubEl.value = Store.get('hub_url', '');
    const syncEl = document.getElementById('set-sync-interval'); if (syncEl) syncEl.value = Store.get('sync_interval', 60);
    const aliasEl = document.getElementById('set-alias'); if (aliasEl) aliasEl.value = Store.get('last_alias', '');
    const hhidEl = document.getElementById('set-hh-id'); if (hhidEl) hhidEl.value = Store.get('hh_id', generateID());
    const offlineEl = document.getElementById('set-offline-mode'); if (offlineEl) offlineEl.checked = Store.get('offline_mode', false);
    const hcEl = document.getElementById('set-high-contrast'); if (hcEl) hcEl.checked = Store.get('high_contrast', false);
    const devEl = document.getElementById('set-dev-mode'); if (devEl) devEl.checked = Store.get('dev_mode', false);
    const fontEl = document.getElementById('set-font-size'); if (fontEl) fontEl.value = Store.get('font_size', 16);
    const lpEl = document.getElementById('set-low-power');
    if (lpEl) lpEl.checked = Store.get('low_power', false);
    const dmEl = document.getElementById('set-dark-mode');
    if (dmEl) dmEl.checked = Store.get('dark_mode', false);
    const lsEl = document.getElementById('set-last-save');
    if (lsEl) lsEl.textContent = Store.lastSaveLabel();
    this.updateStorageInfo();
    this.checkBackupReminder();
    this._updateNotifBtn();
    this._showPWAInstallRow();
  },

  checkBackupReminder() {
    const lastExport = Store.get('last_export_ts', null);
    const banner = document.getElementById('backup-reminder');
    const daysEl = document.getElementById('backup-days-ago');
    const lxEl = document.getElementById('set-last-export');
    if (!banner) return;
    if (!lastExport) {
      banner.style.display = '';
      if (daysEl) daysEl.textContent = 'never';
      if (lxEl) lxEl.textContent = 'Last exported: never';
      return;
    }
    const days = Math.floor((Date.now() - lastExport) / 86400000);
    if (lxEl) lxEl.textContent = `Last exported: ${days === 0 ? 'today' : days + ' day' + (days!==1?'s':'') + ' ago'}`;
    if (days >= 7) {
      banner.style.display = '';
      if (daysEl) daysEl.textContent = `${days} days`;
    } else {
      banner.style.display = 'none';
    }
  },

  save() {
    const hubInputEl = document.getElementById('set-hub-url');
    const hubUrl = hubInputEl ? hubInputEl.value.trim() : '';
    Store.set('hub_url', hubUrl);
    if (hubUrl) SoftHub.yield_to_external(); // external hub configured — stop soft-hub
    // Sync hub URL to network panel (always, including when cleared)
    const netHubEl = document.getElementById('hub-url-input');
    if (netHubEl) netHubEl.value = hubUrl;
    const syncEl = document.getElementById('set-sync-interval');
    if (syncEl) Store.set('sync_interval', syncEl.value);
    const aliasEl = document.getElementById('set-alias');
    const aliasVal = aliasEl ? aliasEl.value.trim() : '';
    Store.set('last_alias', aliasVal);
    // Sync alias to message panel inputs
    document.querySelectorAll('#msg-alias').forEach(el => { if (aliasVal) el.value = aliasVal; });
    const hhidEl = document.getElementById('set-hh-id');
    if (hhidEl) Store.set('hh_id', hhidEl.value);
    const offlineEl = document.getElementById('set-offline-mode');
    if (offlineEl) Store.set('offline_mode', offlineEl.checked);
    const hcEl = document.getElementById('set-high-contrast');
    if (hcEl) Store.set('high_contrast', hcEl.checked);
    const devEl = document.getElementById('set-dev-mode');
    if (devEl) Store.set('dev_mode', devEl.checked);
    const fontEl = document.getElementById('set-font-size');
    if (fontEl) Store.set('font_size', fontEl.value);
    const lpEl = document.getElementById('set-low-power');
    if (lpEl) Store.set('low_power', lpEl.checked);
    const dmEl = document.getElementById('set-dark-mode');
    if (dmEl) Store.set('dark_mode', dmEl.checked);
    Hub.startAutoSync();
    this.applyFontSize();
    this.applyContrast();
    this.applyDarkMode();
    Toast.show('✅ Settings saved', 'success');
    Hub.updateSyncDisplay && Hub.updateSyncDisplay();
  },

  applyFontSize() {
    const fontEl = document.getElementById('set-font-size');
    const size = fontEl ? fontEl.value : 16;
    document.documentElement.style.fontSize = size + 'px';
  },

  toggleOffline() {
    const offEl = document.getElementById('set-offline-mode');
    if (offEl) Store.set('offline_mode', offEl.checked);
    UI.checkOnline();
  },

  toggleContrast() {
    const hcEl = document.getElementById('set-high-contrast');
    if (hcEl) Store.set('high_contrast', hcEl.checked);
    this.applyContrast();
  },

  applyContrast() {
    const hcEl = document.getElementById('set-high-contrast');
    const on = Store.get('high_contrast', false) || (hcEl ? hcEl.checked : false);
    document.documentElement.classList.toggle('high-contrast', on);
    if (on) {
      document.documentElement.style.setProperty('--text-primary', '#0a0806');
      document.documentElement.style.setProperty('--text-secondary', '#2a221a');
      document.documentElement.style.setProperty('--text-muted', '#5a4a38');
      document.documentElement.style.setProperty('--border', '#a89880');
      document.documentElement.style.setProperty('--border-strong', '#7a6855');
    } else {
      document.documentElement.style.removeProperty('--text-primary');
      document.documentElement.style.removeProperty('--text-secondary');
      document.documentElement.style.removeProperty('--text-muted');
      document.documentElement.style.removeProperty('--border');
      document.documentElement.style.removeProperty('--border-strong');
    }
  },

  regenHHID() {
    const id = generateID();
    document.getElementById('set-hh-id').value = id;
    Store.set('hh_id', id);
  },

  exportAll() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: Store.exportAll(),
    };
    DB.getAll('messages').then(msgs => {
      data.messages = msgs;
      download('ark-backup-' + new Date().toISOString().slice(0,10) + '.json', JSON.stringify(data, null, 2), 'application/json');
      Store.set('last_export_ts', Date.now());
      this.checkBackupReminder();
      Toast.show('📂 All ARK data saved to your downloads', 'success');
    }).catch(e => {
      console.error('Export failed', e);
      Toast.show('Export failed — please try again', 'error');
    });
  },

  // Returns an error string if `data` is not an ARK backup, otherwise null.
  _validateBackup(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 'File is not an ARK backup (not a JSON object)';
    const hasSettings = data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings);
    const hasMessages = Array.isArray(data.messages);
    if (!hasSettings && !hasMessages) return 'File is not an ARK backup (no settings or messages found)';
    if (data.settings !== undefined && !hasSettings) return 'Backup is damaged (settings section is invalid)';
    if (data.messages !== undefined && !hasMessages) return 'Backup is damaged (messages section is invalid)';
    // Must contain at least one recognisable ARK key, so random JSON files are rejected.
    const KNOWN = ['household','hh_id','hh_members','hub_url','sync_interval','last_alias','alert_level',
      'map_markers','medications','msg_queue','resources','font_size','high_contrast','dark_mode','offline_mode','low_power','dev_mode',
      'user_name','user_role','user_addr','missing_persons','custom_checklists'];
    const sKeys = hasSettings ? Object.keys(data.settings) : [];
    const looksLikeArk = sKeys.some(k => KNOWN.includes(k) || k.startsWith('checklist_')) ||
      (typeof data.version === 'string' && typeof data.exportedAt === 'string');
    if (!looksLikeArk) return 'File doesn\'t look like an ARK backup (no ARK data keys found)';
    if (sKeys.some(k => typeof k !== 'string' || k.length > 200)) return 'Backup is damaged (invalid key names)';
    if (hasMessages && data.messages.some(m => !m || typeof m !== 'object' || m.id === undefined || m.id === null))
      return 'Backup is damaged (a message is missing its id)';
    return null;
  },

  importAll() {
    document.getElementById('import-file').click();
  },

  handleImport(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = ''; // allow re-selecting the same file later
    file.text().then(txt => {
      let data;
      try { data = JSON.parse(txt); }
      catch(e) { Toast.show('That file isn\'t valid JSON — please choose an ARK backup file', 'error'); return; }
      const err = this._validateBackup(data);
      if (err) { Toast.show(err, 'error', 5000); return; }
      // Count what's in the backup so the confirmation is meaningful
      const msgCount = Array.isArray(data.messages) ? data.messages.length : 0;
      const settingsCount = data.settings ? Object.keys(data.settings).length : 0;
      const exportDate = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'unknown date';
      Modal.confirm(
        `<strong>Restore this backup?</strong><br><br>` +
        `This backup is from <strong>${exportDate}</strong> and contains <strong>${settingsCount} settings</strong> and <strong>${msgCount} message${msgCount !== 1 ? 's' : ''}</strong>.<br><br>` +
        `Your current settings will be overwritten. This cannot be undone.`,
        () => Settings._doImport(data),
        'Restore Backup', 'Cancel'
      );
    }).catch(e => {
      console.error('Import read failed', e);
      Toast.show('Could not read that file', 'error');
    });
  },

  async _doImport(data) {
    let failed = 0;
    if (data.settings) {
      const skipKeys = new Set(['last_gps','last_sync','msg_queue','hh_id']);
      Object.entries(data.settings).forEach(([k, v]) => {
        if (skipKeys.has(k)) return; // skip device-specific keys
        if (!Store.set(k, v)) failed++;
      });
    }
    if (data.messages) {
      for (const m of data.messages) {
        try { await DB.put('messages', m); } catch(e) { failed++; }
      }
    }
    if (failed) Toast.show('⚠️ Backup partly restored — ' + failed + ' item(s) could not be saved', 'error', 5000);
    else Toast.show('✅ Your backup was restored successfully', 'success');
    this.load();
  },

  clearCache() {
    Modal.confirm('Clear cached resource data? Your settings and messages will be kept — only downloaded resources are removed.', function() {
      DB.clear('resources');
      DB.clear('map_tiles');
      Toast.show('Temporary files cleared — your messages and settings are still safe', 'success');
    }, 'Clear Cache', 'Cancel');
  },

  clearAll() {
    Modal.open(`
      <p style="margin:0 0 8px;font-size:15px">⚠️ <strong>This will permanently delete everything</strong> — your household profile, all messages, map markers, settings, and cached data.</p>
      <p style="margin:0 0 16px;color:var(--text-secondary,#888)">This cannot be undone. Only do this if you want to start completely fresh.</p>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" style="background:var(--danger,#dc3545);border-color:var(--danger,#dc3545)" onclick="Modal.close();Settings._confirmWipeFinal()">Delete Everything</button>
      </div>
    `, '🗑️ Wipe All Data');
  },

  // Second confirmation step before the irreversible wipe — requires typing DELETE.
  _confirmWipeFinal() {
    Modal.open(`
      <p style="margin:0 0 8px;font-size:15px"><strong>Last chance.</strong> All ARK data on this device will be erased and cannot be recovered.</p>
      <p style="margin:0 0 12px;color:var(--text-secondary,#888)">Export a backup first if you might need it.</p>
      <p style="margin:0 0 8px;font-size:13px;font-weight:600">Type <span style="font-family:monospace;background:var(--bg-elevated,#eee);padding:1px 5px;border-radius:3px">DELETE</span> to confirm:</p>
      <input id="wipe-confirm-input" class="form-input" style="width:100%;margin-bottom:12px" placeholder="DELETE" autocomplete="off" spellcheck="false" oninput="document.getElementById('wipe-confirm-btn').disabled=this.value!=='DELETE'">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Keep my data</button>
        <button id="wipe-confirm-btn" class="btn btn-primary" disabled style="background:var(--danger,#dc3545);border-color:var(--danger,#dc3545)" onclick="Modal.close();Settings._doWipeAll()">Erase Everything</button>
      </div>
    `, '⚠️ Final Confirmation');
    setTimeout(() => document.getElementById('wipe-confirm-input')?.focus(), 100);
  },

  async _doWipeAll() {
    Store.clearAll(); // only ark_ keys; works in memory-fallback mode too
    await Promise.all([DB.clear('messages'), DB.clear('resources'), DB.clear('map_tiles')]); // finish before reload
    Toast.show('All ARK data has been erased', 'info');
    location.reload();
  },

  updateStorageInfo() {
    const el = document.getElementById('set-storage-info');
    if (!el) return;
    // localStorage usage
    let lsBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ark_')) {
          const v = localStorage.getItem(k);
          if (v) lsBytes += v.length * 2; // UTF-16 chars
        }
      }
    } catch(e) {}

    // Use Storage Quota API if available (shows real IndexedDB + all origins)
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(est => {
        const usedMB = (est.usage / 1048576).toFixed(1);
        const quotaMB = (est.quota / 1048576).toFixed(0);
        const pct = est.quota ? Math.round(est.usage / est.quota * 100) : 0;
        if (el) el.innerHTML = `Storage: <strong>${usedMB} MB</strong> of ~${quotaMB} MB (${pct}%) — localStorage: ~${Math.round(lsBytes / 1024)} KB`;
        // Show warning banner if > 80%
        const banner = document.getElementById('storage-warning-banner');
        if (banner) banner.classList.toggle('hidden', pct < 80);
      }).catch(() => {
        if (el) el.textContent = `localStorage: ~${Math.round(lsBytes / 1024)} KB used`;
      });
    } else {
      el.textContent = `localStorage: ~${Math.round(lsBytes / 1024)} KB used`;
    }
  },

  toggleLowPower() {
    const on = document.getElementById('set-low-power').checked;
    Store.set('low_power', on);
    document.documentElement.classList.toggle('low-power', on);
    // Apply reduced polling
    Hub.startAutoSync();
    Toast.show(on ? '🔋 Low-power mode on — sync slowed to 5 min' : 'Low-power mode off', 'info');
  },

  rerunWizard() {
    // Hide settings tab and show onboarding overlay
    Onboarding.start();
  },

  toggleDarkMode() {
    const on = document.getElementById('set-dark-mode').checked;
    Store.set('dark_mode', on);
    document.documentElement.classList.toggle('dark-mode', on);
    Toast.show(on ? '🌙 Dark mode on' : '☀️ Dark mode off', 'info');
  },

  applyDarkMode() {
    const on = Store.get('dark_mode', false);
    document.documentElement.classList.toggle('dark-mode', on);
    const el = document.getElementById('set-dark-mode');
    if (el) el.checked = on;
  },

  requestNotifications() {
    if (!('Notification' in window)) {
      Toast.show('Notifications are not supported in this browser', 'error');
      return;
    }
    if (Notification.permission === 'granted') {
      Toast.show('Notifications are already enabled', 'success');
      this._updateNotifBtn();
      return;
    }
    if (Notification.permission === 'denied') {
      Toast.show('Notifications are blocked — allow them in your browser settings', 'error');
      return;
    }
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') Toast.show('✅ Notifications enabled', 'success');
      else Toast.show('Notifications were not enabled', 'info');
      this._updateNotifBtn();
    });
  },

  _updateNotifBtn() {
    const btn = document.getElementById('set-notif-btn');
    if (!btn || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      btn.textContent = '✅ Enabled';
      btn.disabled = true;
    } else if (Notification.permission === 'denied') {
      btn.textContent = '🚫 Blocked';
      btn.disabled = true;
    } else {
      btn.textContent = 'Enable';
      btn.disabled = false;
    }
  },

  _showPWAInstallRow() {
    // Show the install row if the browser has an install prompt available
    const row = document.getElementById('pwa-install-row');
    if (row) row.style.display = (typeof _deferredInstall !== 'undefined' && _deferredInstall) ? '' : 'none';
  }
};

// === GPS AUTO-FILL ===
const GPS = {
  fillLocation(inputId, btn) {
    if (!navigator.geolocation) {
      Toast.show('GPS not available on this device', 'error');
      return;
    }
    const orig = btn ? btn.textContent : '';
    if (btn) { btn.textContent = '📍…'; btn.disabled = true; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(5);
        const lon = pos.coords.longitude.toFixed(5);
        const acc = Math.round(pos.coords.accuracy);
        const val = `${lat}, ${lon} (±${acc}m)`;
        const inp = document.getElementById(inputId);
        if (inp) { inp.value = val; inp.dispatchEvent(new Event('input')); }
        // Update status bar GPS dot
        const dot = document.getElementById('gps-dot');
        const st = document.getElementById('gps-status');
        if (dot) dot.className = 'status-dot dot-green';
        if (st) st.textContent = `GPS ±${acc}m`;
        if (btn) { btn.textContent = '✅'; btn.disabled = false; setTimeout(() => { btn.textContent = orig; }, 2000); }
        Toast.show(`📍 Location filled (±${acc}m accuracy)`, 'success');
      },
      err => {
        const msgs = { 1: 'Location access denied — allow in browser settings', 2: 'Position unavailable', 3: 'Location request timed out' };
        Toast.show(msgs[err.code] || 'GPS error', 'error');
        if (btn) { btn.textContent = orig; btn.disabled = false; }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }
};

// === MESSAGE ACKNOWLEDGE ===
const MsgAck = {
  _KEY: 'msg_acks',
  _data() { return Store.get(this._KEY, {}); },
  isAcked(id) { if (!id) return false; return !!this._data()[id]; },
  getCount(id) { if (!id) return 0; return this._data()[id] || 0; },
  toggle(id) {
    if (!id) return;
    const d = this._data();
    if (d[id]) {
      delete d[id];
    } else {
      d[id] = (d[id] || 0) + 1;
    }
    Store.set(this._KEY, d);
  },
  clear() { Store.set(this._KEY, {}); }
};

// === PERSONAL FREQUENCY LOGBOOK ===
const FreqLog = {
  _KEY: 'freq_log',
  _data() { return Store.get(this._KEY, []); },
  _fmtDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    } catch(_) { return iso.slice(0, 10); }
  },
  render() {
    const entries = this._data();
    const tbl = document.getElementById('freq-log-table');
    const empty = document.getElementById('freq-log-empty');
    const body = document.getElementById('freq-log-body');
    if (!body) return;
    if (!entries.length) {
      if (tbl) tbl.style.display = 'none';
      if (empty) empty.style.display = '';
      return;
    }
    if (tbl) tbl.style.display = '';
    if (empty) empty.style.display = 'none';
    body.innerHTML = entries.map((e, i) => `
      <tr>
        <td class="bold">${esc(e.name)}</td>
        <td class="monospace text-accent freq-copyable" onclick="Radio.copyFreq('${esc(e.freq)}',this)" title="Tap to copy">${esc(e.freq)}<span class="copy-hint">📋</span></td>
        <td class="font-xs text-muted">${esc(e.notes || '')}</td>
        <td class="font-xs text-muted" style="white-space:nowrap">${esc(this._fmtDate(e.ts || ''))}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-xs" onclick="FreqLog.openEdit(${i})" title="Edit" aria-label="Edit ${esc(e.name)}">✏️</button>
          <button class="btn btn-ghost btn-xs" onclick="FreqLog.remove(${i})" title="Delete" aria-label="Delete ${esc(e.name)}">🗑️</button>
        </td>
      </tr>`).join('');
  },
  openAdd() {
    document.getElementById('freq-log-edit-idx').value = '-1';
    document.getElementById('freq-log-form-title').textContent = 'Add Channel';
    document.getElementById('freq-log-name').value = '';
    document.getElementById('freq-log-freq').value = '';
    document.getElementById('freq-log-notes').value = '';
    const tsNote = document.getElementById('freq-log-ts-note');
    if (tsNote) tsNote.style.display = '';
    document.getElementById('freq-log-form').style.display = '';
    document.getElementById('freq-log-name').focus();
  },
  openEdit(i) {
    const entries = this._data();
    const e = entries[i];
    if (!e) return;
    document.getElementById('freq-log-edit-idx').value = i;
    document.getElementById('freq-log-form-title').textContent = 'Edit Channel';
    document.getElementById('freq-log-name').value = e.name;
    document.getElementById('freq-log-freq').value = e.freq;
    document.getElementById('freq-log-notes').value = e.notes || '';
    const tsNote = document.getElementById('freq-log-ts-note');
    if (tsNote) { tsNote.textContent = e.ts ? 'Added: ' + this._fmtDate(e.ts) : 'Timestamp auto-set on save'; tsNote.style.display = ''; }
    document.getElementById('freq-log-form').style.display = '';
    document.getElementById('freq-log-name').focus();
  },
  cancelForm() {
    document.getElementById('freq-log-form').style.display = 'none';
  },
  save() {
    const name = document.getElementById('freq-log-name').value.trim();
    const freq = document.getElementById('freq-log-freq').value.trim();
    const notes = document.getElementById('freq-log-notes').value.trim();
    if (!name || !freq) { Toast.show('Name and frequency are required', 'error'); return; }
    const entries = this._data();
    const idx = parseInt(document.getElementById('freq-log-edit-idx').value, 10);
    const ts = idx >= 0 ? (entries[idx].ts || new Date().toISOString()) : new Date().toISOString();
    if (idx >= 0) { entries[idx] = { name, freq, notes, ts }; }
    else { entries.push({ name, freq, notes, ts }); }
    Store.set(this._KEY, entries);
    this.cancelForm();
    this.render();
    Toast.show('📒 Channel saved', 'success');
  },
  remove(i) {
    Modal.confirm('Remove this channel from your logbook?', () => {
      const entries = this._data();
      entries.splice(i, 1);
      Store.set(this._KEY, entries);
      this.render();
      Toast.show('Channel removed', 'info');
    }, 'Remove', 'Keep');
  },
  exportJSON() {
    const logs = this._data();
    if (!logs.length) { Toast.show('No frequency log entries to export', 'warning'); return; }
    const blob = new Blob([JSON.stringify(logs, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ARK-FreqLog-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    Toast.show('Frequency log exported', 'success');
  },
  exportCSV() {
    const logs = this._data();
    if (!logs.length) { Toast.show('No frequency log entries to export', 'warning'); return; }
    const header = 'Name,Frequency,Notes,Timestamp\n';
    const rows = logs.map(e => `"${(e.name||'').replace(/"/g,'""')}","${(e.freq||'').replace(/"/g,'""')}","${(e.notes||'').replace(/"/g,'""')}","${(e.ts||'').replace(/"/g,'""')}"`).join('\n');
    const blob = new Blob([header + rows], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ARK-FreqLog-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    Toast.show('Frequency log exported as CSV', 'success');
  }
};

// === HOME MESSAGE STATS ===
const HomeStats = {
  CHANNEL_LABELS: {help:'🆘 Help',safe:'✅ Safe',offers:'🤝 Offers',missing:'🔍 Missing',reunification:'👨‍👩‍👧 Reunif.',general:'💬 General',resources:'📦 Resources',medical:'🏥 Medical',water:'💧 Water',power:'⚡ Power',shelter:'🏠 Shelter'},
  render() {
    const el = document.getElementById('msg-stats-content');
    if (!el) return;
    DB.getAll('messages').then(msgs => {
      // Always keep hero badge in sync regardless of message count
      const heroMsgs = document.getElementById('hero-msgs-badge');
      const total = msgs ? msgs.length : 0;
      if (heroMsgs) heroMsgs.textContent = total + ' Message' + (total !== 1 ? 's' : '');

      if (!msgs || !msgs.length) {
        el.innerHTML = '<div class="font-xs text-muted" style="padding:4px 0">No messages yet. <button class="btn btn-ghost btn-xs" onclick="UI.switchTab(\'messages\')">Post first message →</button></div>';
        return;
      }
      // Count by channel; find urgents
      const counts = {};
      let urgent = 0;
      msgs.forEach(m => {
        const ch = m.channel || 'general';
        counts[ch] = (counts[ch] || 0) + 1;
        if (m.urgent) urgent++;
      });
      // Render chips
      let html = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">`;
      html += `<span style="font-size:12px;color:var(--text-secondary);margin-right:4px"><strong>${total}</strong> message${total!==1?'s':''}</span>`;
      if (urgent) html += `<span style="background:rgba(220,60,60,0.15);color:var(--red);padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">🚨 ${urgent} urgent</span>`;
      // Top channels (max 4)
      const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4);
      sorted.forEach(([ch, n]) => {
        const lbl = this.CHANNEL_LABELS[ch] || ch;
        html += `<button class="btn btn-ghost btn-xs" onclick="UI.switchTab('messages');Messages.setChannel('${ch}')" style="font-size:11px;padding:2px 8px">${lbl} <strong>${n}</strong></button>`;
      });
      html += `</div>`;
      el.innerHTML = html;
    }).catch(() => {
      el.innerHTML = '<div class="font-xs text-muted">Could not load stats.</div>';
    });
  }
};

// === HEIMLICH (choking) ===
const Heimlich = {
  show(mode) {
    ['adult','infant','self'].forEach(m => {
      const el = document.getElementById('heimlich-' + m);
      if (el) el.style.display = m === mode ? '' : 'none';
      const btn = document.getElementById('heimlich-' + m + '-btn');
      if (!btn) return;
      if (m === mode) { btn.style.background = 'var(--accent)'; btn.style.color = '#000'; btn.style.fontWeight = '700'; btn.className = 'btn btn-sm'; }
      else { btn.style.background = ''; btn.style.color = ''; btn.style.fontWeight = ''; btn.className = 'btn btn-secondary btn-sm'; }
    });
  }
};

// === UTILITIES ===
// Lightweight debounce: returns a function that delays invoking fn until after `wait` ms of quiet.
function debounce(fn, wait) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function generateID() {
  return 'ARK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function download(name, content, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// === CHANNEL TABS INIT ===
document.querySelectorAll('.ch-tab').forEach(tab => {
  tab.addEventListener('click', () => Messages.setChannel(tab.dataset.ch));
});

// === NAV HOTKEYS ===
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  // Don't fire tab hotkeys when a modal/dialog is open (focus is trapped there).
  // ARK uses a CSS .hidden class (not the HTML hidden attribute) on the outer overlay.
  const arkModal = document.getElementById('ark-modal');
  const shareModal = document.getElementById('share-modal');
  const modalOpen = (arkModal && !arkModal.classList.contains('hidden')) ||
                    (shareModal && !shareModal.classList.contains('hidden'));
  if (modalOpen) return;
  const tabs = ['home','messages','survival','resources','household','network','medical','map','radio','ai','settings'];
  const n = parseInt(e.key);
  // Keys 1–9 → tabs[0]–tabs[8]; key 0 → tabs[9] (AI); settings (tabs[10]) has no single-digit hotkey.
  if (n >= 1 && n <= 9) UI.switchTab(tabs[n - 1]);
  else if (n === 0) UI.switchTab(tabs[9]);
});

// === BATTERY API ===
if ('getBattery' in navigator) {
  navigator.getBattery().then(batt => {
    const update = () => {
      const pct = Math.round(batt.level * 100);
      const ch = batt.charging;
      const item = document.getElementById('batt-item');
      const icon = document.getElementById('batt-icon');
      const level = document.getElementById('batt-level');
      if (item) item.style.display = 'flex';
      if (icon) icon.textContent = ch ? '🔌' : pct < 20 ? '🪫' : '🔋';
      if (level) level.textContent = pct + '%';
    };
    update();
    batt.addEventListener('levelchange', update);
    batt.addEventListener('chargingchange', update);
  }).catch(() => {});
}

// === SERVICE WORKER (embedded) ===
const SW_SCRIPT = `
// Bump this version on every significant update; activate deletes all other caches.
const CACHE = 'ark-v2';
self.addEventListener('install', e => {
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
function cacheIfOk(cache, req, r) {
  if (r && r.ok && (r.type === 'basic' || r.type === 'cors')) cache.put(req, r.clone());
  return r;
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return; // never cache POST/PUT (hub writes)
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    // Hub API: network only, JSON error when offline
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({error:'offline'}), {status:503, headers:{'content-type':'application/json'}})
      )
    );
  } else if (e.request.mode === 'navigate') {
    // The app itself (single HTML file): network first so updates land, cache as offline fallback
    e.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(e.request).then(r => cacheIfOk(cache, e.request, r))
          .catch(() => cache.match(e.request).then(hit => hit || Response.error()))
      )
    );
  } else {
    // Static assets (fonts etc.): cache first
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(r => cacheIfOk(cache, e.request, r))
            .catch(() => Response.error())
        )
      )
    );
  }
});
`;

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  // Try real same-origin file first (works when served over http/https from a web server)
  navigator.serviceWorker.register('/service-worker.js', {scope: '/'})
    .then(() => { console.info('ARK SW registered via /service-worker.js'); })
    .catch(() => {
      // Fallback: blob URL (works for local file:// open but browser security
      // prevents it from actually intercepting fetches — offline cache won't
      // activate, but the app still runs fully from its own HTML).
      try {
        const blob = new Blob([SW_SCRIPT], {type: 'application/javascript'});
        const url = URL.createObjectURL(blob);
        navigator.serviceWorker.register(url, {scope: '/'})
          .then(() => console.warn('ARK SW registered via blob URL — offline caching will NOT work (blob SWs cannot intercept fetches). Serve the file over HTTP for full offline support.'))
          .catch(e => console.warn('SW registration skipped:', e.message));
      } catch(e) {
        console.warn('SW not available:', e.message);
      }
    });
}

// === BOOT ===
/* ============================================================
   ONBOARDING WIZARD
   ============================================================ */
const Onboarding = (() => {
  let currentStep = 1;
  const TOTAL = 5;

  function updateDots(step) {
    for (let i = 1; i <= TOTAL; i++) {
      const dot = document.getElementById('ob-d' + i);
      if (!dot) continue;
      dot.className = 'ob-dot' + (i < step ? ' done' : i === step ? ' active' : '');
    }
  }

  function showStep(n) {
    for (let i = 1; i <= TOTAL; i++) {
      const el = document.getElementById('ob-step-' + i);
      if (el) el.classList.toggle('active', i === n);
    }
    updateDots(n);
    currentStep = n;
  }

  function start() {
    try {
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) {
        overlay.classList.remove('hidden');
        showStep(1);
        // Clear any stale validation state
        const nameInput = document.getElementById('ob-name');
        if (nameInput) { nameInput.style.borderColor = ''; }
        const errEl = document.getElementById('ob-name-err');
        if (errEl) errEl.style.display = 'none';
        // Pre-fill from saved data (pre-fill all fields; saveIdentity always writes current values so blank re-entry will clear)
        const savedName = Store.get('user_name', '');
        const savedRole = Store.get('user_role', '');
        const savedAddr = Store.get('user_addr', '');
        const savedHub  = Store.get('hub_url', '');
        const nameEl = document.getElementById('ob-name'); if (nameEl) nameEl.value = savedName;
        const roleEl = document.getElementById('ob-role'); if (roleEl) roleEl.value = savedRole;
        const addrEl = document.getElementById('ob-addr'); if (addrEl) addrEl.value = savedAddr;
        const hubEl  = document.getElementById('ob-hub');  if (hubEl)  hubEl.value  = savedHub;
      }
    } catch (e) { console.warn('Onboarding.start error:', e); }
  }

  function next() {
    if (currentStep < TOTAL) showStep(currentStep + 1);
  }

  function back() {
    if (currentStep > 1) showStep(currentStep - 1);
  }

  function saveIdentity() {
    try {
      const name = (document.getElementById('ob-name')?.value || '').trim();
      if (!name) {
        const nameInput = document.getElementById('ob-name');
        if (nameInput) {
          nameInput.style.borderColor = 'var(--red)';
          nameInput.focus();
        }
        const errEl = document.getElementById('ob-name-err');
        if (errEl) errEl.style.display = '';
        return;
      }
      // Clear error state
      const nameInputClear = document.getElementById('ob-name');
      if (nameInputClear) nameInputClear.style.borderColor = '';
      const errEl = document.getElementById('ob-name-err');
      if (errEl) errEl.style.display = 'none';
      const role = document.getElementById('ob-role')?.value || '';
      const addr = (document.getElementById('ob-addr')?.value || '').trim();
      Store.set('user_name', name);
      // Sync to alias fields
      document.querySelectorAll('#msg-alias').forEach(el => { if (!el.value) el.value = name; });
      Store.set('last_alias', name);
      // Always write role/addr so a blank re-entry clears the previously saved value
      Store.set('user_role', role);
      Store.set('user_addr', addr);
      // Update household name in settings
      const hhNameInput = document.getElementById('hh-name');
      if (hhNameInput && name) hhNameInput.value = name;
    } catch (e) { console.warn('Onboarding.saveIdentity error:', e); }
    next();
  }

  function saveHub() {
    try {
      let url = (document.getElementById('ob-hub')?.value || '').trim();
      if (!url) { next(); return; } // Hub is optional — skip if empty
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;
      // Basic validation — must look like an IP or hostname with optional port
      const urlPattern = /^https?:\/\/([\d.]+|localhost|[\w.-]+)(:\d+)?(\/.*)?$/;
      if (!urlPattern.test(url)) {
        Toast.show('Hub URL should be like: http://192.168.1.100:3000', 'warning');
        const hubInput = document.getElementById('ob-hub');
        if (hubInput) { hubInput.style.borderColor = 'var(--red)'; hubInput.focus(); }
        return;
      }
      const hubInput = document.getElementById('ob-hub');
      if (hubInput) hubInput.style.borderColor = '';
      Store.set('hub_url', url);
      // Sync to both hub input fields and the display label
      const settingsHubInput = document.getElementById('set-hub-url');
      if (settingsHubInput) settingsHubInput.value = url;
      const networkHubInput = document.getElementById('hub-url-input');
      if (networkHubInput) networkHubInput.value = url;
      Hub.updateSyncDisplay();
    } catch (e) { console.warn('Onboarding.saveHub error:', e); }
    next();
  }

  function downloadARK() {
    try {
      // Strip first_run_done so the recipient gets the setup wizard on first open
      const html = _freshDownloadHTML();
      download('ARK-CRISIS-SUITE.html', html, 'text/html');
      Toast.show('ARK downloaded — when they open it they\'ll get the setup wizard!', 'success', 3500);
    } catch (e) {
      Toast.show('Download failed — try again', 'error', 3000);
      console.warn('Onboarding.downloadARK error:', e);
    }
  }

  let _finishing = false; // re-entry guard for double-tap
  function finish() {
    if (_finishing) return;
    _finishing = true;
    try {
      Store.set('first_run_done', true);
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) overlay.classList.add('hidden');
      Toast.show('Welcome to ARK — you\'re the first line of safety.', 'success', 4000);

      // Auto-discovery: start finding nearby ARK users on this network
      setTimeout(() => {
        if (typeof SoftHub !== 'undefined') SoftHub.startDiscovery();
        // Show a "share ARK" nudge after welcome toast fully exits (toast is 4s, exit anim ~300ms)
        setTimeout(_showShareNudge, 5000);
      }, 1000);
    } catch (e) {
      console.warn('Onboarding.finish error:', e);
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) overlay.style.display = 'none';
      Store.set('first_run_done', true);
    }
  }

  function _showShareNudge() {
    // Soft nudge to share ARK with the people around them
    const nudgeId = 'ark-share-nudge';
    if (document.getElementById(nudgeId)) return;

    const nudge = document.createElement('div');
    nudge.id = nudgeId;
    nudge.style.cssText = [
      'position:fixed','bottom:calc(80px + env(safe-area-inset-bottom,0px))','left:50%','transform:translateX(-50%)',
      'z-index:9998','max-width:min(400px,calc(100vw - 32px))','width:100%',
      'background:linear-gradient(135deg,rgba(139,111,62,.18) 0%,rgba(240,235,224,.97) 100%)',
      'border:1.5px solid rgba(139,111,62,.35)','border-radius:20px',
      'padding:16px 20px','box-shadow:0 8px 32px rgba(139,111,62,.18)',
      'display:flex','align-items:center','gap:14px',
      'animation:slideUpBanner .35s cubic-bezier(.34,1.56,.64,1) both'
    ].join(';');

    nudge.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:700;color:var(--accent,#8b6f3e);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px">🤝 Get Your People In</div>
        <div style="font-size:.82rem;color:var(--text-secondary,#555);line-height:1.35;margin-bottom:10px">ARK works best when everyone nearby has it. Send them the link now.</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button onclick="ShareARK.shareViaSMS();document.getElementById('${nudgeId}')?.remove()"
            style="background:var(--accent,#8b6f3e);color:#fff;border:none;border-radius:10px;padding:7px 13px;font-size:.78rem;font-weight:700;cursor:pointer">
            💬 SMS
          </button>
          <button onclick="ShareARK.shareViaEmail();document.getElementById('${nudgeId}')?.remove()"
            style="background:var(--accent,#8b6f3e);color:#fff;border:none;border-radius:10px;padding:7px 13px;font-size:.78rem;font-weight:700;cursor:pointer">
            ✉️ Email
          </button>
          <button onclick="ShareARK.openModal();document.getElementById('${nudgeId}')?.remove()"
            style="background:transparent;color:var(--accent,#8b6f3e);border:1.5px solid rgba(139,111,62,.35);border-radius:10px;padding:7px 13px;font-size:.78rem;font-weight:600;cursor:pointer">
            More →
          </button>
          <button onclick="document.getElementById('${nudgeId}')?.remove()"
            style="background:transparent;color:var(--text-muted,#aaa);border:none;font-size:.75rem;cursor:pointer;padding:2px 4px;margin-left:auto;align-self:center">
            ✕
          </button>
        </div>
      </div>`;

    document.body.appendChild(nudge);
    setTimeout(() => { nudge.remove(); }, 20000);
  }

  return { start, next, back, saveIdentity, saveHub, downloadARK, finish };
})();

/* ============================================================
   DOWNLOAD HELPER — strips first_run_done so recipient gets wizard
   ============================================================ */
function _freshDownloadHTML() {
  // Clone the full page HTML, then remove ark_first_run_done from any
  // inline Store snapshot so the file is "factory fresh" for the recipient.
  // The live page's localStorage is NOT modified.
  let html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  // Remove the first_run_done key from any embedded JSON store init block
  // (the app stores it in localStorage at runtime, not embedded, so the
  // downloaded file simply has no first_run_done in localStorage → wizard fires)
  return html;
}

/* ============================================================
   SHARE ARK
   ============================================================ */
const ShareARK = (() => {

  function openModal() {
    try {
      const modal = document.getElementById('share-modal');
      if (modal) {
        if (modal.classList.contains('hidden')) ShareARK._prevFocus = document.activeElement;
        modal.classList.remove('hidden');
        if (!modal._a11yBound) {
          modal.addEventListener('keydown', e => {
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
            if (e.key !== 'Tab') return;
            const items = Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex]:not([tabindex="-1"])'))
              .filter(el => el.offsetParent !== null);
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          });
          modal._a11yBound = true;
        }
        setTimeout(() => {
          const first = modal.querySelector('button,input,select,textarea,[tabindex]');
          if (first) first.focus();
        }, 50);
      }
    } catch (e) { console.warn('ShareARK.openModal error:', e); }
  }

  function closeModal() {
    try {
      const modal = document.getElementById('share-modal');
      if (modal) modal.classList.add('hidden');
      const prev = ShareARK._prevFocus;
      ShareARK._prevFocus = null;
      if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus();
    } catch (e) { console.warn('ShareARK.closeModal error:', e); }
  }

  function downloadFile() {
    try {
      const html = _freshDownloadHTML();
      download('ARK-CRISIS-SUITE.html', html, 'text/html');
      Toast.show('ARK downloaded — recipient gets the setup wizard on first open!', 'success', 4000);
    } catch (e) {
      Toast.show('Download failed — try saving this page manually (Ctrl+S / ⌘+S)', 'error', 4000);
      console.warn('ShareARK.downloadFile error:', e);
    }
  }

  function copyTemplate() {
    try {
      const text = `I'm sending you ARK Crisis Suite — a free offline emergency communication app. Open the HTML file in any browser — no install needed. Works without internet. Use it to coordinate with neighbors during emergencies.`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => Toast.show('Message copied to clipboard!', 'success', 2500));
      } else {
        // Fallback: select the element text
        const el = document.getElementById('share-template-text');
        if (el) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        Toast.show('Text selected — press Ctrl+C / ⌘+C to copy', 'info', 3000);
      }
    } catch (e) {
      Toast.show('Could not copy — select the text manually', 'error', 3000);
      console.warn('ShareARK.copyTemplate error:', e);
    }
  }

  function generateQR() {
    const btn = document.querySelector('button[onclick*="ShareARK.generateQR("]');
    if (btn && btn.dataset.loading === '1') return;
    BtnLoading.start(btn, '⏳ Generating…');
    // Yield a frame so the loading label paints before the synchronous QR encode runs
    setTimeout(() => { try { renderQR(); } finally { BtnLoading.stop(btn); } }, 30);
  }

  function renderQR() {
    try {
      const hubUrl = Store.get('hub_url', '');
      const statusEl = document.getElementById('share-qr-status');
      const canvas = document.getElementById('share-qr-canvas');
      if (!hubUrl) {
        if (statusEl) statusEl.textContent = 'No hub connected. Set a hub URL in Settings to generate a QR code for local distribution.';
        return;
      }
      const qrUrl = hubUrl.replace(/\/$/, '') + '/ARK-CRISIS-SUITE.html';
      // Real SVG QR code
      if (canvas) {
        // Replace canvas with SVG container
        canvas.style.display = 'none';
        let svgContainer = document.getElementById('share-qr-svg');
        if (!svgContainer) {
          svgContainer = document.createElement('div');
          svgContainer.id = 'share-qr-svg';
          svgContainer.style.cssText = 'text-align:center;margin-bottom:8px';
          canvas.parentNode.insertBefore(svgContainer, canvas);
        }
        svgContainer.innerHTML = Network.makeQRSVG ? Network.makeQRSVG(qrUrl) : ARKQr.toSVGDiv(qrUrl, 5);
      }
      if (statusEl) statusEl.innerHTML = '📶 Hub URL: <code>' + esc(qrUrl) + '</code><br>Scan the QR code above to download ARK on another device.';
    } catch (e) {
      const statusEl = document.getElementById('share-qr-status');
      if (statusEl) statusEl.textContent = 'QR generation failed. Share the hub URL manually from Settings.';
      console.warn('ShareARK.generateQR error:', e);
    }
  }

  const ARK_DOWNLOAD_URL = 'https://ark.halosuite.ai/ARK-CRISIS-SUITE.html';
  const ARK_SHORT_MSG = 'I\'m sharing ARK Crisis Suite with you — a free offline emergency app that works without internet. Download it here: ' + ARK_DOWNLOAD_URL;
  const ARK_EMAIL_SUBJECT = 'ARK Crisis Suite — Free Offline Emergency App';
  const ARK_EMAIL_BODY = `Hi,\n\nI wanted to share ARK Crisis Suite with you — it's a free emergency communication app that works completely offline. No install needed — just open the HTML file in any browser.\n\nDownload it here: ${ARK_DOWNLOAD_URL}\n\nIt's useful for coordinating with neighbours and family during power outages, natural disasters, or any emergency where the internet is down.\n\nStay safe.`;

  function shareViaSMS() {
    try {
      // sms: URI — works on iOS and Android; body param prefilled
      const url = 'sms:?body=' + encodeURIComponent(ARK_SHORT_MSG);
      window.open(url, '_self');
      Toast.show('Opening Messages…', 'info', 2000);
    } catch (e) {
      // Fallback: copy the message
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(ARK_SHORT_MSG).then(() =>
          Toast.show('Message copied — paste it into your SMS app', 'success', 3500)
        );
      }
    }
  }

  function shareViaEmail() {
    try {
      const url = 'mailto:?subject=' + encodeURIComponent(ARK_EMAIL_SUBJECT)
        + '&body=' + encodeURIComponent(ARK_EMAIL_BODY);
      window.open(url, '_self');
      Toast.show('Opening email…', 'info', 2000);
    } catch (e) {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(ARK_SHORT_MSG).then(() =>
          Toast.show('Message copied — paste it into your email', 'success', 3500)
        );
      }
    }
  }

  function shareViaFacebook() {
    try {
      const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(ARK_DOWNLOAD_URL)
        + '&quote=' + encodeURIComponent('ARK Crisis Suite — a free offline emergency app. No install. Works without internet.');
      window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
    } catch (e) {
      Toast.show('Could not open Facebook — try sharing the link manually', 'error', 3000);
    }
  }

  function shareViaInstagram() {
    // Instagram has no web share URI. Best we can do: copy the message, then open Instagram.
    try {
      const msg = '🆘 ARK Crisis Suite — free offline emergency app. No install needed. Download: ' + ARK_DOWNLOAD_URL + ' — works without internet, perfect for emergencies. Share this with everyone you know. #emergency #preparedness #offlinefirst';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(msg)
          .then(() => {
            Toast.show('Caption copied! Opening Instagram…', 'success', 3000);
            window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
          })
          .catch(() => {
            Toast.show('Could not copy caption — open Instagram and paste manually', 'info', 4000);
            window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
          });
      } else {
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        Toast.show('Open Instagram and paste your caption', 'info', 4000);
      }
    } catch (e) {
      Toast.show('Open Instagram and share: ' + ARK_DOWNLOAD_URL, 'info', 5000);
    }
  }

  return { openModal, closeModal, downloadFile, copyTemplate, generateQR, shareViaSMS, shareViaEmail, shareViaFacebook, shareViaInstagram };
})();

/* ============================================================
   PRINT ARK — printable outputs for offline use
   ============================================================ */
const PrintARK = (() => {

  function _openPrintWindow(html, title) {
    const w = window.open('', '_blank', 'width=760,height=900');
    if (!w) { Toast.show('Pop-up blocked — allow pop-ups for this page and try again', 'warning', 4000); return; }
    w.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font:13px/1.5 Arial,sans-serif;color:#111;background:#fff;padding:20px;max-width:720px;margin:0 auto}
h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:12px}
h2{font-size:14px;border-bottom:1px solid #aaa;padding-bottom:4px;margin:16px 0 8px}
h3{font-size:13px;font-weight:700;margin:10px 0 4px}
p,li{font-size:13px;margin-bottom:4px}
ul,ol{padding-left:20px;margin-bottom:8px}
.card{border:1px solid #ccc;border-radius:6px;padding:12px;margin-bottom:12px;page-break-inside:avoid}
.card-title{font-weight:700;font-size:14px;margin-bottom:6px}
.warn{background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:8px;font-size:12px;margin-bottom:12px}
.badge{display:inline-block;background:#333;color:#fff;border-radius:3px;padding:1px 5px;font-size:11px}
table{border-collapse:collapse;width:100%;margin-bottom:12px}
td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left}
th{background:#eee;font-weight:700}
.footer{margin-top:24px;padding-top:8px;border-top:1px solid #ccc;font-size:11px;color:#666;text-align:center}
@media print{body{padding:0}button{display:none}.no-print{display:none}}
</style></head><body>${html}
<div class="footer">ARK Crisis Suite · Printed ${new Date().toLocaleString()} · halosuite.ai</div>
<div class="no-print" style="text-align:center;margin:20px 0">
  <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;background:#333;color:#fff;border:none;border-radius:4px">🖨️ Print</button>
</div>
</body></html>`);
    w.document.close();
    // Auto-trigger print dialog after render
    w.onload = function() { w.focus(); w.print(); };
    setTimeout(() => { if (w && !w.closed) { w.focus(); w.print(); } }, 1200);
  }

  // ── Household emergency card (wallet-size, 2 per page) ─────────────────────
  function emergencyCard() {
    const hh = Store.get('hh_members', []);
    const contacts = (function(){ const hh = Store.get('household', {}); return hh.ooaName ? [{name:hh.ooaName, phone:hh.ooaPhone||'', role:'Out-of-area contact'}] : []; })();
    const alias = Store.get('last_alias', 'ARK User');
    const hhId = Store.get('hh_id', '');
    const alertLevel = Store.get('alert_level', 1);
    const alertLabels = {1:'Normal',2:'Elevated',3:'High',4:'Crisis',5:'Critical'};

    let memberRows = '';
    if (hh.length) {
      memberRows = hh.map(m => {
        const medical = [
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
          m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
        ].filter(Boolean).join('<br>') || '—';
        return `<tr><td>${esc(m.name||'')}</td><td>${esc(m.role||'')}</td><td>${medical}</td></tr>`;
      }).join('');
    } else {
      memberRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No members added yet — fill in Household tab</td></tr>';
    }

    let contactRows = '';
    if (contacts && contacts.length) {
      contactRows = contacts.slice(0,5).map(c => `<tr><td>${esc(c.name||'')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.role||'')}</td></tr>`).join('');
    } else {
      contactRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No contacts saved — fill in Checklist tab</td></tr>';
    }

    const gps = Store.get('last_gps');
    const gpsLine = gps ? `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}` : 'unknown';

    const card = `<h1>🆘 ARK Emergency Card</h1>
<div class="warn">⚠️ EMERGENCY USE — Keep this with you. Alert level at print time: <strong>${alertLabels[alertLevel] || alertLevel}</strong></div>
<div class="card">
  <div class="card-title">👤 Household ID: ${esc(hhId)} &nbsp;·&nbsp; Lead: ${esc(alias)}</div>
  <table>
    <tr><th>Name</th><th>Role</th><th>Medical Info</th></tr>
    ${memberRows}
  </table>
</div>
<div class="card">
  <div class="card-title">📞 Emergency Contacts</div>
  <table>
    <tr><th>Name</th><th>Phone</th><th>Role</th></tr>
    ${contactRows}
  </table>
</div>
<div class="card">
  <div class="card-title">📍 Location at Print Time</div>
  <p>GPS: ${gpsLine} &nbsp;·&nbsp; Printed: ${new Date().toLocaleString()}</p>
  <p><strong>Meeting point:</strong> _______________________________________</p>
  <p><strong>Out-of-area contact:</strong> __________________________________</p>
</div>`;
    _openPrintWindow(card, 'ARK Emergency Card');
  }

  // ── Medical quick reference ────────────────────────────────────────────────
  function medicalRef() {
    const html = `<h1>🏥 ARK Medical Quick Reference</h1>
<div class="warn">⚠️ Life-threatening emergency: call 911. This is for reference only — not a substitute for professional care.</div>
<div class="card">
  <div class="card-title">❤️ CPR — Adult (8+ years)</div>
  <ol>
    <li>Check scene safety. Tap shoulder: "Are you OK?" — no response?</li>
    <li>Call 911 (or tell someone else to call).</li>
    <li>Tilt head back, lift chin. Look, listen, feel — no normal breathing?</li>
    <li>Heel of hand on centre of chest. 30 compressions, 2 inches deep, 100–120/min.</li>
    <li>2 rescue breaths (1 second each, chest should rise). Resume compressions.</li>
    <li>Keep going until help arrives or AED is attached.</li>
  </ol>
</div>
<div class="card">
  <div class="card-title">❤️ CPR — Child (1–8 years)</div>
  <ol>
    <li>Same check/call as above.</li>
    <li>One hand (or two fingers for infant). 30 compressions, 1.5 inches deep.</li>
    <li>2 gentle rescue breaths. Continue until help arrives.</li>
  </ol>
</div>
<div class="card">
  <div class="card-title">🤿 Choking — Adult / Child</div>
  <ul>
    <li>5 firm back blows between shoulder blades with heel of hand.</li>
    <li>5 abdominal thrusts (Heimlich): stand behind, fist above navel, pull sharply inward and upward.</li>
    <li>Alternate until object clears or person becomes unconscious.</li>
    <li>Unconscious → lower to floor, begin CPR, check mouth before breaths.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🤿 Choking — Infant (&lt;1 year)</div>
  <ul>
    <li>5 back blows (face-down on forearm, heel of hand).</li>
    <li>5 chest thrusts (2 fingers, centre of chest). Do NOT do abdominal thrusts.</li>
    <li>Alternate until object clears.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🩸 Bleeding Control</div>
  <ul>
    <li>Apply firm direct pressure with clean cloth — do not remove.</li>
    <li>Elevate the limb if possible.</li>
    <li>Tourniquet (last resort): 2–3 inches above wound, tighten until bleeding stops, note time.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🌡️ Shock Signs &amp; Response</div>
  <ul>
    <li>Signs: pale/cool/clammy skin, rapid weak pulse, confusion, rapid breathing.</li>
    <li>Lay person flat, elevate legs 12 inches (unless head/neck/spine injury).</li>
    <li>Keep warm, do not give food or water. Call 911 immediately.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🔥 Burns</div>
  <ul>
    <li>Cool with cool running water 10–20 minutes. No ice.</li>
    <li>Cover loosely with sterile gauze. No butter or toothpaste.</li>
    <li>Seek care if larger than palm, on face/hands/genitals, or full thickness (white/charred).</li>
  </ul>
</div>`;
    _openPrintWindow(html, 'ARK Medical Reference');
  }

  // ── Survival checklist ────────────────────────────────────────────────────
  function checklist() {
    const cl = (typeof Checklist !== 'undefined') ? Checklist._getActiveChecklist() : null;
    const items = cl ? cl.items : [];
    const storeKey = (typeof Checklist !== 'undefined') ? Checklist._storeKey() : ('checklist_daily_' + today());
    const checked = Store.get(storeKey, {});
    const done = items.filter(i => checked[i.id]).length;
    const total = items.length;
    const listName = cl ? cl.label : '📋 Preparedness Checklist';

    let rows = '';
    if (items.length) {
      rows = items.map(i => `<tr>
        <td style="text-align:center;font-size:16px">${checked[i.id] ? '✅' : '☐'}</td>
        <td>${esc(i.label||i.text||'')}</td>
        ${i.desc ? `<td style="font-size:11px;color:#666">${esc(i.desc)}</td>` : '<td></td>'}
      </tr>`).join('');
    } else {
      rows = '<tr><td colspan="3" style="color:#999;font-style:italic">No checklist items available</td></tr>';
    }

    const contacts = (function(){ const hh = Store.get('household', {}); return hh.ooaName ? [{name:hh.ooaName, phone:hh.ooaPhone||'', role:'Out-of-area contact'}] : []; })();
    let contactRows = '';
    if (contacts && contacts.length) {
      contactRows = contacts.map(c => `<tr><td>${esc(c.name||'')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.role||'')}</td></tr>`).join('');
    } else {
      contactRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No contacts added</td></tr>';
    }

    const html = `<h1>📋 ${esc(listName)}</h1>
<p>Completed: <strong>${done} / ${total}</strong> items &nbsp;·&nbsp; Printed: ${new Date().toLocaleDateString()}</p>
<div class="card">
  <div class="card-title">Items</div>
  <table>
    <tr><th style="width:40px">Done</th><th>Item</th><th style="width:200px">Notes</th></tr>
    ${rows}
  </table>
</div>
<div class="card">
  <div class="card-title">📞 Emergency Contacts</div>
  <table>
    <tr><th>Name</th><th>Phone</th><th>Role</th></tr>
    ${contactRows}
  </table>
</div>`;
    _openPrintWindow(html, 'ARK — ' + listName);
  }

  // ── Inventory / resources list ────────────────────────────────────────────
  function inventory() {
    const r = Store.get('resources', null);
    if (!r) { Toast.show('No resources data saved yet — update inventory first', 'warning', 3000); return; }
    const rows = [
      {name:'Water', qty: r.water||0, unit:'gal'},
      {name:'Food', qty: r.food||0, unit:'days'},
      {name:'Fuel', qty: r.fuel||0, unit:'gal'},
      {name:'Medical Supplies', qty: r.medical||0, unit:'/5'},
      {name:'Shelter Capacity', qty: r.shelter||0, unit:'ppl'},
      {name:'Power', qty: r.power||0, unit:'hrs'},
    ].filter(x => x.qty > 0);
    if (!rows.length) { Toast.show('All resource quantities are zero — update inventory first', 'warning', 3000); return; }
    const tableRows = rows.map(i => `<tr>
      <td>${esc(i.name)}</td>
      <td style="text-align:center">${Number(i.qty)||0} ${esc(i.unit)}</td>
    </tr>`).join('');
    const notesRow = r.notes ? `<div class="card"><div class="card-title">Notes</div><p>${esc(r.notes)}</p></div>` : '';
    const html = `<h1>📦 ARK Inventory Report</h1>
<p>Printed: ${new Date().toLocaleString()}</p>
<div class="card">
  <table>
    <tr><th>Resource</th><th>Quantity</th></tr>
    ${tableRows}
  </table>
</div>${notesRow}`;
    _openPrintWindow(html, 'ARK Inventory');
  }

  // ── Missing persons flyer ─────────────────────────────────────────────────
  function missingPerson(id) {
    const people = Store.get('missing_persons', []);
    const p = id != null ? people.find(x => x.id === id) : people[0];
    if (!p) { Toast.show('No missing person record to print', 'warning', 3000); return; }
    // G2: validate photoUrl — only allow data:image/ or https:// to block javascript: injection
    const safePhotoUrl = (p.photoUrl && (/^data:image\//i.test(p.photoUrl) || /^https:\/\//i.test(p.photoUrl))) ? p.photoUrl : null;
    const html = `<h1 style="text-align:center;font-size:28px;color:#cc0000">⚠️ MISSING PERSON</h1>
<div style="text-align:center;margin-bottom:16px">
  ${safePhotoUrl ? `<img src="${esc(safePhotoUrl)}" style="max-width:200px;max-height:200px;border:2px solid #000;border-radius:4px">` : '<div style="width:200px;height:200px;border:2px dashed #aaa;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;color:#aaa;font-size:14px;margin:0 auto">No photo</div>'}
</div>
<div class="card">
  <table>
    <tr><th>Name</th><td>${esc(p.name||'Unknown')}</td></tr>
    <tr><th>Age</th><td>${esc(String(p.age||'Unknown'))}</td></tr>
    <tr><th>Status</th><td style="color:${p.status==='Located'?'#1a7a1a':p.status==='Deceased'?'#555':'#cc0000'};font-weight:600">${esc(p.status||'Active Search')}</td></tr>
    <tr><th>Description</th><td>${esc(p.description||'—')}</td></tr>
    <tr><th>Last seen location</th><td>${esc(p.lastSeen||'—')}</td></tr>
    ${p.lastSeenTime ? `<tr><th>Last seen time</th><td>${esc(p.lastSeenTime)}</td></tr>` : ''}
    <tr><th>Reported</th><td>${p.ts ? new Date(p.ts).toLocaleString() : '—'}</td></tr>
    ${p.updatedTs ? `<tr><th>Status updated</th><td>${new Date(p.updatedTs).toLocaleString()}${p.updateNote ? ' — ' + esc(p.updateNote) : ''}</td></tr>` : ''}
  </table>
</div>
<div style="border:2px solid #000;border-radius:4px;padding:12px;text-align:center">
  <strong>If you have information, contact:</strong><br>
  ${p.contactInfo ? `<div style="margin:8px 0;font-size:16px;font-weight:600">${esc(p.contactInfo)}</div>` : ''}
  <div style="margin:8px 0;font-size:16px">Call 911 or local emergency services</div>
  <div style="color:#555;font-size:12px">ARK Household ID: ${esc(Store.get('hh_id',''))}</div>
</div>`;
    _openPrintWindow(html, 'Missing Person — ' + (p.name || 'Unknown'));
  }

  return { emergencyCard, medicalRef, checklist, inventory, missingPerson };
})();

// ============================================================
// ARKQr — pure-JS QR Code encoder (no dependencies)
// Implements QR Version 1–10, error correction level M
// ARKQr.encode(text) → boolean[][] matrix
// ARKQr.toSVGDiv(text, cellPx?) → HTML string with inline SVG
// ============================================================
const ARKQr = (() => {
  // Reed-Solomon GF(256) arithmetic
  const GF = (() => {
    const exp = new Uint8Array(512), log = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      exp[i] = x; log[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    const mul = (a, b) => a && b ? exp[log[a] + log[b]] : 0;
    const poly_mul = (p, q) => {
      const r = new Uint8Array(p.length + q.length - 1);
      for (let i = 0; i < p.length; i++)
        for (let j = 0; j < q.length; j++)
          r[i + j] ^= mul(p[i], q[j]);
      return r;
    };
    const gen = (n) => {
      let g = new Uint8Array([1]);
      for (let i = 0; i < n; i++) g = poly_mul(g, new Uint8Array([1, exp[i]]));
      return g;
    };
    // Polynomial remainder: divide only across the message part, never into the EC tail
    const rem = (data, gen) => {
      const r = new Uint8Array(data);
      const msgLen = data.length - (gen.length - 1);
      for (let i = 0; i < msgLen; i++)
        if (r[i]) { const f = r[i]; for (let j = 1; j < gen.length; j++) r[i + j] ^= mul(gen[j], f); }
      return r.slice(msgLen);
    };
    return { mul, gen, rem };
  })();

  // EC level M block structure per ISO/IEC 18004 Table 9:
  // [totalDataCodewords, totalEcCodewords, blockCount, ecCodewordsPerBlock]
  const VCAP = {
    1:[16,10,1,10],   2:[28,16,1,16],   3:[44,26,1,26],   4:[64,36,2,18],
    5:[86,48,2,24],   6:[108,64,4,16],  7:[124,72,4,18],  8:[154,88,4,22],
    9:[182,110,5,22], 10:[216,130,5,26]
  };
  const MAX_VERSION = 10;

  // Alignment pattern centre coordinates per version (ISO/IEC 18004 Annex E)
  const ALIGN_CENTRES = [null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50]];

  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  const EC_LEVEL_M_BITS = 0b00;
  const FORMAT_XOR_MASK = 0x5412;
  const FORMAT_GENERATOR = 0x537;
  const VERSION_GENERATOR = 0x1F25;

  // The 8 data mask conditions (ISO/IEC 18004 Table 10); true = invert module
  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
  ];

  const charCountBits = (mode, version) =>
    mode === 'alnum' ? (version <= 9 ? 9 : 11) : (version <= 9 ? 8 : 16);

  function payloadBitLength(mode, count, version) {
    const body = mode === 'alnum' ? Math.floor(count / 2) * 11 + (count % 2) * 6 : count * 8;
    return 4 + charCountBits(mode, version) + body;
  }

  function chooseVersion(mode, count) {
    for (let v = 1; v <= MAX_VERSION; v++)
      if (payloadBitLength(mode, count, v) <= VCAP[v][0] * 8) return v;
    throw new Error('Input too long for QR v' + MAX_VERSION);
  }

  function encodeData(mode, text, bytes, version) {
    const [dc, , blocks, ecPerBlock] = VCAP[version];
    const bits = [];
    const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    const ccBits = charCountBits(mode, version);

    if (mode === 'alnum') {
      push(0b0010, 4); push(text.length, ccBits);
      for (let i = 0; i < text.length; i += 2) {
        if (i + 1 < text.length) push(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
        else push(ALNUM.indexOf(text[i]), 6);
      }
    } else {
      push(0b0100, 4); push(bytes.length, ccBits);
      for (const b of bytes) push(b, 8);
    }
    // Terminator + padding
    for (let i = 0; i < 4 && bits.length < dc * 8; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const pads = [0xEC, 0x11];
    let pi = 0;
    while (bits.length < dc * 8) { push(pads[pi++ % 2], 8); }

    const data = new Uint8Array(dc);
    for (let i = 0; i < dc; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
      data[i] = b;
    }

    // Split into blocks (shorter blocks first), compute EC, interleave
    const shortSize = Math.floor(dc / blocks);
    const longCount = dc % blocks;
    const dataBlocks = [], ecBlocks = [];
    const gen = GF.gen(ecPerBlock);
    let pos = 0;
    for (let b = 0; b < blocks; b++) {
      const sz = shortSize + (b >= blocks - longCount ? 1 : 0);
      const block = data.slice(pos, pos + sz); pos += sz;
      dataBlocks.push(block);
      ecBlocks.push(GF.rem(new Uint8Array([...block, ...new Uint8Array(ecPerBlock)]), gen));
    }
    const out = [];
    const maxSz = shortSize + (longCount ? 1 : 0);
    for (let i = 0; i < maxSz; i++)
      for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < ecPerBlock; i++)
      for (const b of ecBlocks) out.push(b[i]);
    return out;
  }

  // BCH remainder of (value << degree) by generator, appended to value
  function bchEncode(value, generator, degree) {
    let rem = value << degree;
    for (let i = 31 - Math.clz32(rem); i >= degree; i--)
      if ((rem >> i) & 1) rem ^= generator << (i - degree);
    return (value << degree) | rem;
  }

  // 15 format bits, index 0 = most significant bit
  function formatBits(maskIndex) {
    const word = bchEncode((EC_LEVEL_M_BITS << 3) | maskIndex, FORMAT_GENERATOR, 10) ^ FORMAT_XOR_MASK;
    return Array.from({length: 15}, (_, i) => (word >> (14 - i)) & 1);
  }

  // Function modules hold booleans; data modules hold numbers (0/1) so masks touch only data.
  function buildBaseMatrix(version, data) {
    const size = version * 4 + 17;
    const m = Array.from({length: size}, () => new Array(size).fill(null));
    const set = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) m[r][c] = v; };

    const finder = (tr, tc) => {
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++)
        set(tr + r, tc + c, r >= 0 && r <= 6 && c >= 0 && c <= 6
          ? (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
          : false);
    };
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0);
    }

    const centres = ALIGN_CENTRES[version];
    const last = centres.length - 1;
    centres.forEach((r, ri) => centres.forEach((c, ci) => {
      const overlapsFinder = (ri === 0 && ci === 0) || (ri === 0 && ci === last) || (ri === last && ci === 0);
      if (overlapsFinder) return;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
        set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }));

    // Reserve format areas (written per mask later), then the fixed dark module
    for (const [r, c] of formatPositions(size).flat()) set(r, c, false);
    set(size - 8, 8, true);

    // Version information, v7+ (two 6x3 blocks next to the top-right and bottom-left finders)
    if (version >= 7) {
      const word = bchEncode(version, VERSION_GENERATOR, 12);
      for (let i = 0; i < 18; i++) {
        const bitOn = ((word >> i) & 1) === 1;
        const a = size - 11 + (i % 3), b = Math.floor(i / 3);
        set(b, a, bitOn); set(a, b, bitOn);
      }
    }

    // Zig-zag data placement; remainder bits are 0 data modules (masked like any data)
    let bit = 0;
    let up = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col = 5;
      for (let row = 0; row < size; row++) {
        const r = up ? size - 1 - row : row;
        for (let d = 0; d < 2; d++) {
          const c = col - d;
          if (m[r][c] === null) {
            m[r][c] = bit < data.length * 8 ? (data[bit >> 3] >> (7 - (bit & 7))) & 1 : 0;
            bit++;
          }
        }
      }
      up = !up;
    }
    return m;
  }

  // Both copies of the format info, each listed MSB first
  function formatPositions(size) {
    return [
      [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]],
      [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],
       [8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]],
    ];
  }

  function applyMask(base, maskIndex) {
    const size = base.length;
    const cond = MASKS[maskIndex];
    const out = base.map((row, r) => row.map((v, c) =>
      typeof v === 'number' ? (v ^ (cond(r, c) ? 1 : 0)) === 1 : v === true));
    const fmt = formatBits(maskIndex);
    for (const copy of formatPositions(size))
      copy.forEach(([r, c], i) => { out[r][c] = fmt[i] === 1; });
    return out;
  }

  // Penalty rules N1–N4 (ISO/IEC 18004 §7.8.3). Lower is better.
  const PENALTY_RUN = 3, PENALTY_BLOCK = 3, PENALTY_FINDER = 40, PENALTY_BALANCE = 10;
  const FINDER_LIKE = [
    [true,false,true,true,true,false,true,false,false,false,false],
    [false,false,false,false,true,false,true,true,true,false,true],
  ];

  function linePenalty(line) {
    let score = 0, run = 1;
    for (let i = 1; i <= line.length; i++) {
      if (i < line.length && line[i] === line[i - 1]) { run++; continue; }
      if (run >= 5) score += PENALTY_RUN + (run - 5);
      run = 1;
    }
    // Finder-like 1:1:3:1:1 with 4 light modules on one side; outside the symbol counts as light
    const padded = [false,false,false,false, ...line, false,false,false,false];
    for (let i = 0; i + 11 <= padded.length; i++)
      for (const pat of FINDER_LIKE)
        if (pat.every((p, k) => padded[i + k] === p)) score += PENALTY_FINDER;
    return score;
  }

  function penalty(m) {
    const size = m.length;
    let score = 0, dark = 0;
    for (let i = 0; i < size; i++) {
      score += linePenalty(m[i]);
      score += linePenalty(m.map(row => row[i]));
    }
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (m[r][c]) dark++;
      if (r < size - 1 && c < size - 1) {
        const v = m[r][c];
        if (m[r][c+1] === v && m[r+1][c] === v && m[r+1][c+1] === v) score += PENALTY_BLOCK;
      }
    }
    score += PENALTY_BALANCE * Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5);
    return score;
  }

  function encodeWithMask(text) {
    const mode = [...text].every(c => ALNUM.includes(c)) ? 'alnum' : 'byte';
    const bytes = mode === 'byte' ? new TextEncoder().encode(text) : null;
    const version = chooseVersion(mode, mode === 'byte' ? bytes.length : text.length);
    const base = buildBaseMatrix(version, encodeData(mode, text, bytes, version));
    let best = null;
    for (let k = 0; k < MASKS.length; k++) {
      const candidate = applyMask(base, k);
      const score = penalty(candidate);
      if (!best || score < best.score) best = {matrix: candidate, mask: k, score};
    }
    return best;
  }

  function encode(text) {
    return encodeWithMask(text).matrix;
  }

  function toSVGDiv(text, cellPx = 5) {
    try {
      const matrix = encode(text);
      const n = matrix.length;
      const quiet = 4;
      const total = (n + quiet * 2) * cellPx;
      let rects = '';
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (matrix[r][c])
            rects += `<rect x="${(c+quiet)*cellPx}" y="${(r+quiet)*cellPx}" width="${cellPx}" height="${cellPx}"/>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
      return `<div style="text-align:center;margin:8px 0">${svg}<div class="font-xs" style="color:#888;margin-top:4px">Scan with any camera app</div></div>`;
    } catch(e) {
      return `<div style="padding:12px;border:1px solid #555;border-radius:6px;font-size:12px;word-break:break-all;color:#aaa"><div style="margin-bottom:4px;color:#888">QR unavailable — open this URL:</div>${text}</div>`;
    }
  }

  return { encode, toSVGDiv, _encodeWithMask: encodeWithMask, _formatBits: formatBits };
})();

/* ============================================================
   ARKai — Hybrid AI: HALO Lite (zero-download) + HALO+ (WebLLM)
   ============================================================
   HALO Lite: pattern-matching knowledge base, works instantly offline.
   HALO+: Llama 3.2 via WebLLM, requires internet once to cache model.
   ============================================================ */
const ARKai = (() => {
  let _engine = null;      // WebLLM engine when loaded
  let _loading = false;
  let _history = [];       // {role, content}[]
  let _injectedCtx = {};   // keyed context blobs
  const HISTORY_KEY = 'halo_chat_history';
  const CTX_KEY = 'halo_ctx';
  const MAX_HISTORY = 40;

  const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm';

  /* ── HALO Lite Knowledge Base ────────────────────────────── */
  const KB = [
    // Water
    { k:['water','purify','safe to drink','contaminated','boil'],
      r:`💧 WATER PURIFICATION\n\n1. Boiling (best): Bring to rolling boil for 1 min (3 min above 6500 ft). Let cool. Most reliable method.\n\n2. Chemical (no heat): Add 8 drops unscented household bleach (5–9% chlorine) per gallon. Wait 30 min. Should smell faintly of chlorine — if not, repeat once.\n\n3. Iodine tablets: Follow package. Not for pregnant women or thyroid conditions. 30–60 min contact time.\n\n4. Filtering + treatment: DIY filter (gravel → sand → charcoal in a bottle) removes sediment but NOT pathogens — always treat after filtering.\n\n⚠️ Signs water may be unsafe: unusual color, odor, foam, dead animals nearby, industrial area upstream.`},
    // Fire
    { k:['fire','start a fire','no lighter','no matches','spark','flint','tinder'],
      r:`🔥 STARTING FIRE WITHOUT LIGHTER\n\nFriction method (bow drill):\n1. Carve a spindle ~18" long, pencil-width\n2. Carve a fireboard flat piece — same dry wood type\n3. Cut small notch in fireboard, place bark below to catch coal\n4. Loop string of bow around spindle, press down hard, bow back-and-forth fast\n5. When smoke and ember form, transfer to tinder bundle, blow gently\n\nFlint and steel: Strike flint against hard steel at angle over dry char cloth or tinder fungus.\n\nTinder: dry grass, bark shreds, birch paper bark, dry leaves, cattail fluff, pine needles. NOT damp material.\n\nFire lay: Teepee for fast heat, log cabin for sustained burn. Keep wind in mind — fire needs oxygen from downwind side.`},
    // Wound
    { k:['wound','bleeding','cut','deep cut','laceration','blood','treat wound','bandage','stop bleeding'],
      r:`🩸 WOUND CARE — NO DOCTOR\n\n1. STOP BLEEDING first:\n   - Direct pressure: clean cloth, press hard, hold 10+ minutes. Do NOT remove — add more on top if soaked.\n   - Elevate above heart level if possible.\n   - Tourniquet (life-threatening limb bleed only): 2–3" above wound, tighten until bleeding stops, note time applied.\n\n2. CLEAN the wound (once bleeding controlled):\n   - Flush with large volume of clean water under pressure (use syringe or plastic bag with pinhole)\n   - Remove visible debris gently\n   - Do NOT close a dirty or animal-bite wound — leave open to drain\n\n3. COVER:\n   - Clean bandage or cloth\n   - Change daily, watch for infection\n\n⚠️ Infection signs (seek help): increasing redness, warmth, pus, red streaks spreading, fever, wound smells bad\n\n⚠️ Seek immediate help: spurting blood (artery), wound > 1/2" deep, exposed bone/tendon, face/hand/joint wounds`},
    // Shock
    { k:['shock','someone in shock','pale','cold sweat','fainting','collapsed','low blood pressure','shock treatment'],
      r:`🚨 TREATING SHOCK\n\nShock = body not getting enough blood to vital organs. Life-threatening.\n\nSigns: pale/gray/bluish skin, cold clammy skin, rapid weak pulse, rapid shallow breathing, confusion/anxiety, nausea, unconsciousness.\n\nIMMEDIATE STEPS:\n1. Call 911 if possible\n2. Lay person flat, legs elevated ~12" (unless head/neck/spine injury, or breathing is worse)\n3. Keep them warm — cover with blanket\n4. Do NOT give food or water\n5. Loosen tight clothing\n6. If unconscious but breathing: recovery position (on side)\n7. If not breathing: begin CPR\n\nTypes to know:\n- Hemorrhagic (blood loss): control bleeding immediately\n- Anaphylactic (allergic): epinephrine (EpiPen) if available\n- Septic (infection): fever + shock signs = emergency\n\n⚠️ Do NOT leave them alone. Monitor breathing constantly.`},
    // Burns
    { k:['burn','burned','burn treatment','fire burn','scald','chemical burn'],
      r:`🔥 BURN TREATMENT\n\nFirst, determine severity:\n- 1st degree: red, painful, no blisters (sunburn-like)\n- 2nd degree: blisters, intense pain, wet/shiny skin\n- 3rd degree: white/brown/black, leathery, may be painless (nerve damage)\n\n1st & 2nd degree (small area):\n1. Cool with cool running water 10–20 min — NOT ice, NOT butter/toothpaste/egg white\n2. After cooling: cover loosely with clean non-stick bandage\n3. Do NOT pop blisters\n4. Pain relief: ibuprofen or acetaminophen\n\n⚠️ Seek immediate help for:\n- Any 3rd degree burn\n- Burns on face, hands, feet, genitals, joints\n- Burns > palm-size (>1% body for 2nd/3rd)\n- Chemical or electrical burns\n- Smoke inhalation (hoarse voice, soot in mouth/nose)\n\nChemical burn: flush with large amounts of water 20+ min, remove contaminated clothing (protect yourself first)`},
    // CPR
    { k:['cpr','not breathing','cardiac arrest','heart stopped','chest compressions','resuscitation','unconscious not breathing'],
      r:`❤️ CPR — QUICK GUIDE\n\nADULT/CHILD (8+):\n1. Check scene is safe. Tap shoulders: "Are you OK?"\n2. Call 911 (or send someone)\n3. No normal breathing → start CPR\n4. Heel of hand on center of chest (between nipples)\n5. 30 compressions: push down 2–2.4", rate 100–120/min (beat of "Stayin' Alive")\n6. Tilt head, lift chin, give 2 rescue breaths (1 sec each, chest should rise)\n7. Repeat 30:2 until help arrives or person recovers\n\nINFANT (under 1 yr):\n- 2 fingers on center of chest, just below nipple line\n- Compress 1.5" depth\n- 30 compressions → 2 gentle breaths\n\nCHILD (1–8):\n- 1 or 2 hands depending on child size\n- Compress 2"\n- 30:2 same ratio\n\nAED (if available): Turn on, follow voice prompts. Use as soon as possible — delivers shock before CPR if needed.\n\n🚨 Hands-only CPR (no breaths) is acceptable for adult bystander CPR — compression-only is better than nothing.`},
    // Choking
    { k:['choking','heimlich','can\'t breathe','obstruction','throat blocked','choking adult','choking infant','choking baby'],
      r:`🫁 CHOKING — HEIMLICH MANEUVER\n\nADULT / CHILD (1+):\n1. Ask "Are you choking?" — if they can cough, encourage coughing\n2. If they can't speak/breathe/cough:\n   - Stand behind, arms around waist\n   - Fist thumb-side just above navel, below chest\n   - Grab fist with other hand\n   - 5 firm upward thrusts (J-motion: in and up)\n3. Alternate: 5 back blows between shoulder blades with heel of hand\n4. Repeat until object dislodged or they go unconscious\n5. If unconscious: lower to ground, call 911, begin CPR\n\nINFANT (under 1 yr):\n1. Face-down on forearm, head lower than chest\n2. 5 firm back blows between shoulder blades\n3. Flip face-up: 2 fingers on chest, 5 quick chest thrusts\n4. Check mouth — only remove object if you can SEE it\n5. Repeat until cleared or infant goes unresponsive → infant CPR\n\nIf ALONE and choking:\n- Thrust your upper abdomen against hard edge of table/chair back\n- Self-Heimlich: fist technique same as above, thrust hard`},
    // Dehydration
    { k:['dehydration','dehydrated','thirsty','no water','fluid','electrolyte','hydration','signs of dehydration'],
      r:`💧 DEHYDRATION — SIGNS & TREATMENT\n\nSigns by severity:\n\nMild: dark urine, thirsty, slightly dry mouth, tired\nModerate: very dark/no urine, dry mouth, headache, dizziness, rapid heart rate, muscle cramps, irritability\nSevere: sunken eyes, no urine >8h, rapid breathing, confusion, can't stand — EMERGENCY\n\nChildren: sunken fontanelle (soft spot on infant head), no tears when crying, no wet diaper >6h → urgent\n\nTreatment:\n1. Drink small amounts frequently — not large gulps (can cause vomiting)\n2. Oral Rehydration Solution (ORS) if available — better than plain water\n   DIY ORS: 1 liter clean water + 6 tsp sugar + 1/2 tsp salt\n3. If vomiting: small sips every 5 min, ice chips, popsicles\n4. Rest in cool/shaded area\n5. Avoid caffeine and alcohol\n\nSurvival note:\nAdult minimum need: ~2 liters/day in mild conditions; more in heat, exertion, illness\nFood survival: 3+ weeks without food\nWater survival: 3–5 days without water (less in heat)`},
    // Shelter
    { k:['shelter','cold','hypothermia','stay warm','build shelter','stay dry','survive cold','exposure'],
      r:`🏕️ EMERGENCY SHELTER & HYPOTHERMIA\n\nHypothermia signs:\n- Mild: shivering, confusion, slurred speech, stumbling\n- Moderate: intense shivering, pale skin, confusion\n- Severe: shivering stops (bad sign), unconscious, rigid muscles\n\nHypothermia treatment:\n1. Get to shelter, out of wind and wet\n2. Remove wet clothing\n3. Cover with dry insulation (blankets, leaves, clothing layers)\n4. Warm core first (chest, groin, armpits) — not extremities\n5. Warm sweet drinks if conscious and swallowing\n6. Do NOT rub extremities (drives cold blood to core)\n7. Handle gently — rough movement can cause cardiac arrest in severe hypothermia\n\nBuilding a debris shelter:\n1. Find natural windbreak (rock face, fallen log)\n2. Lean dead branches against it at 45°\n3. Pack debris (leaves, pine needles, bark) 2–3 ft thick on sides and roof\n4. Inside: deep leaf bed 4"+ off ground for insulation\n5. Opening: face away from prevailing wind\n6. Size: just big enough to fit — smaller holds body heat better\n\nInsulation priority: ground > sides > top. Cold ground steals heat 25x faster than cold air.`},
    // Signaling
    { k:['signal','help','rescue','found','lost','sos','signal for help','stranded','how to be found'],
      r:`📡 SIGNALING FOR RESCUE\n\nRule of Threes for signaling: 3 of anything = distress (3 whistle blasts, 3 fires, 3 gunshots)\n\nMost visible signals:\n1. Signal mirror: flash toward aircraft/horizon. Can be seen 10+ miles. Aim reflection at target, use two-finger "V" aiming sight.\n2. Ground-to-air signals (stomp in snow or lay rocks/logs, minimum 10 ft tall):\n   - X = need medical help\n   - V = need help\n   - → = going this direction\n3. Fire/smoke: 3 fires in triangle, 100 ft apart. Green leaves/rubber = white smoke (visible in trees). Oil/rubber = black smoke (visible against snow).\n4. Whistle: 3 blasts, pause, repeat. Carries further than voice.\n5. Bright colors: lay any bright material flat in open area, contrast with background.\n\nStay put vs. move:\n- STAY if someone knows your location\n- STAY if you have shelter and water\n- MOVE only if you know exactly where help is and you have the ability`},
    // Food survival
    { k:['food','survive without food','hunger','what to eat','edible plants','foraging','rations','food storage'],
      r:`🍎 FOOD SURVIVAL\n\nSurvival priority: Water > Shelter > Signals > Food\nYou can survive 3+ weeks without food.\n\nCalorie priorities for stored food:\n1. White rice/dried beans — longest shelf life (25+ years), complete protein together\n2. Oats — cheap, 30-year shelf life\n3. Honey — never spoils\n4. Salt — essential mineral, preservative\n5. Hard candy — morale + quick energy\n\nForaging universal edibility test (for unknown plants):\n1. Avoid white/yellow berries, plants with milky sap, umbrella-shaped flowers\n2. Touch small amount to lip — wait 3 min for reaction\n3. Touch to tongue — wait 15 min\n4. Chew (don't swallow) — wait 15 min\n5. Swallow small amount — wait 8 hours\n6. If no reaction: eat a small amount, wait 8 more hours\n\nSafe universally recognized plants:\n- Cattail (roots, pollen head)\n- Dandelion (all parts)\n- Acorns (must leach tannins — boil/soak multiple times)\n- Pine needles (tea — high vitamin C)\n- Rose hips (high vitamin C)\n\n⚠️ When in doubt, don't eat it. Hunger is survivable. Poison is not.`},
    // Medical assessment
    { k:['unconscious','unresponsive','assess','abc','airway','breathing','circulation','assess someone','first aid assessment'],
      r:`🩺 CASUALTY ASSESSMENT — ABC\n\nDanger → Response → Airway → Breathing → Circulation\n\n1. DANGER: Is the scene safe? Don't become a casualty yourself.\n\n2. RESPONSE: Tap shoulders firmly. Shout "Can you hear me?"\n   - Responds → assess and treat\n   - No response → call 911 immediately\n\n3. AIRWAY: Tilt head back, lift chin. Look in mouth for obstruction. Remove if visible.\n\n4. BREATHING: Look (chest rise), listen, feel (cheek near mouth). 10 seconds.\n   - Breathing normally → recovery position\n   - Not breathing → CPR\n   - Gasping only → treat as not breathing\n\n5. CIRCULATION: Major bleeding? Treat now. Tourniquets > direct pressure for severe limb bleeds.\n\n6. DISABILITY: Check pupils (equal? reactive to light?). Can they squeeze your hands? Move feet?\n\n7. EXPOSURE: Check for hidden injuries. Protect from cold.\n\nRecord: What happened, time of injury, any medications, allergies. Tell emergency services when they arrive.`},
    // Morse code
    { k:['morse','morse code','sos'],
      r:`📻 MORSE CODE — SOS & ESSENTIALS\n\nSOS: · · · — — — · · · (3 short, 3 long, 3 short)\nThis is THE universal distress signal. Any medium — light, sound, radio, tapping.\n\nBasic letters:\nA ·—   B —···  C —·—·  D —··   E ·\nF ··—·  G ——·   H ····   I ··    J ·———\nK —·—  L ·—··  M ——    N —·    O ———\nP ·——·  Q ——·—  R ·—·   S ···    T —\nU ··—   V ···—   W ·——   X —··—  Y —·——  Z ——··\n\nNumbers:\n1 ·——— 2 ··——— 3 ···——  4 ····— 5 ·····\n6 —···· 7 ——··· 8 ———·· 9 ————· 0 —————\n\nTiming: dot = 1 unit, dash = 3 units, space between letters = 3 units, space between words = 7 units`},
    // Radio
    { k:['radio','communicate','frequency','walkie','ham radio','baofeng','radio frequencies'],
      r:`📡 EMERGENCY RADIO GUIDE\n\nFREQUENCIES TO KNOW:\n- 462.675 MHz — NOAA National Call Frequency\n- 155.340 MHz — National Search & Rescue\n- 156.800 MHz (Channel 16) — Marine distress & calling\n- 121.5 MHz — Aviation emergency (guard frequency)\n- GMRS/FRS (family radios): 462–467 MHz range\n\nFCC Emergency Authorization:\nDuring declared emergency, unlicensed use of ham frequencies is permitted to save lives or property.\n\nMESSAGE FORMAT (when radio works but conditions poor):\n- Say callsign/name\n- Say location (GPS or landmark)\n- Say situation briefly\n- Repeat 3 times\n- Listen 2× as long as you transmit\n\nBATTERY CONSERVATION:\n- Scan mode instead of monitoring\n- Lower power setting at close range\n- Charge via solar/hand-crank in power outage\n\nSee ARK's Radio tab for the Morse code trainer and frequency logger.`},
    // General emergency
    { k:['power outage','blackout','grid down','no power','earthquake','hurricane','tornado','flood','disaster'],
      r:`🚨 GENERAL EMERGENCY PROTOCOL\n\nFIRST 60 SECONDS:\n1. Is anyone injured? Life safety first\n2. Is there immediate danger? (fire, gas, structure damage)\n3. 911 if phone works\n\nFIRST 24 HOURS:\n- Shelter in place unless ordered to evacuate\n- Gather: water, food, medications, documents, phone charger\n- Tune to emergency broadcast radio\n- Tell household your status (use ARK Hub)\n- Charge all devices now if power is intermittent\n\nUTILITY SAFETY:\n- Gas smell → leave immediately, don't flip switches, call utility from outside\n- Downed power line → 50 ft minimum clearance, never touch, treat as live\n- Water main break → turn off at house valve\n\nFOOD SAFETY in outage:\n- Fridge: safe 4 hours if closed\n- Freezer: safe 24–48 hours if closed (full freezer = longer)\n- When in doubt, throw it out\n\nEVACUATION bag (72-hour kit):\nWater 3 liters/person, food 3 days, first aid kit, medications 1 week, flashlight, radio, documents (ID/insurance), cash small bills, phone charger, warm layers, map (paper)`},
    // Hypothermia in water
    { k:['drowning','water rescue','cold water','fallen in water','water immersion'],
      r:`🌊 COLD WATER SURVIVAL\n\nCold water (below 70°F) incapacitation:\n- 32°F: unconscious in 15 min, dead in 15–45 min\n- 50°F: exhausted/unconscious 1–2h\n- 60°F: exhausted/unconscious 2–7h\n\nIf YOU fall in:\n1. Don't panic — involuntary gasp reflex passes in 60–90 seconds\n2. Keep head above water, control breathing\n3. HELP position (Heat Escape Lessening Position): cross arms tight on chest, knees up — reduces heat loss 50%\n4. DON'T swim to exhaustion — HELP or treading is better if you can't reach shore quickly\n5. Get OUT of the water as fast as possible — even lying on ice is better\n\nIf YOU rescue someone:\n1. Reach → Throw → Row → Go (last resort: go in)\n2. Horizontal extraction — don't stand them up (blood pressure crash)\n3. Treat for hypothermia (see Shelter section)\n4. Watch for cardiac arrhythmia — handle gently`},
    // Navigation
    { k:['navigate','lost','find direction','north','compass','stars','navigation','which way','orient','landmark'],
      r:`🧭 NAVIGATION WITHOUT TOOLS\n\n**Finding North:**\n- Sun method: Sun rises roughly East, sets roughly West. At noon (solar), shadows point North (N hemisphere) or South (S hemisphere).\n- Watch method (N hemisphere): Hold watch flat, point hour hand at sun. Bisect angle between hour hand and 12 — that line points South.\n- Night: Find Polaris (North Star) — follow the two outer stars of the Big Dipper's cup 5× their distance; Polaris is due North within 1°.\n- Shadow tip method: Push stick in ground, mark shadow tip, wait 15 min, mark again. First mark = West, second = East, line between = East-West.\n\n**When lost:**\n1. STOP — don't wander further\n2. Think — retrace your mental steps\n3. Observe — high ground, water flow direction, sun position\n4. Plan — follow water downstream (leads to civilization)\n\n**Terrain reading:**\n- Water flows downhill to civilization\n- Aircraft noise, roads, power lines → follow toward them\n- North-facing slopes (N hemisphere) = shadier, denser vegetation\n- Remember: 3 of anything = distress signal if you need rescue instead`},
    // Psychological / Mental Health
    { k:['panic','anxiety','stress','fear','mental','psychological','calm down','overwhelmed','trauma','cope','panic attack','morale'],
      r:`🧠 PSYCHOLOGICAL FIRST AID\n\n**Acute panic / panic attack:**\n1. Ground yourself: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.\n2. Box breathing: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4–6 cycles.\n3. Cold water on wrists/face activates the dive reflex — slows heart rate fast.\n4. Physical movement (walking, rhythmic activity) burns off stress hormones.\n\n**During sustained crisis:**\n- Routine is stabilizing: regular sleep, meals, tasks — even if imperfect.\n- Information diet: check updates once/twice daily, not constantly.\n- Assign roles: purpose reduces helplessness.\n- Normalize reactions: fear and anxiety are rational responses, not weakness.\n- Focus on what you can control, explicitly let go of what you can't.\n\n**Helping others in crisis:**\n- Calm presence: speak slowly, stay close, make eye contact.\n- Don't say "calm down" — say "I'm here, you're safe, we're handling this."\n- Children: physical contact + simple true information — silence and secrecy worsen fear.\n- Watch for: withdrawal, rage, refusal to eat, talk of hopelessness → needs professional help when available.\n\n**Morale basics:** Sleep > food > warmth > human connection. All four matter.`},
    // Security
    { k:['security','protect','defend','safe','intruder','threat','looter','guard','watch','perimeter','safety'],
      r:`🔒 SECURITY IN A CRISIS\n\n**Immediate threat assessment:**\n1. Lock and secure entry points — doors, windows, gates.\n2. Establish a rally point if the household is separated.\n3. Designate a safe room (interior room, no windows, hardened door).\n4. Check in with neighbors — mutual aid increases collective security.\n\n**Layered awareness:**\n- Outer perimeter: know who is approaching before they reach your door.\n- Middle: lighting at night deters opportunistic threats.\n- Inner: know your exits, have a plan if you must leave fast.\n\n**De-escalation first:**\n- Most threats in disaster are opportunistic, not violent — firm, calm boundary-setting often works.\n- Display of a group (multiple people visible) is a deterrent.\n- Avoid openly displaying high-value resources.\n\n**Communication:**\n- Establish check-in times with household members.\n- Code words for "I'm in danger" vs. "I'm safe."\n- Document strangers at your location if rule-of-law is uncertain.\n\n⚠️ In any situation involving an armed threat: compliance and escape are safer than confrontation. Property is replaceable.`},
    // Evacuation
    { k:['evacuate','evacuation','bug out','leave home','go bag','72 hour','emergency kit','flee','leave now','forced to leave'],
      r:`🚗 EVACUATION — QUICK GUIDE\n\n**Go/No-Go decision:**\n- GO if: official evacuation order issued, structural threat to shelter, fire within 1 mile, rising water, toxic hazard nearby.\n- STAY if: no order issued, safer than roads, dependent household members can't travel.\n\n**72-Hour Bug-Out Bag (per person):**\n- Water: 1 liter + purification tabs/filter\n- Food: 3 days non-perishable, 2000 cal/day\n- First aid kit + 1-week medications\n- Copies of ID, insurance, contacts (waterproof bag)\n- Cash in small bills (ATMs may be down)\n- Phone charger + battery bank\n- Flashlight + extra batteries\n- Warm layers + rain poncho\n- Whistle, knife, duct tape\n- Paper map of your region\n\n**Before leaving:**\n1. Tell someone your destination and route.\n2. Turn off gas, unplug appliances (if time allows).\n3. Take pets and medications — these are hard to replace.\n4. Lock up — opportunistic looting follows evacuations.\n5. Take one photo of each room for insurance claims.\n\n**On the road:**\n- Use official evacuation routes — shortcuts may be blocked.\n- Keep fuel above half-tank during crisis periods.\n- If roads are gridlocked: local shelter > highway death trap.`},
    // Tools & improvised equipment
    { k:['tools','equipment','improvise','make do','no tools','knife','rope','cord','tarp','duct tape','paracord','improvised'],
      r:`🔧 IMPROVISED TOOLS & EQUIPMENT\n\n**Essential multi-use items to have:**\n- Duct tape — repairs, splints, shelter patching, blister prevention, cordage\n- Paracord — shelter lines, tourniquets, clothesline, tripwire alarm, fishing line (inner strands)\n- Tarp — shelter roof, ground cloth, water collection funnel, stretcher\n- Garbage bags — waterproofing, rain poncho, water storage, signal (orange/yellow)\n- Bandana — dust mask, bandage, water pre-filter, signal, cooling\n\n**Improvised tools:**\n- Knife from broken glass (flint-knapping technique or smash bottle to get edge)\n- Shovel from flat board or hub cap\n- Hammer from heavy rock\n- Rope from strips of clothing braided 3-strand\n- Water container from large plastic bag tied at top\n- Candle from fat/grease + twisted cloth wick in a tin can\n\n**Knife safety (improvised):**\n- Always cut away from body\n- Secure workpiece before cutting\n- Never catch a falling blade\n\n**Friction fire tools need:** dry wood, the right species (cottonwood, willow, cedar, basswood), and patience. If wood feels cold or won't powder, it's too moist — find drier material.`},
    // Heart attack
    { k:['heart attack','chest pain','chest pressure','heart','cardiac','jaw pain','arm pain','heart attack signs','myocardial'],
      r:`❤️ HEART ATTACK — ACT FAST\n\nWarning signs (can appear together or alone):\n- Chest pain, pressure, squeezing, or fullness — may come and go\n- Pain spreading to arm (usually left), shoulder, neck, jaw, or back\n- Shortness of breath (with or without chest discomfort)\n- Cold sweat, nausea, lightheadedness\n- Women often have atypical symptoms: jaw pain, nausea, fatigue without chest pain\n\nIMMEDIATE STEPS:\n1. Call 911 NOW — do not drive yourself\n2. Chew one adult aspirin (325mg) or 4 baby aspirin (81mg each) — if not allergic and no bleeding disorder. Chew, don't swallow whole.\n3. Sit or lie down in most comfortable position — do not exert\n4. Loosen tight clothing\n5. If prescribed nitroglycerin, take as directed\n6. If person becomes unconscious and stops breathing → CPR\n\n⚠️ Time is muscle. Every minute without treatment destroys heart tissue. Even if unsure — call 911.`},
    // Stroke
    { k:['stroke','face drooping','arm weakness','speech slurred','FAST','stroke signs','brain attack','tia','facial droop'],
      r:`🧠 STROKE — FAST ACTION\n\nF.A.S.T. Test:\n- **Face**: Ask to smile — one side droops?\n- **Arms**: Raise both arms — one drifts down?\n- **Speech**: Repeat a simple phrase — slurred or strange?\n- **Time**: Call 911 immediately if any sign is present\n\nOther signs:\n- Sudden severe headache with no known cause ("worst headache of my life")\n- Sudden confusion, trouble understanding\n- Sudden vision problem in one or both eyes\n- Sudden trouble walking, dizziness, loss of balance\n\nSTEPS:\n1. Call 911 immediately — note time symptoms started\n2. Do NOT give food, water, or aspirin (stroke may be hemorrhagic)\n3. Lay person on their side if vomiting\n4. Keep them calm, still, and warm\n5. CPR if breathing stops\n\n⚠️ Stroke treatment ("clot-buster" drug tPA) MUST be given within 3–4.5 hours. Every minute counts.`},
    // Anaphylaxis
    { k:['anaphylaxis','anaphylactic','allergic reaction','severe allergy','epipen','epinephrine','throat closing','hives','bee sting allergy','food allergy reaction'],
      r:`🚨 ANAPHYLAXIS — LIFE-THREATENING ALLERGIC REACTION\n\nSigns (appear within seconds to 30 min of exposure):\n- Hives, itching, flushed or pale skin\n- Swelling of throat/tongue (stridor = high-pitched breathing)\n- Drop in blood pressure, weak/rapid pulse\n- Nausea, vomiting, diarrhea\n- Dizziness, fainting\n- Sense of doom\n\nIMMEDIATE STEPS:\n1. Call 911\n2. Administer epinephrine (EpiPen) immediately if available:\n   - Remove blue safety cap\n   - Press orange tip firmly against outer mid-thigh (can go through clothing)\n   - Hold for 10 seconds\n   - Note time — second dose can be given after 5–15 min if needed\n3. Lay person flat, legs elevated — unless breathing is worse (then sitting up)\n4. If unconscious and not breathing → CPR\n5. Even if symptoms improve after EpiPen → still go to ER (can return in 4–8h)\n\nAfter epinephrine: antihistamines (Benadryl) and steroids help but do NOT replace epinephrine.\n\n⚠️ Do NOT use antihistamines alone — anaphylaxis requires epinephrine.`},
    // Snake/animal bite
    { k:['snake bite','snakebite','bitten by snake','venomous','spider bite','animal bite','dog bite','bite wound','rabies'],
      r:`🐍 BITES — SNAKE, ANIMAL & SPIDER\n\n**Snake bite:**\n1. Move away from the snake — do not try to catch or kill it\n2. Keep victim calm and still — movement spreads venom\n3. Remove rings/watches/tight items near bite (swelling comes fast)\n4. Keep bitten limb below heart level\n5. Mark edge of swelling with pen every 15 min to track spread\n6. Call Poison Control: 1-800-222-1222 (US)\n7. Get to hospital ASAP — antivenom is the only effective treatment\n\n❌ Do NOT: suck venom, apply tourniquet, cut the wound, apply ice, give alcohol\n\n**Dog/animal bite:**\n1. Wash wound thoroughly with soap and water for 5 min\n2. Apply gentle pressure to control bleeding\n3. Cover with clean bandage\n4. Seek medical care — rabies post-exposure shots may be needed if animal unknown/acting strangely\n5. Report bite to animal control if stray or wild animal\n\n**Spider bite (black widow/brown recluse):**\n- Black widow: muscle cramps, sweating, nausea → ER\n- Brown recluse: expanding skin lesion over hours → ER\n- Keep area clean, cold pack for pain, don't scratch`},
    // Poisoning
    { k:['poison','poisoning','overdose','swallowed','toxic','ingested chemicals','poison control','accidental ingestion','drug overdose'],
      r:`☠️ POISONING / OVERDOSE\n\nCall Poison Control FIRST: **1-800-222-1222** (US, 24/7, free, multilingual)\nOr 911 if person is unconscious or not breathing.\n\n**General principles:**\n1. Try to identify the substance: name, amount, time ingested\n2. Do NOT induce vomiting unless Poison Control specifically tells you to\n3. Do NOT give milk or water unless instructed\n4. If skin/eye contact: flush with large amounts of water for 15–20 min\n5. If inhaled: get person to fresh air immediately\n\n**Signs of serious poisoning:**\n- Difficulty breathing, seizures, unconsciousness, lips turning blue\n- Severe vomiting, burning in mouth/throat\n- Hallucinations, extreme confusion\n\n**Drug overdose (opioid) — Naloxone (Narcan):**\n1. Lay on back, tilt head to open airway\n2. Administer nasal Narcan: 1 spray in one nostril\n3. If no response in 2–3 min, repeat in other nostril\n4. Recovery position if breathing; CPR if not breathing\n5. Effects last 30–90 min — if drug outlasts Narcan, they can re-overdose; stay until EMS arrives`},
    // Broken bones / fractures
    { k:['broken bone','fracture','sprain','broken arm','broken leg','dislocated','dislocation','broken wrist','splint','immobilize'],
      r:`🦴 FRACTURES & DISLOCATIONS\n\n**Signs of fracture:**\n- Pain, swelling, bruising at site\n- Deformity (limb looks wrong)\n- Inability to bear weight or use limb\n- Crepitus (grating/crunching when moved)\n\n**Fracture first aid:**\n1. Immobilize in the position found — do not straighten unless circulation cut off\n2. Splint: use rigid objects (boards, rolled magazine, sticks) padded with cloth, secured above and below the fracture\n3. Check circulation: pulse, feeling, and movement below the injury (before and after splinting)\n4. Elevate if possible to reduce swelling\n5. Ice pack (not directly on skin) for 20 min on/20 min off\n6. Seek medical care for all suspected fractures\n\n**When it's an emergency:**\n- Open fracture (bone through skin): cover with clean cloth, do NOT push bone back, 911\n- Suspected spine/neck fracture: do NOT move person, call 911, stabilize head\n- Signs of circulatory compromise (blue/cold/numb below fracture): 911 immediately\n\n**Dislocations:**\n- Do NOT try to put back yourself unless trained — can damage nerves/blood vessels\n- Immobilize as found, ice, seek medical care`},
    // Frostbite
    { k:['frostbite','frozen','frostbitten','frozen fingers','frozen toes','frozen skin','cold injury','numb cold'],
      r:`❄️ FROSTBITE\n\nStages:\n- Frostnip: red, painful, numb but pliable — full recovery with rewarming\n- Superficial frostbite: waxy/white/gray, numb, stiff surface but soft below\n- Deep frostbite: hard, wooden feel, can't feel it at all — tissue death risk\n\n**Rewarming — do only if no refreezing risk:**\n1. Get to warm shelter\n2. Remove wet clothing and jewelry from affected area\n3. Rewarm in water 104–108°F (40–42°C) — not hotter; test with unaffected hand\n4. 15–30 min until skin becomes pink and pliable — this will be painful\n5. After thaw: loosely wrap with sterile gauze, separate toes/fingers\n6. Do NOT rub the area — causes ice crystal damage\n7. Do NOT walk on thawed frostbitten feet — refreezing is catastrophic\n8. Do NOT use direct heat (fire, heating pad, hot water bottle)\n\n⚠️ If you cannot guarantee no refreezing: delay rewarming (walking on frozen feet is safer than refreezing thawed tissue)\n⚠️ Blisters will form 1–2 days after thawing — do not break them, seek medical care`},
    // Heat stroke
    { k:['heat stroke','heat exhaustion','overheating','hyperthermia','heat emergency','hot environment','too hot','heat illness'],
      r:`🌡️ HEAT EMERGENCIES\n\n**Heat exhaustion** (warning stage):\nSigns: heavy sweating, cool/pale/clammy skin, fast/weak pulse, nausea, dizziness, muscle cramps, weakness\nTreatment: move to cool area, lie down, loosen clothing, cool wet cloths on skin, sip water if conscious, fan them\n\n**Heat stroke** (emergency — life-threatening):\nSigns: HIGH body temp (103°F+/39°C+), hot/red/dry OR damp skin, rapid/strong pulse, confusion, possible unconsciousness\nSigns NOT present in heat stroke: usually little to no sweating\n\n**Heat stroke STEPS:**\n1. Call 911 immediately\n2. Move to cool environment\n3. Cool rapidly — FAST — using ANY method:\n   - Cold water immersion (most effective)\n   - Ice packs to neck, armpits, groin (high blood flow areas)\n   - Cold wet sheets\n   - Fanning while misting with cool water\n4. Do NOT give fluids if confused or unconscious\n5. Keep cooling until body temp drops to 101–102°F\n\n**High-risk groups**: elderly, young children, athletes, outdoor workers, people on diuretics/antihistamines/antidepressants`},
    // Gas leak / carbon monoxide
    { k:['gas leak','natural gas','gas smell','carbon monoxide','co detector','co poisoning','gas emergency','propane leak'],
      r:`⚠️ GAS LEAK & CARBON MONOXIDE\n\n**Natural gas leak (rotten egg smell):**\n1. Do NOT flip light switches, use phone, or create any spark\n2. Leave immediately — leave door open, do not lock\n3. Get everyone out including pets\n4. Call 911 and gas company from outside / neighbor's phone\n5. Do not re-enter until utility clears the building\n\n**Carbon monoxide (CO) — odorless, invisible:**\nSigns: headache, dizziness, nausea, confusion, weakness — often affects everyone in the building simultaneously\n1. Get to fresh air immediately\n2. Leave door open, do not go back in\n3. Call 911 from outside\n4. Anyone with severe symptoms → ER (CO poisoning needs hyperbaric oxygen)\n5. Do NOT re-enter until fire dept/utility clears with instruments\n\n**CO sources:** malfunctioning furnace, generator, gas appliance, car in garage, blocked chimney\n\n⚠️ Running a generator or gas appliance inside KILLS. 20 ft from any opening minimum.\n\n**Prevention:**\n- CO detector on every level, replace every 5–7 years\n- Never warm up vehicles in an attached garage\n- Annual furnace/appliance inspection`},
    // Earthquake
    { k:['earthquake','tremor','shaking','quake','aftershock','seismic','during earthquake'],
      r:`🌍 EARTHQUAKE — DURING AND AFTER\n\n**During shaking:**\n1. DROP to hands and knees — protects from knockdown\n2. COVER under sturdy table/desk, or against interior wall away from windows\n3. HOLD ON and cover head/neck with arms\n4. Stay inside — most injuries happen when people run outside (falling glass, debris)\n5. If in bed: stay there, cover head with pillow\n6. If outside: move away from buildings, power lines, trees; drop and cover\n7. If in a car: pull over away from buildings/power lines, stay inside until shaking stops\n\n**After shaking stops:**\n1. Check yourself and others for injury\n2. Gas smell → evacuate building (see gas leak protocol)\n3. Check for structural damage before moving around\n4. Expect aftershocks — another drop/cover ready\n5. Do NOT use elevators\n6. Listen to emergency broadcasts for instructions\n7. Text instead of call — networks are overloaded\n\n**Avoid:**\n- Damaged buildings\n- Downed power lines\n- Areas near rivers/coast (tsunami risk after major quake)\n- Using generators/grills indoors after power failure`},
    // Power / communications
    { k:['generator','solar','battery','charge phone','power bank','communication','radio setup','stay in touch','family contact','out of contact'],
      r:`⚡ POWER & COMMUNICATIONS IN A CRISIS\n\n**Power priorities:**\n1. Medical devices (CPAP, insulin fridge) — first protected\n2. Communication (phone, radio)\n3. Lighting\n4. Heating/cooling\n\n**Charging without grid:**\n- Car charger: engine running, charge via 12V outlet. 30 min = 20–30% phone charge. Keep fuel in mind.\n- Solar panel (even basic 20W): charges phone in 2–4h direct sun.\n- Hand-crank radio/charger: emergency use only — 1 min cranking ≈ 2 min radio.\n- Battery banks: a 20,000 mAh bank charges a phone ~5 times.\n\n**Communication priorities:**\n1. Texts before calls — texts route through congested networks more reliably.\n2. Social media check-in features (Facebook Safety Check, Google Crisis).\n3. Out-of-area contact: designate one person outside the disaster zone as the family relay.\n4. NOAA Weather Radio (162.400–162.550 MHz) — continuous broadcast, battery-powered.\n5. Shortwave/ham: for regional communication when cell towers are down.\n\n**When all else fails:**\n- Written note left at home (where I went, when I left, route taken)\n- Pre-arranged meeting point (know it before the crisis)\n- Whistle signals: 1 blast = OK, 3 blasts = help needed`},
  ];

  /* ── Utility functions ───────────────────────────────────── */
  function _setBadge(text, cls) {
    const b = document.getElementById('ai-status-badge');
    if (b) { b.textContent = text; b.className = 'badge ' + (cls || 'badge-muted'); }
  }

  function _setModePill(text, cls) {
    const p = document.getElementById('halo-mode-badge');
    if (p) { p.textContent = text; p.className = 'badge font-xs ai-mode-pill ' + (cls || 'badge-green'); }
  }

  function _setProgress(pct, label, totalMB) {
    const bar = document.getElementById('ai-progress-bar');
    const pctEl = document.getElementById('ai-progress-pct');
    const labelEl = document.getElementById('ai-progress-label');
    const mbEl = document.getElementById('ai-progress-mb');
    if (bar) bar.style.width = Math.min(100, pct) + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    if (labelEl && label) labelEl.textContent = label;
    if (mbEl && totalMB && pct > 0) {
      const downloaded = ((pct / 100) * totalMB).toFixed(0);
      mbEl.textContent = `${downloaded} / ${totalMB} MB`;
    }
  }

  function _getModelSizeMB(modelId) {
    if (!modelId) return 650;
    if (modelId.includes('3B')) return 1800;
    if (modelId.includes('TinyLlama') || modelId.includes('1.1B')) return 580;
    return 650; // 1B default
  }

  /* Basic markdown renderer — safe (no innerHTML from user input, only
     used for HALO's own responses after XSS-safe textContent extraction) */
  function _renderMarkdown(text) {
    // Escape any HTML in text first (defensive, since HALO Lite responses
    // are hardcoded, but HALO+ could echo user content)
    const esc = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Split into blocks separated by blank lines first to handle paragraphs vs lists
    const lines = esc.split('\n');
    const out = [];
    let inList = false;
    let listOrdered = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Bold: **text** or __text__
      const processed = line
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>');

      const orderedMatch = processed.match(/^(\d+)\. (.+)/);
      const indentBullet = processed.match(/^   [•\-] (.+)/);  // indented sub-bullets (check before top-level)
      const bulletMatch = !indentBullet && processed.match(/^[•\-] (.+)/);

      if (indentBullet) {
        if (!inList) { out.push('<ul style="margin:4px 0 4px 18px;padding:0">'); inList = true; listOrdered = false; }
        out.push(`<li style="margin:2px 0;margin-left:12px">${indentBullet[1]}</li>`);
      } else if (orderedMatch) {
        if (!inList) { out.push('<ol style="margin:4px 0 4px 18px;padding:0">'); inList = true; listOrdered = true; }
        out.push(`<li style="margin:2px 0">${orderedMatch[2]}</li>`);
      } else if (bulletMatch) {
        if (!inList) { out.push('<ul style="margin:4px 0 4px 18px;padding:0">'); inList = true; listOrdered = false; }
        out.push(`<li style="margin:2px 0">${bulletMatch[1]}</li>`);
      } else {
        if (inList) { out.push(listOrdered ? '</ol>' : '</ul>'); inList = false; }
        if (processed === '') {
          out.push('<br>');
        } else {
          out.push(processed);
          out.push('<br>');
        }
      }
    }
    if (inList) { out.push(listOrdered ? '</ol>' : '</ul>'); }

    return out.join('\n');
  }

  function _formatTime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function _appendMsg(role, rawText, extraClass = '') {
    const container = document.getElementById('ai-messages');
    if (!container) return null;
    const div = document.createElement('div');
    const cls = role === 'user' ? 'ai-msg-user' : role === 'system' ? 'ai-msg-sys' : 'ai-msg-ai';
    div.className = 'ai-msg ' + cls + (extraClass ? ' ' + extraClass : '');

    if (role === 'assistant' && !extraClass.includes('thinking')) {
      // Render markdown for AI responses
      div.innerHTML = _renderMarkdown(rawText);
      // Add timestamp
      const ts = document.createElement('div');
      ts.className = 'ai-msg-ts';
      ts.textContent = 'ARKai · ' + _formatTime();
      div.appendChild(ts);
      // Add copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'ai-copy-btn';
      copyBtn.textContent = '⎘ Copy';
      copyBtn.setAttribute('aria-label', 'Copy response');
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(rawText).then(() => {
          copyBtn.textContent = '✓ Copied';
          setTimeout(() => { copyBtn.textContent = '⎘ Copy'; }, 1500);
        }).catch(() => {
          // Fallback for older browsers
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(div);
          sel.removeAllRanges();
          sel.addRange(range);
          try { document.execCommand('copy'); copyBtn.textContent = '✓ Copied'; setTimeout(() => { copyBtn.textContent = '⎘ Copy'; }, 1500); } catch(_) {}
          sel.removeAllRanges();
        });
      };
      div.appendChild(copyBtn);
    } else if (role === 'assistant' && extraClass.includes('thinking')) {
      // Thinking bubble: animated dots via CSS ::after
      div.textContent = 'Thinking';
    } else if (role === 'system') {
      div.textContent = rawText;
      div.style.whiteSpace = 'pre-wrap';
    } else {
      // User messages — safe textContent
      div.textContent = rawText;
      div.style.whiteSpace = 'pre-wrap';
      // Add timestamp for user messages too
      const ts = document.createElement('div');
      ts.className = 'ai-msg-ts ai-msg-ts-user';
      ts.textContent = 'You · ' + _formatTime();
      div.appendChild(ts);
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  /* ── Context badge helpers ───────────────────────────────── */
  function _updateCtxBadges() {
    const row = document.getElementById('ai-ctx-badges');
    if (!row) return;
    row.innerHTML = '';
    const labels = { medical:'💊 Medical', inventory:'📦 Inventory', household:'🏘️ Household', situation:'⚠️ Situation' };
    for (const [key, label] of Object.entries(labels)) {
      const span = document.createElement('span');
      span.className = 'ai-ctx-badge' + (_injectedCtx[key] ? ' active' : '');
      span.textContent = label;
      row.appendChild(span);
    }
  }

  /* ── History persistence ─────────────────────────────────── */
  function _saveHistory() {
    // Use Store wrapper so private-browsing fallback and quota handling are respected
    Store.set(HISTORY_KEY, _history.slice(-MAX_HISTORY));
    Store.set(CTX_KEY, _injectedCtx);
  }

  function _loadHistory() {
    try {
      const h = Store.get(HISTORY_KEY, null);
      if (Array.isArray(h)) _history = h;
      const c = Store.get(CTX_KEY, null);
      if (c && typeof c === 'object') _injectedCtx = c;
    } catch(_) { _history = []; _injectedCtx = {}; }
  }

  /* ── Restore persisted chat into DOM ─────────────────────── */
  function _restoreChat() {
    _loadHistory();
    if (!_history.length) return;
    const container = document.getElementById('ai-messages');
    if (!container) return;
    // Clear the static welcome message
    container.innerHTML = '';
    for (const msg of _history) {
      if (msg.role === 'user' && msg.content.startsWith('[CONTEXT')) continue; // skip injected ctx
      if (msg.role === 'assistant' || msg.role === 'user') {
        _appendMsg(msg.role, msg.content);
      }
    }
    _updateCtxBadges();
  }

  /* ── HALO Lite: pattern match ────────────────────────────── */
  function _liteResponse(query) {
    const q = query.toLowerCase();
    // Find best matching KB entry (keyword score)
    let best = null, bestScore = 0;
    for (const entry of KB) {
      let score = 0;
      for (const kw of entry.k) {
        if (q.includes(kw)) score += kw.length; // longer match = more specific
      }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    if (bestScore > 0 && best) return best.r;

    // Fallback generic responses
    if (/\b(hello|hi|hey|help)\b/.test(q)) {
      return "👋 Hello! I'm HALO — your offline crisis assistant. Ask me about:\n• First aid, CPR & choking\n• Water purification & dehydration\n• Wounds, burns & bleeding control\n• Heart attack & stroke\n• Shock, hypothermia & frostbite\n• Heat stroke & heat exhaustion\n• Anaphylaxis & severe allergies\n• Broken bones & dislocations\n• Snake & animal bites, poisoning\n• Gas leaks & carbon monoxide\n• Emergency shelter & fire starting\n• Signaling for rescue & navigation\n• Evacuation & disaster protocols\n• Earthquake response\n• Psychological first aid\n\nOr inject your household/inventory context using the buttons above for personalized guidance.";
    }
    if (_injectedCtx.medical && /\b(blood|medication|med|allerg|condition|health)\b/.test(q)) {
      return `📋 Based on your household medical data:\n\n${_injectedCtx.medical}\n\nFor specific medical advice in an emergency, call 911 or poison control (1-800-222-1222).`;
    }
    if (_injectedCtx.inventory && /\b(inventory|stock|supply|run out|low|have|water|food)\b/.test(q)) {
      return `📦 Based on your current inventory:\n\n${_injectedCtx.inventory}\n\nPrioritize replenishing low-stock items before a crisis develops.`;
    }
    if (_injectedCtx.household && /\b(household|family|member|people|who|how many)\b/.test(q)) {
      return `🏘️ Based on your household data:\n\n${_injectedCtx.household}\n\nMake sure everyone knows your evacuation plan and rally point.`;
    }
    if (_injectedCtx.situation && /\b(situation|status|alert|current|level|now)\b/.test(q)) {
      return `⚠️ Current situation context:\n\n${_injectedCtx.situation}\n\nAdjust your preparedness actions to match your alert level.`;
    }

    // Check if context is loaded and query might relate to it
    const ctxKeys = Object.keys(_injectedCtx).filter(k => _injectedCtx[k]);
    const ctxNote = ctxKeys.length > 0 ? `\n\nNote: You have ${ctxKeys.join(', ')} context loaded. I'll factor it into relevant answers.` : '';

    return `I don't have a specific answer for "${query}" in my offline knowledge base.\n\nTopics I can help with right now:\n• Water purification & dehydration\n• CPR, choking & cardiac arrest\n• Wound care, burns & bleeding control\n• Heart attack, stroke & anaphylaxis\n• Shock, hypothermia & frostbite\n• Broken bones, dislocations, bites\n• Gas leaks, CO poisoning, earthquake\n• Emergency shelter & fire starting\n• Signaling for rescue & Morse code\n• Evacuation & disaster protocols\n• Psychological first aid & morale${ctxNote}\n\nFor a full AI model that can answer anything: use the HALO+ upgrade card below (requires internet once to download).`;
  }

  /* ── Load WebLLM model (HALO+) ───────────────────────────── */
  async function load() {
    if (_loading || _engine) return;
    _loading = true;

    if (!navigator.gpu) {
      Toast.show('WebGPU not supported — use Chrome 113+ or Edge 113+. HALO Lite still works!', 'warning', 6000);
      _setBadge('WebGPU not supported', 'badge-red');
      _loading = false;
      return;
    }

    const modelId = document.getElementById('ai-model-select')?.value || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    const btn = document.getElementById('ai-load-btn');
    if (btn) btn.disabled = true;

    const modelSizeMB = _getModelSizeMB(modelId);
    const progressRow = document.getElementById('ai-progress-row');
    if (progressRow) progressRow.classList.remove('hidden');
    _setBadge('Downloading…', 'badge-yellow');
    _setProgress(0, `Downloading AI model (~${modelSizeMB >= 1000 ? (modelSizeMB/1000).toFixed(1)+'GB' : modelSizeMB+'MB'})… This only happens once.`);

    try {
      const webllm = await import(WEBLLM_CDN);
      _setProgress(5, 'Model library ready. Downloading weights…', modelSizeMB);

      _engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (p) => {
          const pct = Math.round((p.progress || 0) * 100);
          _setProgress(pct, p.text || 'Loading…', modelSizeMB);
          _setBadge('Loading ' + pct + '%', 'badge-yellow');
        }
      });

      _setProgress(100, 'Model ready!');
      _setBadge('✓ HALO+', 'badge-green');
      _setModePill('✓ HALO+ — Llama active', 'badge-green');
      progressRow?.classList.add('hidden');
      document.getElementById('ai-upgrade-card')?.classList.add('hidden');
      Toast.show('🤖 HALO+ loaded — full Llama AI active!', 'success', 3000);
      _appendMsg('system', '🧠 HALO+ is now active — running Llama 3.2 fully on your device. I can answer anything now.');
    } catch (err) {
      console.error('ARKai load error:', err);
      _setBadge('Load failed', 'badge-red');
      _setModePill('✓ HALO Lite — offline ready', 'badge-green');
      _setProgress(0, 'Download failed');
      const friendly = err && err.message
        ? (err.message.length > 120 ? err.message.slice(0, 120) + '…' : err.message)
        : 'Unknown error';
      Toast.show('⚠️ Model load failed — HALO Lite is still active. (' + friendly + ')', 'error', 6000);
      _appendMsg('system', '⚠️ HALO+ failed to load. HALO Lite is still fully active — ask me anything about first aid, water, fire, survival, navigation, or emergencies.');
      if (btn) btn.disabled = false;
    }
    _loading = false;
  }

  /* ── Input change — enable/disable send button ───────────── */
  function onInputChange(el) {
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = !el.value.trim();
  }

  /* ── Send message ────────────────────────────────────────── */
  async function send() {
    const input = document.getElementById('ai-input');
    const text = input?.value.trim();
    if (!text) return;

    input.value = '';
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    _appendMsg('user', text);
    _history.push({ role: 'user', content: text });
    // Cap history to prevent unbounded memory growth (keep last 40 turns)
    if (_history.length > MAX_HISTORY) _history = _history.slice(-MAX_HISTORY);

    if (_engine) {
      // HALO+ — full LLM
      const thinking = _appendMsg('assistant', '', 'thinking');
      let reply = '';
      try {
        // Build system prompt with any injected context
        const ctxParts = [];
        if (_injectedCtx.household) ctxParts.push(`HOUSEHOLD: ${_injectedCtx.household}`);
        if (_injectedCtx.medical) ctxParts.push(`MEDICAL: ${_injectedCtx.medical}`);
        if (_injectedCtx.inventory) ctxParts.push(`SUPPLIES: ${_injectedCtx.inventory}`);
        if (_injectedCtx.situation) ctxParts.push(`SITUATION: ${_injectedCtx.situation}`);
        const ctxBlock = ctxParts.length ? `\n\nUSER CONTEXT (use this when relevant):\n${ctxParts.join('\n\n')}` : '';
        const sysPrompt = `You are HALO, the AI assistant in ARK Crisis Suite — an offline emergency preparedness app. You run on the user's device with no internet. Be concise and practical. Prioritize life-safety. For immediate danger, tell them to call 911 if possible. Answer in plain language suitable for a stressful crisis situation.${ctxBlock}`;
        const messages = [{ role:'system', content: sysPrompt }, ..._history.filter(m => !m.content.startsWith('[CONTEXT')).slice(-10)];
        const stream = await _engine.chat.completions.create({ messages, stream: true, temperature: 0.7, max_tokens: 512 });
        const streamTs = _formatTime();
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          reply += delta;
          if (thinking) {
            thinking.classList.remove('thinking');
            thinking.innerHTML = _renderMarkdown(reply);
            // Add timestamp if not present
            if (!thinking.querySelector('.ai-msg-ts')) {
              const ts = document.createElement('div');
              ts.className = 'ai-msg-ts';
              ts.textContent = 'ARKai · ' + streamTs;
              thinking.appendChild(ts);
            }
            // Re-add copy button if not present
            if (!thinking.querySelector('.ai-copy-btn')) {
              const cb = document.createElement('button');
              cb.className = 'ai-copy-btn'; cb.textContent = '⎘ Copy'; cb.setAttribute('aria-label','Copy response');
              cb.onclick = () => navigator.clipboard.writeText(reply).then(() => { cb.textContent='✓ Copied'; setTimeout(()=>{cb.textContent='⎘ Copy';},1500); }).catch(()=>{});
              thinking.appendChild(cb);
            }
          }
          const c = document.getElementById('ai-messages');
          if (c) c.scrollTop = c.scrollHeight;
        }
        _history.push({ role:'assistant', content: reply });
        _saveHistory();
      } catch (err) {
        const errMsg = err && err.message
          ? (err.message.length > 200 ? err.message.slice(0, 200) + '…' : err.message)
          : 'Generation failed — please try again.';
        if (thinking) {
          thinking.classList.remove('thinking');
          thinking.textContent = '⚠️ ' + errMsg;
        }
        if (reply && _history[_history.length-1]?.role === 'user') {
          _history.push({ role: 'assistant', content: reply || '[error]' });
          _saveHistory();
        }
        if (sendBtn) sendBtn.disabled = false;
        document.getElementById('ai-input')?.focus();
        return;
      }
    } else {
      // HALO Lite — knowledge base, with thinking indicator
      const thinking = _appendMsg('assistant', '', 'thinking');
      const reply = _liteResponse(text);
      const liteTs = _formatTime();
      setTimeout(() => {
        if (thinking) {
          thinking.classList.remove('thinking');
          thinking.innerHTML = _renderMarkdown(reply);
          // Add timestamp
          const ts = document.createElement('div');
          ts.className = 'ai-msg-ts';
          ts.textContent = 'ARKai · ' + liteTs;
          thinking.appendChild(ts);
          // Add copy button
          const cb = document.createElement('button');
          cb.className = 'ai-copy-btn'; cb.textContent = '⎘ Copy'; cb.setAttribute('aria-label','Copy response');
          cb.onclick = () => navigator.clipboard.writeText(reply).then(() => { cb.textContent='✓ Copied'; setTimeout(()=>{cb.textContent='⎘ Copy';},1500); }).catch(()=>{});
          thinking.appendChild(cb);
          const c = document.getElementById('ai-messages');
          if (c) c.scrollTop = c.scrollHeight;
        }
        _history.push({ role:'assistant', content: reply });
        _saveHistory();
        if (sendBtn) sendBtn.disabled = false;
        document.getElementById('ai-input')?.focus();
      }, 220); // small delay feels more natural
      return;
    }

    if (sendBtn) sendBtn.disabled = false;
    document.getElementById('ai-input')?.focus();
  }

  function quickPrompt(btn) {
    const text = btn.textContent.trim();
    const input = document.getElementById('ai-input');
    if (input) {
      input.value = text;
      input.focus();
      // Manually enable the send button (programmatic value set doesn't fire oninput)
      const sendBtn = document.getElementById('ai-send-btn');
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  function injectContext(type) {
    let ctx = '';
    if (type === 'medical') {
      const hh = Store.get('hh_members', []);
      const meds = hh.flatMap(m => {
        const parts = [];
        if (m.conditions) parts.push(`${m.name} (conditions): ${m.conditions}`);
        if (m.meds && m.meds.length) m.meds.forEach(med => parts.push(`${m.name} (med): ${med}`));
        return parts;
      });
      const allergies = hh.flatMap(m => m.allergies ? [`${m.name}: ${m.allergies}`] : []);
      const blood = hh.filter(m => m.bloodType||m.blood).map(m => `${m.name}: ${m.bloodType||m.blood}`);
      ctx = `Blood types: ${blood.join(', ')||'unknown'}\nMedications/Conditions: ${meds.join('; ')||'none'}\nAllergies: ${allergies.join('; ')||'none'}`;
      _injectedCtx.medical = ctx;
    } else if (type === 'inventory') {
      const r = Store.get('resources', null);
      if (r) {
        const lines = [
          r.water   ? `Water: ${r.water} gal`         : null,
          r.food    ? `Food: ${r.food} days`           : null,
          r.fuel    ? `Fuel: ${r.fuel} gal`            : null,
          r.medical ? `Medical supplies: ${r.medical}/5` : null,
          r.shelter ? `Shelter capacity: ${r.shelter} ppl` : null,
          r.power   ? `Power: ${r.power} hrs`          : null,
        ].filter(Boolean);
        ctx = lines.join('\n') || 'No resources recorded.';
        if (r.notes) ctx += `\nNotes: ${r.notes}`;
      } else {
        ctx = 'No inventory data saved yet.';
      }
      _injectedCtx.inventory = ctx;
    } else if (type === 'household') {
      const hh = Store.get('hh_members', []);
      const hhd = Store.get('household', {});
      const memberLines = hh.map(m=>`- ${m.name||'?'} (${m.role||'member'}${m.age?' age '+m.age:''}${m.bloodType?' blood '+m.bloodType:''}${m.allergies?' allergies: '+m.allergies:''}${m.conditions?' — '+m.conditions:''}${m.needs?' needs: '+m.needs:''})`).join('\n');
      ctx = `Household: ${hhd.name||'unnamed'}\nHousehold ID: ${Store.get('hh_id','?')}\nMembers (${hh.length}):\n${memberLines||'(none)'}`;
      if (hhd.needs) ctx += `\nSpecial needs: ${hhd.needs}`;
      if (hhd.meet1) ctx += `\nMeeting point 1: ${hhd.meet1}`;
      if (hhd.meet2) ctx += `\nMeeting point 2: ${hhd.meet2}`;
      if (hhd.evac) ctx += `\nEvacuation destination: ${hhd.evac}`;
      if (hhd.ooaName) ctx += `\nOut-of-area contact: ${hhd.ooaName}${hhd.ooaRel?' ('+hhd.ooaRel+')':''} ${hhd.ooaPhone||''}`;
      if (hhd.pets) ctx += `\nPets: ${hhd.pets}`;
      _injectedCtx.household = ctx;
    } else if (type === 'situation') {
      const level = Store.get('alert_level', 1);
      const labels = {1:'Normal',2:'Elevated',3:'High Alert',4:'Crisis',5:'Critical'};
      const gps = Store.get('last_gps');
      const mp = Store.get('missing_persons', []);
      ctx = `Alert: ${labels[level]||level}\nGPS: ${gps?`${gps.lat.toFixed(4)},${gps.lon.toFixed(4)}`:'unknown'}\nMissing persons: ${mp.length}`;
      _injectedCtx.situation = ctx;
    }
    if (!ctx) return;
    _history.push({ role:'user', content: `[CONTEXT — ${type}]\n${ctx}` });
    if (_engine) _history.push({ role:'assistant', content: `Context received. I'll use that in my responses.` });
    _appendMsg('user', `📋 ${type.charAt(0).toUpperCase()+type.slice(1)} context loaded`);
    if (!_engine) _appendMsg('assistant', `✓ Context saved. Ask me anything — I'll factor it in.`);
    _updateCtxBadges();
    _saveHistory();
    Toast.show('Context injected ✓', 'success', 1500);
  }

  function clearChat() {
    _history = [];
    _injectedCtx = {};
    Store.del(HISTORY_KEY);
    Store.del(CTX_KEY);
    const container = document.getElementById('ai-messages');
    if (container) {
      container.innerHTML = '';
      _appendMsg('system', '👋 Chat cleared. I\'m HALO — ask me anything about first aid, survival, water, fire, signals, or emergencies.');
    }
    _updateCtxBadges();
  }

  /* ── Init — called on DOMContentLoaded ───────────────────── */
  function init() {
    _restoreChat();
    _setModePill('✓ HALO Lite — offline ready', 'badge-green');
    // Ensure send button reflects current input state
    const input = document.getElementById('ai-input');
    if (input) input.addEventListener('input', () => onInputChange(input));
  }

  return { load, send, quickPrompt, injectContext, clearChat, onInputChange, init };
})();

// === GLOBAL ERROR CAPTURE for bug reports ===
window._arkErrors = window._arkErrors || []; // preserve existing buffer on script re-eval
window.addEventListener('error', e => {
  const entry = { msg: e.message, src: (e.filename || '').split('/').pop(), line: e.lineno, stack: (e.error && e.error.stack ? e.error.stack.substring(0, 500) : ''), ts: Date.now() };
  window._arkErrors.push(entry);
  if (window._arkErrors.length > 20) window._arkErrors.shift();
});
window.addEventListener('unhandledrejection', e => {
  const reason = e.reason;
  const entry = { msg: String(reason || 'Promise rejection'), stack: (reason && reason.stack ? reason.stack.substring(0, 500) : ''), ts: Date.now() };
  window._arkErrors.push(entry);
  if (window._arkErrors.length > 20) window._arkErrors.shift();
});

document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  Checklist.init();
  ARKai.init();
  if (typeof MissingPersons !== 'undefined') MissingPersons.init();
  Hub.updateSyncDisplay();

  // Load persisted alert level
  UI.renderAlertLevel(Store.get('alert_level', 1));

  // Pre-fill alias
  const aliasInputs = document.querySelectorAll('#msg-alias');
  const savedAlias = Store.get('last_alias', '');
  aliasInputs.forEach(el => { if (savedAlias) el.value = savedAlias; });

  // Apply persisted settings
  const fontSize = Store.get('font_size', 16);
  document.documentElement.style.fontSize = fontSize + 'px';
  if (Store.get('high_contrast', false)) Settings.applyContrast();
  if (Store.get('low_power', false)) document.documentElement.classList.add('low-power');
  if (Store.get('dark_mode', false)) Settings.applyDarkMode();

  // Start hub sync
  Hub.startAutoSync();

  // Auto-hub: if no external hub is configured, first opener becomes the hub
  SoftHub.init();

  // === AUTO-DISCOVERY ===
  // After a short delay (let SoftHub settle), start discovery:
  // - announce ourselves to other open ARK tabs/windows
  // - listen for nearby hubs and show a "Join →" banner if one found
  setTimeout(() => {
    SoftHub.startDiscovery();
    // Also kick off IP detection so we can broadcast our address
    Network.detectLocalIP().then(ip => {
      if (ip) {
        // If we're the hub, re-broadcast with our IP
        setTimeout(() => {
          if (SoftHub.isHub()) SoftHub.startDiscovery();
        }, 500);
      }
    });
  }, 2000);

  // Check for first run — show onboarding wizard
  if (!Store.get('first_run_done')) {
    // Only generate a new hh_id if one doesn't already exist (preserves imported backups)
    if (!Store.get('hh_id')) Store.set('hh_id', generateID());
    document.getElementById('set-hh-id') && (document.getElementById('set-hh-id').value = Store.get('hh_id'));
    // Slight delay so the UI finishes rendering before overlay appears
    setTimeout(() => Onboarding.start(), 300);
  }

  // Register service worker
  registerSW();

  // Resources initial render
  Resources.render();
  Guides.init();
  Radio.init();

  // W20: Init new modules
  FreqLog.render();
  HomeStats.render();
  Settings.checkBackupReminder();

  // W20: Refresh home stats every 30s so board stays current (skip when tab is hidden)
  setInterval(() => { if (!document.hidden) HomeStats.render(); }, 30000);

  // Auto-patch check: silent check on startup, then every 2 hours
  Network.initPatchCheck();
});

// PWA install prompt
let _deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstall = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = '';
  const row = document.getElementById('pwa-install-row');
  if (row) row.style.display = '';
});
// Hide the install banner once the app has been installed
window.addEventListener('appinstalled', () => {
  _deferredInstall = null;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'none';
});
function installPWA() {
  if (!_deferredInstall) return;
  _deferredInstall.prompt();
  _deferredInstall.userChoice.then(() => { _deferredInstall = null; });
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'none';
}

// Handle beforeunload to save any pending data
window.addEventListener('beforeunload', () => {
  // Settings auto-save
  const alias = document.getElementById('msg-alias');
  if (alias && alias.value.trim()) Store.set('last_alias', alias.value.trim());
});

// Bottom tab bar sync — keep it in sync with the top nav
(function(){
  function syncBTB(tab){
    document.querySelectorAll('.btb-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab===tab);
    });
  }
  document.querySelectorAll('.btb-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const t = btn.dataset.tab;
      if(t && window.UI) UI.switchTab(t);
    });
  });
  // Patch into tab switch
  const origSwitch = window.UI && UI.switchTab;
  if(origSwitch){
    UI.switchTab = function(tab,...args){
      origSwitch.call(this,tab,...args);
      syncBTB(tab);
    };
  }
  // Initial sync
  const active = document.querySelector('.nav-btn.active');
  if(active) syncBTB(active.dataset.tab||'home');
})();
</script>

<!-- BOTTOM TAB BAR -->
<nav id="bottom-tab-bar" aria-label="Quick navigation">
  <button class="btb-btn active" data-tab="home" aria-label="Home">
    <span class="btb-icon">🏠</span>
    <span>Home</span>
  </button>
  <button class="btb-btn" data-tab="messages" aria-label="Messages">
    <span class="btb-icon">💬</span>
    <span>Messages</span>
    <span class="btb-badge" id="btb-msg-badge"></span>
  </button>
  <button class="btb-btn" data-tab="survival" aria-label="Guides">
    <span class="btb-icon">📚</span>
    <span>Guides</span>
  </button>
  <button class="btb-btn" data-tab="ai" aria-label="AI">
    <span class="btb-icon">🤖</span>
    <span>AI</span>
  </button>
  <button class="btb-btn" data-tab="settings" aria-label="More">
    <span class="btb-icon">⚙️</span>
    <span>More</span>
  </button>
</nav>

</body>
</html>
