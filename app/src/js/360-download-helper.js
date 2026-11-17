/* ============================================================
   DOWNLOAD HELPER — strips first_run_done so recipient gets wizard
   ============================================================ */
async function _freshDownloadHTML() {
  // The copy we hand to someone else must be the original app file — never a snapshot of the
  // screen, which would bake this household's names, medical notes and messages into it.
  // 1. Re-fetch the original file (works when ARK is opened from a website or a hub).
  if (/^https?:$/.test(location.protocol)) {
    // Give up after 8 seconds (a hub that has gone away must not leave the button doing nothing).
    let timer = null;
    try {
      const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      if (ctl) timer = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(location.href.split('#')[0], ctl ? {cache: 'no-store', signal: ctl.signal} : {cache: 'no-store'});
      if (r.ok) {
        const t = await r.text();
        if (t.length > 100000 && t.indexOf('ARK_PRISTINE_MARKER') !== -1) return t;
      }
    } catch (e) {}
    finally { clearTimeout(timer); }
  }
  // 2. Opened from a saved file: use the untouched copy captured before the app started.
  if (window.__ARK_PRISTINE) return window.__ARK_PRISTINE;
  throw new Error('no clean copy available');
}

