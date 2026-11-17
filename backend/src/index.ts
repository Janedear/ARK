/**
 * ARK Crisis Suite Backend — Cloudflare Worker
 *
 * Routes:
 *   POST /halo/bugs                       — receive bug report from ARK
 *   GET  /halo/patches/latest.json        — serve active patch (or 204)
 *
 * Admin (requires X-Admin-Secret header):
 *   GET  /admin/bugs                      — list all bug reports (JSON)
 *   GET  /admin/bugs/:id                  — get single bug report
 *   POST /admin/bugs/:id/status           — update bug status
 *   GET  /admin/patches                   — list all patches
 *   POST /admin/patches                   — create/update a patch
 *   POST /admin/patches/:id/publish       — activate a patch
 *   POST /admin/patches/:id/deactivate    — deactivate a patch
 *   DELETE /admin/patches/:id             — delete a patch
 *   GET  /admin                           — admin dashboard HTML UI
 */

export interface Env {
  ARK_KV: KVNamespace;
  ADMIN_SECRET: string;
  SENDGRID_API_KEY?: string;
  BUG_NOTIFY_EMAIL?: string;
}

// ─── CORS helpers ────────────────────────────────────────────────────────────

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Secret, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function corsResponse(body: string | null, init: ResponseInit, origin = "*"): Response {
  const headers = new Headers(init.headers || {});
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));
  return new Response(body, { ...init, headers });
}

function json(data: unknown, status = 200): Response {
  return corsResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// ─── KV key helpers ──────────────────────────────────────────────────────────

const BUG_PREFIX = "bug:";
const PATCH_PREFIX = "patch:";
const ACTIVE_PATCH_KEY = "active_patch_id";

function bugKey(id: string) { return `${BUG_PREFIX}${id}`; }
function patchKey(id: string) { return `${PATCH_PREFIX}${id}`; }

function nanoid(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface BugReport {
  id: string;
  schema?: string;
  ts: string;
  app_version?: string;
  patch_level?: string;
  ua?: string;
  online?: boolean;
  hub_connected?: boolean;
  soft_hub_role?: string;
  active_tab?: string;
  bug: string;
  recent_errors?: unknown[];
  status: "new" | "reviewing" | "patched" | "wontfix" | "duplicate";
  patch_id?: string;
  notes?: string;
  received_at: string;
}

interface PatchOp {
  action: string;
  [key: string]: unknown;
}

interface Patch {
  id: string;
  version: string;
  min_app_version?: string;
  summary: string;
  patches: PatchOp[];
  is_active: boolean;
  bug_report_ids?: string[];
  published_at?: string;
  created_at: string;
}

// ─── Email via SendGrid ───────────────────────────────────────────────────────

async function sendBugEmail(env: Env, bug: BugReport): Promise<void> {
  if (!env.SENDGRID_API_KEY) return;
  const to = env.BUG_NOTIFY_EMAIL || "hello@halosuite.ai";

  const html = `
    <h2>🐛 New ARK Bug Report — ${bug.id}</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td style="padding:4px 12px;font-weight:bold">Bug</td><td style="padding:4px 12px">${escHtml(bug.bug)}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold">Time</td><td style="padding:4px 12px">${bug.ts}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold">Version</td><td style="padding:4px 12px">${bug.app_version ?? "?"}  (patch: ${bug.patch_level ?? "none"})</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold">Tab</td><td style="padding:4px 12px">${bug.active_tab ?? "?"}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold">Online</td><td style="padding:4px 12px">${bug.online ? "✅" : "❌"}  Hub: ${bug.hub_connected ? "✅" : "❌"}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold">UA</td><td style="padding:4px 12px">${escHtml(bug.ua ?? "")}</td></tr>
    </table>
    ${bug.recent_errors?.length ? `<h3>Recent Errors</h3><pre style="background:#f4f4f4;padding:12px;border-radius:6px">${escHtml(JSON.stringify(bug.recent_errors, null, 2))}</pre>` : ""}
    <p style="color:#888;font-size:12px">ARK Backend · ${new Date().toISOString()}</p>
  `;

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "noreply@halosuite.ai", name: "ARK Backend" },
      subject: `[ARK Bug] ${bug.bug.slice(0, 80)}`,
      content: [{ type: "text/html", value: html }],
    }),
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Allowed patch actions (XSS guard) ───────────────────────────────────────

const ALLOWED_PATCH_ACTIONS = new Set([
  "replace_html", "set_text", "set_attr", "set_class",
  "store_set", "store_delete", "store_clear",
  "run_js", "show_toast", "reload",
]);

