// === UTILITIES ===
// Lightweight debounce: returns a function that delays invoking fn until after `wait` ms of quiet.
function debounce(fn, wait) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// A value as a JavaScript string literal that is safe inside an HTML attribute, e.g.
// onclick="doThing(${jsAttr(id)})". (esc() alone is not enough inside inline handlers: the
// browser decodes &#39; back to ' before the JavaScript runs.)
function jsAttr(v) {
  return esc(JSON.stringify(String(v ?? '')));
}

// AbortSignal.timeout() is missing on older phones; this works everywhere.
function timeoutSignal(ms) {
  try { if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms); } catch (e) {}
  const ctrl = new AbortController();
  setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, ms);
  return ctrl.signal;
}

// Ask a freshly opened print window to print exactly once, when it is ready.
function printOnce(w) {
  let done = false;
  const go = () => { if (done) return; done = true; try { if (w && !w.closed) { w.focus(); w.print(); } } catch (e) {} };
  try { w.onload = go; } catch (e) {}
  setTimeout(go, 1200);
}

// Print a complete HTML document without opening a new window (used when pop-ups are blocked).
function printInPage(docHtml) {
  try {
    const old = document.getElementById('ark-print-frame');
    if (old) old.remove();
    const frame = document.createElement('iframe');
    frame.id = 'ark-print-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open(); doc.write(docHtml); doc.close();
    setTimeout(() => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch (e) { Toast.show('Printing is not available here — use your browser\'s Share or Print menu', 'warning', 6000); }
    }, 400);
  } catch (e) {
    Toast.show('Printing is not available here — use your browser\'s Share or Print menu', 'warning', 6000);
  }
}

function generateID() {
  return 'ARK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

function today() {
  // Local calendar date (not UTC) so daily checklists reset at the user's own midnight.
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function download(name, content, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); // some browsers ignore clicks on links that are not in the page
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60000);
}