function validatePatchOps(ops: PatchOp[]): string | null {
  for (const op of ops) {
    if (!ALLOWED_PATCH_ACTIONS.has(op.action)) {
      return `Disallowed patch action: ${op.action}`;
    }
  }
  return null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAdmin(req: Request, env: Env): boolean {
  const secret = req.headers.get("X-Admin-Secret") || req.headers.get("Authorization")?.replace("Bearer ", "");
  return !!secret && secret === env.ADMIN_SECRET;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

// POST /halo/bugs
async function receiveBug(req: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  if (!body.bug || typeof body.bug !== "string") {
    return err("Missing required field: bug");
  }

  const bug: BugReport = {
    id: nanoid(),
    schema: (body.schema as string) || "1.0",
    ts: (body.ts as string) || new Date().toISOString(),
    app_version: body.appVersion as string | undefined,
    patch_level: body.patchLevel as string | undefined,
    ua: body.ua as string | undefined,
    online: body.online as boolean | undefined,
    hub_connected: body.hubConnected as boolean | undefined,
    soft_hub_role: body.softHubRole as string | undefined,
    active_tab: body.activeTab as string | undefined,
    bug: (body.bug as string).slice(0, 2000),
    recent_errors: (body.recentErrors as unknown[]) || [],
    status: "new",
    received_at: new Date().toISOString(),
  };

  await env.ARK_KV.put(bugKey(bug.id), JSON.stringify(bug), {
    metadata: { ts: bug.received_at, status: bug.status },
  });

  // Fire-and-forget email
  env.SENDGRID_API_KEY && sendBugEmail(env, bug).catch(() => {});

  return json({ ok: true, id: bug.id }, 201);
}

// GET /halo/patches/latest.json
async function serveLatestPatch(env: Env): Promise<Response> {
  const activeId = await env.ARK_KV.get(ACTIVE_PATCH_KEY);
  if (!activeId) {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders("*"),
        "Cache-Control": "public, max-age=120, stale-while-revalidate=60",
      },
    });
  }

  const patchRaw = await env.ARK_KV.get(patchKey(activeId));
  if (!patchRaw) {
    return new Response(null, { status: 204, headers: corsHeaders("*") });
  }

  const patch: Patch = JSON.parse(patchRaw);
  const payload = {
    version: patch.version,
    minAppVersion: patch.min_app_version,
    summary: patch.summary,
    patches: patch.patches,
  };

  return corsResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=120",
    },
  });
}

// GET /admin/bugs
async function listBugs(env: Env): Promise<Response> {
  const list = await env.ARK_KV.list({ prefix: BUG_PREFIX });
  const bugs: BugReport[] = [];
  for (const key of list.keys) {
    const raw = await env.ARK_KV.get(key.name);
    if (raw) bugs.push(JSON.parse(raw));
  }
  bugs.sort((a, b) => (b.received_at > a.received_at ? 1 : -1));
  return json(bugs);
}

// GET /admin/bugs/:id
async function getBug(id: string, env: Env): Promise<Response> {
  const raw = await env.ARK_KV.get(bugKey(id));
  if (!raw) return err("Not found", 404);
  return json(JSON.parse(raw));
}

// POST /admin/bugs/:id/status
async function updateBugStatus(id: string, req: Request, env: Env): Promise<Response> {
  const raw = await env.ARK_KV.get(bugKey(id));
  if (!raw) return err("Not found", 404);
  const bug: BugReport = JSON.parse(raw);

  let body: { status?: string; notes?: string; patch_id?: string };
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  if (body.status) bug.status = body.status as BugReport["status"];
  if (body.notes !== undefined) bug.notes = body.notes;
  if (body.patch_id !== undefined) bug.patch_id = body.patch_id;

  await env.ARK_KV.put(bugKey(id), JSON.stringify(bug));
  return json(bug);
}

// GET /admin/patches
async function listPatches(env: Env): Promise<Response> {
  const list = await env.ARK_KV.list({ prefix: PATCH_PREFIX });
  const patches: Patch[] = [];
  for (const key of list.keys) {
    const raw = await env.ARK_KV.get(key.name);
    if (raw) patches.push(JSON.parse(raw));
  }
  patches.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  return json(patches);
}

// POST /admin/patches — create or update
async function upsertPatch(req: Request, env: Env): Promise<Response> {
  let body: Partial<Patch>;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  if (!body.version) return err("Missing: version");
  if (!body.summary) return err("Missing: summary");
  if (!Array.isArray(body.patches)) return err("Missing: patches (array)");

  const validErr = validatePatchOps(body.patches);
  if (validErr) return err(validErr);

  const id = body.id || nanoid();
  const existing = body.id ? await env.ARK_KV.get(patchKey(id)) : null;
  const prev: Patch | null = existing ? JSON.parse(existing) : null;

  const patch: Patch = {
    id,
    version: body.version,
    min_app_version: body.min_app_version,
    summary: body.summary,
    patches: body.patches,
    is_active: prev?.is_active ?? false,
    bug_report_ids: body.bug_report_ids || prev?.bug_report_ids || [],
    published_at: prev?.published_at,
    created_at: prev?.created_at || new Date().toISOString(),
  };

  await env.ARK_KV.put(patchKey(id), JSON.stringify(patch));
  return json(patch, 201);
}

// POST /admin/patches/:id/publish
async function publishPatch(id: string, env: Env): Promise<Response> {
  const raw = await env.ARK_KV.get(patchKey(id));
  if (!raw) return err("Not found", 404);
  const patch: Patch = JSON.parse(raw);

  // Deactivate any currently active patch
  const currentActiveId = await env.ARK_KV.get(ACTIVE_PATCH_KEY);
  if (currentActiveId && currentActiveId !== id) {
    const prevRaw = await env.ARK_KV.get(patchKey(currentActiveId));
    if (prevRaw) {
      const prev: Patch = JSON.parse(prevRaw);
      prev.is_active = false;
      await env.ARK_KV.put(patchKey(currentActiveId), JSON.stringify(prev));
    }
  }

  patch.is_active = true;
  patch.published_at = new Date().toISOString();
  await env.ARK_KV.put(patchKey(id), JSON.stringify(patch));
  await env.ARK_KV.put(ACTIVE_PATCH_KEY, id);

  return json({ ok: true, active_patch_id: id });
}

// POST /admin/patches/:id/deactivate
async function deactivatePatch(id: string, env: Env): Promise<Response> {
  const raw = await env.ARK_KV.get(patchKey(id));
  if (!raw) return err("Not found", 404);
  const patch: Patch = JSON.parse(raw);
  patch.is_active = false;
  await env.ARK_KV.put(patchKey(id), JSON.stringify(patch));

  const currentActive = await env.ARK_KV.get(ACTIVE_PATCH_KEY);
  if (currentActive === id) await env.ARK_KV.delete(ACTIVE_PATCH_KEY);

  return json({ ok: true });
}

// DELETE /admin/patches/:id
async function deletePatch(id: string, env: Env): Promise<Response> {
  const currentActive = await env.ARK_KV.get(ACTIVE_PATCH_KEY);
  if (currentActive === id) await env.ARK_KV.delete(ACTIVE_PATCH_KEY);
  await env.ARK_KV.delete(patchKey(id));
  return json({ ok: true });
}

// ─── Admin Dashboard HTML ─────────────────────────────────────────────────────

function adminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARK Admin</title>
<style>
  :root{--bg:#f0ebe0;--card:#fffcf6;--accent:#8b6f3e;--accent2:#c4973a;--text:#2c1a0e;--muted:#9b8878;--red:#c0392b;--green:#27ae60;--border:#d4c4a8;--radius:16px;--font:"Inter",system-ui,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh}
  .header{background:var(--card);border-bottom:1px solid var(--border);padding:16px 24px;display:flex;align-items:center;gap:12px}
  .header h1{font-size:20px;font-weight:700;color:var(--accent)}
  .header .pill{background:var(--accent);color:#fff;border-radius:99px;font-size:11px;font-weight:600;padding:3px 10px;text-transform:uppercase;letter-spacing:.05em}
  .main{max-width:1100px;margin:0 auto;padding:24px 16px}
  .tabs{display:flex;gap:4px;margin-bottom:20px;background:var(--card);border-radius:var(--radius);padding:6px;border:1px solid var(--border);width:fit-content}
  .tab{padding:8px 20px;border-radius:12px;border:none;background:transparent;cursor:pointer;font-size:14px;font-weight:500;color:var(--muted);transition:all .15s}
  .tab.active{background:var(--accent);color:#fff}
  .tab:hover:not(.active){background:var(--border)}
  .pane{display:none}.pane.active{display:block}
  .card{background:var(--card);border-radius:var(--radius);border:1px solid var(--border);padding:20px;margin-bottom:12px}
  .card-title{font-weight:700;font-size:15px;margin-bottom:8px}
  .meta{color:var(--muted);font-size:12px;margin-top:4px}
  .badge{display:inline-block;border-radius:99px;font-size:11px;font-weight:600;padding:2px 9px;text-transform:uppercase;letter-spacing:.04em}
  .badge-new{background:#fef3c7;color:#92400e}
  .badge-reviewing{background:#dbeafe;color:#1e40af}
  .badge-patched{background:#d1fae5;color:#065f46}
  .badge-wontfix{background:#fee2e2;color:#991b1b}
  .badge-duplicate{background:#ede9fe;color:#5b21b6}
  .badge-active{background:#d1fae5;color:#065f46}
  .badge-draft{background:#f3f4f6;color:#374151}
  .btn{padding:7px 16px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s}
  .btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{background:var(--accent2)}
  .btn-sm{padding:4px 10px;border-radius:7px;font-size:12px}
  .btn-danger{background:var(--red);color:#fff}
  .btn-success{background:var(--green);color:#fff}
  .input{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--border);font-size:14px;background:var(--bg);color:var(--text);font-family:var(--font);margin-bottom:10px}
  textarea.input{min-height:80px;resize:vertical}
  label{font-size:13px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px}
  .row{display:flex;gap:10px;align-items:center}
  .spacer{flex:1}
  .login-box{max-width:380px;margin:80px auto}
  #patch-json-area{min-height:140px;font-family:monospace;font-size:12px}
  .bug-body{font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
  .section-title{font-size:16px;font-weight:700;margin-bottom:12px;color:var(--accent)}
  .empty{color:var(--muted);text-align:center;padding:40px;font-size:14px}
  .toast{position:fixed;bottom:24px;right:24px;background:#222;color:#fff;border-radius:12px;padding:10px 20px;font-size:14px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:999}
  .toast.show{opacity:1}
  details summary{cursor:pointer;color:var(--accent);font-size:12px;margin-top:6px}
  details pre{font-size:11px;background:var(--bg);padding:8px;border-radius:8px;margin-top:4px;overflow:auto;max-height:200px}
</style>
</head>
<body>
<div class="header">
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill="#8b6f3e"/><text x="14" y="19" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="system-ui">ARK</text></svg>
  <h1>ARK Admin</h1>
  <span class="pill">Backend</span>
  <span class="spacer"></span>
  <button class="btn btn-sm" id="logout-btn" style="display:none" onclick="logout()">Sign Out</button>
</div>

<div class="main">

<!-- Login -->
<div id="login-pane" class="login-box">
  <div class="card">
    <div class="card-title" style="margin-bottom:16px">Admin Sign In</div>
    <label>Admin Secret</label>
    <input type="password" class="input" id="secret-input" placeholder="Enter your admin secret" onkeydown="if(event.key==='Enter')doLogin()">
    <button class="btn btn-primary" style="width:100%" onclick="doLogin()">Sign In</button>
  </div>
</div>

<!-- Dashboard -->
<div id="dashboard-pane" style="display:none">
  <div class="tabs">
    <button class="tab active" onclick="showTab('bugs')">Bug Reports</button>
    <button class="tab" onclick="showTab('patches')">Patches</button>
    <button class="tab" onclick="showTab('new-patch')">+ New Patch</button>
  </div>

  <!-- Bugs pane -->
  <div id="tab-bugs" class="pane active">
    <div class="row" style="margin-bottom:12px">
      <div class="section-title" style="margin-bottom:0">Bug Reports</div>
      <span class="spacer"></span>
      <button class="btn btn-sm btn-primary" onclick="loadBugs()">↻ Refresh</button>
    </div>
    <div id="bugs-list"><div class="empty">Loading…</div></div>
  </div>

  <!-- Patches pane -->
  <div id="tab-patches" class="pane">
    <div class="row" style="margin-bottom:12px">
      <div class="section-title" style="margin-bottom:0">Patches</div>
      <span class="spacer"></span>
      <button class="btn btn-sm btn-primary" onclick="loadPatches()">↻ Refresh</button>
    </div>
    <div id="patches-list"><div class="empty">Loading…</div></div>
  </div>

  <!-- New patch pane -->
  <div id="tab-new-patch" class="pane">
    <div class="card" style="max-width:640px">
      <div class="section-title">Create / Update Patch</div>
      <label>Patch ID (leave blank to auto-generate)</label>
      <input class="input" id="p-id" placeholder="optional">
      <label>Version *</label>
      <input class="input" id="p-version" placeholder="e.g. 1.1.0" required>
      <label>Min App Version</label>
      <input class="input" id="p-minver" placeholder="e.g. 8.7.0">
      <label>Summary *</label>
      <input class="input" id="p-summary" placeholder="Short description of what this patch fixes">
      <label>Patches JSON (array of ops) *</label>
      <textarea class="input" id="patch-json-area" placeholder='[\n  {\n    "action": "set_text",\n    "selector": "#my-element",\n    "text": "Fixed text"\n  }\n]'></textarea>
      <div style="color:var(--muted);font-size:11px;margin-bottom:10px">Allowed actions: replace_html · set_text · set_attr · set_class · store_set · store_delete · store_clear · run_js · show_toast · reload</div>
      <label>Link Bug Report IDs (comma-separated)</label>
      <input class="input" id="p-bugs" placeholder="optional">
      <div class="row">
        <button class="btn btn-primary" onclick="savePatch(false)">Save Draft</button>
        <button class="btn btn-success" onclick="savePatch(true)">Save & Publish</button>
      </div>
    </div>
  </div>
</div>

</div><!-- /main -->
<div class="toast" id="toast"></div>

<script>
let SECRET = '';

function doLogin(){
  const s = document.getElementById('secret-input').value.trim();
  if(!s){toast('Enter your admin secret','red');return;}
  SECRET = s;
  fetch('/admin/bugs',{headers:{'X-Admin-Secret':s}})
    .then(r=>{
      if(r.status===401||r.status===403){toast('Wrong secret','red');SECRET='';return;}
      document.getElementById('login-pane').style.display='none';
      document.getElementById('dashboard-pane').style.display='block';
      document.getElementById('logout-btn').style.display='';
      loadBugs(); loadPatches();
    }).catch(()=>toast('Network error','red'));
}

function logout(){SECRET='';location.reload();}

function showTab(name){
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',['bugs','patches','new-patch'][i]===name));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
}

function loadBugs(){
  fetch('/admin/bugs',{headers:{'X-Admin-Secret':SECRET}})
    .then(r=>r.json())
    .then(bugs=>{
      const el=document.getElementById('bugs-list');
      if(!bugs.length){el.innerHTML='<div class="empty">No bug reports yet</div>';return;}
      el.innerHTML=bugs.map(b=>`
        <div class="card">
          <div class="row">
            <div class="card-title">${esc(b.bug.slice(0,120))}${b.bug.length>120?'…':''}</div>
            <span class="spacer"></span>
            <span class="badge badge-${b.status}">${b.status}</span>
          </div>
          <div class="meta">ID: ${b.id} · ${b.ts||b.received_at} · v${b.app_version||'?'} · Tab: ${b.active_tab||'?'} · Online: ${b.online?'✓':'✗'}</div>
          ${b.notes?`<div style="margin-top:6px;font-size:13px;color:var(--muted)">📝 ${esc(b.notes)}</div>`:''}
          <details><summary>Full report + actions</summary>
          <pre>${esc(JSON.stringify(b,null,2))}</pre>
          <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:6px">
            ${['new','reviewing','patched','wontfix','duplicate'].map(s=>
              `<button class="btn btn-sm" onclick="setBugStatus('${b.id}','${s}')">${s}</button>`).join('')}
          </div>
          </details>
        </div>`).join('');
    });
}

function loadPatches(){
  fetch('/admin/patches',{headers:{'X-Admin-Secret':SECRET}})
    .then(r=>r.json())
    .then(patches=>{
      const el=document.getElementById('patches-list');
      if(!patches.length){el.innerHTML='<div class="empty">No patches yet</div>';return;}
      el.innerHTML=patches.map(p=>`
        <div class="card">
          <div class="row">
            <div class="card-title">v${p.version} — ${esc(p.summary)}</div>
            <span class="spacer"></span>
            <span class="badge ${p.is_active?'badge-active':'badge-draft'}">${p.is_active?'Active':'Draft'}</span>
          </div>
          <div class="meta">ID: ${p.id} · ${p.patches.length} op(s) · ${p.published_at||'not published'}</div>
          <div class="row" style="margin-top:10px;gap:6px">
            ${!p.is_active?`<button class="btn btn-sm btn-success" onclick="publishPatch('${p.id}')">🚀 Publish</button>`:''}
            ${p.is_active?`<button class="btn btn-sm" onclick="deactivatePatch('${p.id}')">⏸ Deactivate</button>`:''}
            <button class="btn btn-sm btn-danger" onclick="deletePatch('${p.id}')">Delete</button>
          </div>
        </div>`).join('');
    });
}

function setBugStatus(id,status){
  fetch('/admin/bugs/'+id+'/status',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Secret':SECRET},body:JSON.stringify({status})})
    .then(()=>{toast('Status updated');loadBugs();});
}

function publishPatch(id){
  fetch('/admin/patches/'+id+'/publish',{method:'POST',headers:{'X-Admin-Secret':SECRET}})
    .then(()=>{toast('Patch published! 🚀');loadPatches();});
}

function deactivatePatch(id){
  fetch('/admin/patches/'+id+'/deactivate',{method:'POST',headers:{'X-Admin-Secret':SECRET}})
    .then(()=>{toast('Patch deactivated');loadPatches();});
}

function deletePatch(id){
  if(!confirm('Delete patch '+id+'?'))return;
  fetch('/admin/patches/'+id,{method:'DELETE',headers:{'X-Admin-Secret':SECRET}})
    .then(()=>{toast('Deleted');loadPatches();});
}

function savePatch(andPublish){
  let ops;
  try{ops=JSON.parse(document.getElementById('patch-json-area').value||'[]');}
  catch{toast('Invalid JSON in patches field','red');return;}
  const body={
    id:document.getElementById('p-id').value.trim()||undefined,
    version:document.getElementById('p-version').value.trim(),
    min_app_version:document.getElementById('p-minver').value.trim()||undefined,
    summary:document.getElementById('p-summary').value.trim(),
    patches:ops,
    bug_report_ids:document.getElementById('p-bugs').value.split(',').map(s=>s.trim()).filter(Boolean),
  };
  if(!body.version||!body.summary){toast('Version and summary are required','red');return;}
  fetch('/admin/patches',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Secret':SECRET},body:JSON.stringify(body)})
    .then(r=>r.json())
    .then(p=>{
      if(andPublish){
        fetch('/admin/patches/'+p.id+'/publish',{method:'POST',headers:{'X-Admin-Secret':SECRET}})
          .then(()=>{toast('Saved & Published! 🚀');loadPatches();showTab('patches');});
      } else {
        toast('Patch saved');loadPatches();showTab('patches');
      }
    }).catch(()=>toast('Save failed','red'));
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function toast(msg,color){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.background=color==='red'?'#c0392b':'#222';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}
</script>
</body>
</html>`;
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "");
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders("*") });
    }

    // ── Public routes ──────────────────────────────────────────────────────

    if (method === "POST" && path === "/halo/bugs") {
      return receiveBug(request, env);
    }

    if (method === "GET" && path === "/halo/patches/latest.json") {
      return serveLatestPatch(env);
    }

    // ── Admin routes ───────────────────────────────────────────────────────

    if (path === "/admin" && method === "GET") {
      // Dashboard doesn't require auth in the response (JS handles login)
      return new Response(adminDashboardHtml(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // All /admin/... routes require auth
    if (path.startsWith("/admin/")) {
      if (!isAdmin(request, env)) {
        return json({ error: "Unauthorized" }, 401);
      }

      // Bugs
      if (method === "GET" && path === "/admin/bugs") return listBugs(env);

      const bugMatch = path.match(/^\/admin\/bugs\/([^/]+)$/);
      if (bugMatch) {
        if (method === "GET") return getBug(bugMatch[1], env);
      }
      const bugStatusMatch = path.match(/^\/admin\/bugs\/([^/]+)\/status$/);
      if (bugStatusMatch && method === "POST") {
        return updateBugStatus(bugStatusMatch[1], request, env);
      }

      // Patches
      if (method === "GET" && path === "/admin/patches") return listPatches(env);
      if (method === "POST" && path === "/admin/patches") return upsertPatch(request, env);

      const patchMatch = path.match(/^\/admin\/patches\/([^/]+)$/);
      if (patchMatch && method === "DELETE") return deletePatch(patchMatch[1], env);

      const patchPublish = path.match(/^\/admin\/patches\/([^/]+)\/publish$/);
      if (patchPublish && method === "POST") return publishPatch(patchPublish[1], env);

      const patchDeact = path.match(/^\/admin\/patches\/([^/]+)\/deactivate$/);
      if (patchDeact && method === "POST") return deactivatePatch(patchDeact[1], env);
    }

    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
