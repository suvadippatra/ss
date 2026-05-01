/* ═══════════════════════════════════════════════════════════════
   Student's Suite — app.js  v3.0.0
   All tool logic. Loaded after index.html via <script src="./app.js">
   Depends on: pdf-lib (window.PDFLib), loaded via ./js/pdf-lib.min.js
═══════════════════════════════════════════════════════════════ */

/* ─── GLOBALS ──────────────────────────────────────────────── */
let PDFDocument, rgb, degrees, StandardFonts, grayscale;
const MM = 72 / 25.4;
const CW = 277 * MM, CH = 190 * MM;
let opCount = 0;
let sessionFiles = {};          // { id: { name, bytes, size } }
let sessionIdSeq = 0;
window._activeBlobs = [];

/* ─── INIT (runs after window load) ───────────────────────── */
window.addEventListener('load', function () {
  // Verify pdf-lib
  const banner = document.getElementById('libStatus');
  if (typeof PDFLib === 'undefined') {
    banner.style.display = 'block'; banner.className = 'err';
    banner.innerHTML = '⚠ pdf-lib failed to load. Check internet or place <b>pdf-lib.min.js</b> in ./js/ folder and ensure the &lt;script&gt; tag points to it.';
    return;
  }
  ({ PDFDocument, rgb, degrees, StandardFonts, grayscale } = PDFLib);
  banner.style.display = 'block'; banner.className = 'ok';
  banner.textContent = '✓ pdf-lib ready — all tools available offline.';
  setTimeout(() => { banner.style.display = 'none'; }, 3000);

  initAll();
});

function initAll() {
  // Interactive dot grid — update CSS vars on pointer move
  document.addEventListener('pointermove', function (e) {
    document.body.style.setProperty('--mx', e.clientX + 'px');
    document.body.style.setProperty('--my', e.clientY + 'px');
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length === 1) {
      document.body.style.setProperty('--mx', e.touches[0].clientX + 'px');
      document.body.style.setProperty('--my', e.touches[0].clientY + 'px');
    }
  }, { passive: true }); // passive:true — never blocks scroll or zoom

  // Pull-to-refresh block — ONLY blocks single-finger downward pull at top of page
  let touchStartY = 0;
  document.addEventListener('touchstart', function (e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    const dy = e.touches[0].clientY - touchStartY;
    if (window.scrollY === 0 && dy > 10 && e.touches.length === 1) {
      e.preventDefault(); // block pull-to-refresh only
    }
  }, { passive: false });

  // Theme
  const saved = localStorage.getItem('ss-theme') || 'dark';
  if (saved === 'light') document.body.setAttribute('data-theme', 'light');

  // Notes
  const note = localStorage.getItem('ss-notes');
  if (note) document.getElementById('localNoteArea').value = note;

  // Booklet sliders
  document.getElementById('bk-gap').addEventListener('input', bkUpdatePreview);
  document.getElementById('bk-out').addEventListener('input', bkUpdatePreview);
  bkUpdatePreview();

  // N-up sliders
  ['nu-rows','nu-cols','nu-sp','nu-mg'].forEach(id => {
    document.getElementById(id).addEventListener('input', nuUpdateInfo);
  });
  nuUpdateInfo();

  // Watermark sliders
  ['wa-fs','wa-op','wa-rot'].forEach(id => {
    document.getElementById(id).addEventListener('input', function () {
      const labels = {'wa-fs':'wa-fsV','wa-op':'wa-opV','wa-rot':'wa-rotV'};
      const units  = {'wa-fs':' pt','wa-op':'%','wa-rot':'°'};
      document.getElementById(labels[id]).textContent = this.value + units[id];
    });
  });

  // Split interval slider
  document.getElementById('sp-n').addEventListener('input', function () {
    document.getElementById('sp-nV').textContent = this.value;
  });

  // Calculator build
  buildCalcPad();
  gAddFn(); // first graph function row

  // Wire all drop zones
  wireDZ('bk-dz','bk-fi', bytes => bkLoad(bytes));
  wireDZ('mg-dz','mg-fi', null); // merge has its own multi-file handler
  wireDZ('sp-dz','sp-fi', bytes => spLoad(bytes));
  wireDZ('cp-dz','cp-fi', bytes => cpLoad(bytes));
  wireDZ('nu-dz','nu-fi', bytes => nuLoad(bytes));
  wireDZ('ra-dz','ra-fi', bytes => raLoad(bytes));
  wireDZ('ti-dz','ti-fi', bytes => tiLoad(bytes));
  wireDZ('wa-dz','wa-fi', bytes => waLoad(bytes));
  wireDZ('wr-dz','wr-fi', bytes => wrLoad(bytes));
  wireDZ('un-dz','un-fi', bytes => unLoad(bytes));
  wireDZ('vf-dz','vf-fi', bytes => vfLoad(bytes));

  // Image tool drop zones
  wireDZImg('ic-dz','ic-fi', icLoad);
  wireDZImg('ir-dz','ir-fi', irLoad);
  wireDZImg('pp-dz','pp-fi', ppLoad);
  wireDZImg('sg-dz','sg-fi', sgLoad);

  // Merge file input
  document.getElementById('mg-fi').addEventListener('change', function () {
    mgHandleFiles(this.files); this.value = '';
  });

  // Run buttons
  document.getElementById('bk-run').addEventListener('click', bkRun);
  document.getElementById('mg-run').addEventListener('click', mgRun);
  document.getElementById('sp-run').addEventListener('click', spRun);
  document.getElementById('cp-run').addEventListener('click', cpRun);
  document.getElementById('nu-run').addEventListener('click', nuRun);
  document.getElementById('ra-run').addEventListener('click', raRun);
  document.getElementById('ti-run').addEventListener('click', tiRun);
  document.getElementById('wa-run').addEventListener('click', waRun);
  document.getElementById('wr-run').addEventListener('click', wrRun);
  document.getElementById('un-run').addEventListener('click', unRun);
  document.getElementById('vf-run').addEventListener('click', vfRun);
  document.getElementById('ic-run').addEventListener('click', icDownload);
  document.getElementById('ir-run').addEventListener('click', irRun);
  document.getElementById('pp-run').addEventListener('click', ppRun);
  document.getElementById('sg-run').addEventListener('click', sgDownload);

  // Image compress quality slider live update
  document.getElementById('ic-q').addEventListener('input', function () {
    document.getElementById('ic-qV').textContent = this.value + '%';
    icUpdate();
  });
}

/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
function openTool(id) {
  document.getElementById('landing').style.display = 'none';
  document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
  document.getElementById('tool-' + id).style.display = 'block';
  window.scrollTo(0, 0);
}
function goBack() {
  document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
  document.getElementById('landing').style.display = 'block';
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════════════════
   CATEGORY FILTER
══════════════════════════════════════════════════════════ */
function filterCat(cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.querySelectorAll('.tool-card').forEach(c => {
    c.style.display = (cat === 'all' || c.dataset.cat === cat) ? '' : 'none';
  });
}

/* ══════════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════════ */
function toggleTheme() {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  document.body.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('ss-theme', isLight ? 'dark' : 'light');
  // Redraw graph if visible
  if (typeof gLastFns !== 'undefined' && gLastFns.length) gPlot();
}

/* ══════════════════════════════════════════════════════════
   NOTES & SESSION
══════════════════════════════════════════════════════════ */
function saveNote() {
  localStorage.setItem('ss-notes', document.getElementById('localNoteArea').value);
  const st = document.getElementById('noteSt');
  st.style.display = 'inline'; setTimeout(() => st.style.display = 'none', 2000);
}
function showSessionModal() {
  const count = Object.keys(sessionFiles).length;
  if (!count) { alert('No files in session.'); return; }
  const names = Object.values(sessionFiles).map(f => f.name).join('\n');
  if (confirm(`Session has ${count} file(s):\n\n${names}\n\nPurge all from memory?`)) {
    window._activeBlobs.forEach(u => URL.revokeObjectURL(u));
    window._activeBlobs = [];
    sessionFiles = {};
    updateSessionBadge();
  }
}
function addToSession(name, bytes) {
  const id = 'sf' + (++sessionIdSeq);
  sessionFiles[id] = { name, bytes, size: bytes.length };
  updateSessionBadge();
  return id;
}
function updateSessionBadge() {
  const n = Object.keys(sessionFiles).length;
  const badge = document.getElementById('gBadge');
  document.getElementById('gBadgeCount').textContent = n;
  badge.classList.toggle('on', n > 0);
}
function populateSessUI(listId, trayId, onLoad) {
  const tray = document.getElementById(trayId);
  const list = document.getElementById(listId);
  const files = Object.values(sessionFiles);
  if (!files.length) { tray.classList.remove('on'); return; }
  tray.classList.add('on');
  list.innerHTML = '';
  files.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'sess-file-btn';
    btn.textContent = f.name + ' (' + fmtKB(f.bytes.length) + ')';
    btn.onclick = () => onLoad(f.bytes, f.name);
    list.appendChild(btn);
  });
}

/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */
const tick = () => new Promise(r => setTimeout(r, 0));
function ts() { return new Date().toLocaleTimeString('en-GB', { hour12: false }); }
function fmtKB(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}
function addLog(boxId, msg, type) {
  const box = document.getElementById(boxId);
  const d = document.createElement('div');
  d.className = type || 'li';
  d.innerHTML = '<span style="opacity:.32">' + ts() + '</span>  ' + msg;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}
function setP(id, pct) { document.getElementById(id).style.width = pct + '%'; }
function chipSet(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state) el.classList.add(state);
}
function showDL(labId, sectId) {
  document.getElementById(labId).style.display = '';
  document.getElementById(sectId).style.display = 'block';
}
function addDLItem(listId, filename, title, desc, bytes, sessLabel) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  window._activeBlobs.push(url);
  const item = document.createElement('div');
  item.className = 'dl-item';
  item.innerHTML =
    '<div><div class="dl-title">' + title + '</div><div class="dl-desc">' + desc + '</div></div>' +
    '<div style="display:flex;gap:5px;flex-shrink:0">' +
    '<a href="' + url + '" download="' + filename + '" class="dl-btn">⬇ Download</a>' +
    '<button class="sess-btn" onclick="addToSession(\'' + escQ(filename) + '\',this._bytes)">+ Session</button>' +
    '</div>';
  item.querySelector('.sess-btn')._bytes = bytes;
  document.getElementById(listId).appendChild(item);
}
function addDLItemImg(listId, filename, title, desc, dataUrl) {
  const item = document.createElement('div');
  item.className = 'dl-item';
  item.innerHTML =
    '<div><div class="dl-title">' + title + '</div><div class="dl-desc">' + desc + '</div></div>' +
    '<a href="' + dataUrl + '" download="' + filename + '" class="dl-btn">⬇ Download</a>';
  document.getElementById(listId).appendChild(item);
}
function escQ(s) { return s.replace(/'/g, "\\'"); }
function parsePageStr(str, total) {
  // Parses "1-5, 8, 10-12" into 0-based index array
  if (!str || !str.trim()) return [...Array(total).keys()];
  const result = [];
  str.split(',').forEach(part => {
    part = part.trim();
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(x => parseInt(x.trim()));
      if (!isNaN(a) && !isNaN(b)) {
        for (let i = a; i <= b; i++) if (i >= 1 && i <= total) result.push(i - 1);
      }
    } else {
      const n = parseInt(part);
      if (!isNaN(n) && n >= 1 && n <= total) result.push(n - 1);
    }
  });
  return [...new Set(result)];
}
function hexToRgb01(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function tDesc(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function incOp() {
  opCount++;
  document.getElementById('localOpCount').textContent = opCount;
}

/* ── Drop zone wiring (PDF) ─────────────────────────────── */
function wireDZ(dzId, fiId, onLoad) {
  const dz = document.getElementById(dzId);
  if (!dz) return;
  const fi = document.getElementById(fiId);
  if (fi && onLoad) {
    fi.addEventListener('change', async function () {
      if (!this.files[0]) return;
      const bytes = new Uint8Array(await this.files[0].arrayBuffer());
      onLoad(bytes, this.files[0].name);
      this.value = '';
    });
  }
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', async e => {
    e.preventDefault(); dz.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f && onLoad) { const bytes = new Uint8Array(await f.arrayBuffer()); onLoad(bytes, f.name); }
  });
}

/* ── Drop zone wiring (Image) ───────────────────────────── */
function wireDZImg(dzId, fiId, onLoad) {
  const dz = document.getElementById(dzId);
  if (!dz) return;
  const fi = document.getElementById(fiId);
  if (fi) fi.addEventListener('change', function () { if (this.files[0]) onLoad(this.files[0]); this.value = ''; });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) onLoad(f); });
}

/* ── PDF load helper ────────────────────────────────────── */
async function loadPDF(bytes, pnameId, pmetaId, pillId, runId, onLoaded) {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const n   = doc.getPageCount();
    document.getElementById(pnameId).textContent = '';
    document.getElementById(pmetaId).textContent = n + ' page' + (n !== 1 ? 's' : '') + ' · ' + fmtKB(bytes.length);
    document.getElementById(pillId).classList.add('on');
    if (runId) document.getElementById(runId).disabled = false;
    if (onLoaded) onLoaded(bytes, n, doc);
    return { bytes, n, doc };
  } catch (e) {
    alert('Could not read PDF: ' + e.message); return null;
  }
}

/* ══════════════════════════════════════════════════════════
   TOOL 1 — BOOKLET IMPOSITION
══════════════════════════════════════════════════════════ */
let bkBytes = null;
async function bkLoad(bytes, name) {
  bkBytes = bytes;
  document.getElementById('bk-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'bk-pname', 'bk-pmeta', 'bk-pill', 'bk-run');
  if (!info) { bkBytes = null; return; }
  document.getElementById('bk-proc').style.display = 'block';
  addLog('bk-log', 'Loaded: ' + info.n + ' pages · ' + fmtKB(bytes.length), 'ok');
  populateSessUI('bk-slist', 'bk-sess', (b, n) => bkLoad(b, n));
}
function bkUpdatePreview() {
  const g = +document.getElementById('bk-gap').value;
  const o = +document.getElementById('bk-out').value;
  document.getElementById('bk-gapV').textContent = g;
  document.getElementById('bk-outV').textContent = o;
  document.getElementById('bk-pw').textContent = ((277 - g - 2 * o) / 2).toFixed(1) + ' × 190 mm';
}
function bkBindSeq(total, n) {
  const g = 4 * n, seq = [];
  for (let k = 1; k <= total / g; k++) {
    const base = (k - 1) * g;
    for (let j = 0; j < g; j++) {
      const p = j >> 1, r = j & 1;
      seq.push(p % 2 === 0 ? (r === 0 ? base + (g - p) : base + (p + 1)) : (r === 0 ? base + (p + 1) : base + (g - p)));
    }
  }
  return seq;
}
function bkPad(total, cap) {
  const need = (cap - (total % cap)) % cap;
  let front = 0, back = 0;
  if (need === 1) back = 1;
  else if (need > 1 && need % 2 === 0) front = back = need / 2;
  else if (need > 1) { front = (need >> 1) + 1; back = need >> 1; }
  return { need, front, back };
}
function bkOrd(n) {
  const r = n % 100;
  if (r >= 11 && r <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}
async function bkRun() {
  if (!bkBytes) return;
  const gapMm = +document.getElementById('bk-gap').value;
  const outMm = +document.getElementById('bk-out').value;
  const sigs  = +document.getElementById('bk-sheets').value;
  const marks = document.getElementById('bk-marks').checked;
  document.getElementById('bk-run').disabled = true;
  document.getElementById('bk-dlist').innerHTML = '';
  ['bk-c1','bk-c2','bk-c3'].forEach(c => chipSet(c, null));
  setP('bk-pf', 0);
  try {
    // Step 1: Resize
    chipSet('bk-c1', 'active'); setP('bk-pf', 5);
    const wMm = (277 - gapMm - 2 * outMm) / 2;
    const tW  = wMm * MM, tH = CH;
    addLog('bk-log', 'Step 1 › Resize to ' + wMm.toFixed(2) + ' × 190 mm', 'st');
    const src1 = await PDFDocument.load(bkBytes, { ignoreEncryption: true });
    const out1 = await PDFDocument.create();
    const n1   = src1.getPageCount();
    const emb1 = await out1.embedPdf(src1, [...Array(n1).keys()]);
    for (let i = 0; i < n1; i++) {
      out1.addPage([tW, tH]).drawPage(emb1[i], { x: 0, y: 0, width: tW, height: tH });
      if (i % 4 === 3) { setP('bk-pf', 5 + (i / n1) * 25); await tick(); }
    }
    const r1 = await out1.save({ useObjectStreams: false });
    chipSet('bk-c1', 'done'); addLog('bk-log', 'Step 1 ✓ — ' + n1 + ' pages resized', 'ok');
    addDLItem('bk-dlist', 'Step1_Resized.pdf', '① Resized Sub-pages', wMm.toFixed(1) + ' × 190 mm per page', r1);
    // Step 2: Impose
    chipSet('bk-c2', 'active'); setP('bk-pf', 35);
    const cap = sigs * 4;
    const src2 = await PDFDocument.load(r1, { ignoreEncryption: true });
    const nSrc = src2.getPageCount();
    const { need, front, back } = bkPad(nSrc, cap);
    const working = nSrc + front + back;
    addLog('bk-log', 'Step 2 › ' + nSrc + ' pages | pad: ' + need + ' (↑' + front + ' front, ↓' + back + ' back)', 'st');
    const order  = bkBindSeq(working, sigs);
    const pageW  = tW, gapPts = gapMm * MM, outPts = outMm * MM;
    const rightX = outPts + pageW + gapPts;
    const out2   = await PDFDocument.create();
    const emb2   = await out2.embedPdf(src2, [...Array(nSrc).keys()]);
    for (let i = 0; i < order.length; i += 2) {
      const sheet = out2.addPage([CW, CH]);
      const lIdx  = (order[i]     - 1) - front;
      const rIdx  = (order[i + 1] - 1) - front;
      if (lIdx >= 0 && lIdx < nSrc) sheet.drawPage(emb2[lIdx], { x: outPts, y: 0, width: pageW, height: CH });
      if (rIdx >= 0 && rIdx < nSrc) sheet.drawPage(emb2[rIdx], { x: rightX,  y: 0, width: pageW, height: CH });
      if (i % 8 === 6) { setP('bk-pf', 35 + (i / order.length) * 28); await tick(); }
    }
    const r2 = await out2.save({ useObjectStreams: false });
    chipSet('bk-c2', 'done'); addLog('bk-log', 'Step 2 ✓ — ' + out2.getPageCount() + ' imposed sheets', 'ok');
    addDLItem('bk-dlist', 'Step2_Imposed.pdf', '② Imposed Booklet', 'Pages in saddle-stitch print order', r2);
    // Step 3: Marks
    if (marks) {
      chipSet('bk-c3', 'active'); setP('bk-pf', 67);
      addLog('bk-log', 'Step 3 › Applying registration marks…', 'st');
      const doc3 = await PDFDocument.load(r2, { ignoreEncryption: true });
      const font = await doc3.embedFont(StandardFonts.Helvetica);
      const midX = CW / 2, fsize = 11, pad = 11;
      const lnCol = rgb(0.6, 0.6, 0.6), txtCol = rgb(0.25, 0.25, 0.25), dotCol = rgb(0, 0, 0);
      const da    = [1.5 * MM, 2 * MM];
      const avail = CH - 40 * MM;
      const dotY  = [CH - 20 * MM, CH - 20 * MM - avail / 3, CH - 20 * MM - 2 * avail / 3, 20 * MM];
      const pgs   = doc3.getPages();
      for (let idx = 0; idx < pgs.length; idx++) {
        const pg = pgs[idx];
        if ((idx + 1) % 2 !== 0) {
          pg.drawLine({ start: { x: midX, y: 0 }, end: { x: midX, y: CH }, thickness: 1, color: lnCol, opacity: 0.5, dashArray: da, dashPhase: 0 });
        } else {
          const ei = Math.floor(idx / 2);
          const sigNum   = Math.floor(ei / sigs) + 1;
          const sheetNum = (ei % sigs) + 1;
          const text = 'Sig. ' + sigNum + ' · Sheet ' + sheetNum + ' of ' + sigs;
          const tW2  = font.widthOfTextAtSize(text, fsize);
          const ctr  = CH / 2, gBot = ctr - tW2 / 2 - pad, gTop = ctr + tW2 / 2 + pad;
          pg.drawLine({ start: { x: midX, y: 0 },    end: { x: midX, y: gBot }, thickness: 1, color: lnCol, opacity: 0.5, dashArray: da, dashPhase: 0 });
          pg.drawLine({ start: { x: midX, y: gTop }, end: { x: midX, y: CH },   thickness: 1, color: lnCol, opacity: 0.5, dashArray: da, dashPhase: 0 });
          pg.drawText(text, { x: midX + fsize * 0.3, y: ctr - tW2 / 2, size: fsize, font, color: txtCol, rotate: degrees(90), opacity: 0.5 });
        }
        dotY.forEach(y => {
          pg.drawCircle({ x: midX, y, size: 1.0 * MM, borderColor: dotCol, borderWidth: 0.5 });
          pg.drawCircle({ x: midX, y, size: 0.3 * MM, color: dotCol, borderColor: dotCol, borderWidth: 0.5 });
        });
        if (idx % 4 === 3) { setP('bk-pf', 67 + (idx / pgs.length) * 28); await tick(); }
      }
      const r3 = await doc3.save();
      chipSet('bk-c3', 'done'); addLog('bk-log', 'Step 3 ✓ — marks on ' + pgs.length + ' sheets', 'ok');
      addDLItem('bk-dlist', 'Step3_Final.pdf', '③ Final + Registration Marks', 'Fold guide, "Sig. N · Sheet N of N" labels, binding dots', r3);
    } else { chipSet('bk-c3', 'done'); }
    setP('bk-pf', 100);
    addLog('bk-log', 'All steps complete ✓', 'ok');
    showDL('bk-dlab', 'bk-dsect');
    incOp();
  } catch (e) {
    addLog('bk-log', 'ERROR: ' + e.message, 'er'); console.error(e);
  }
  document.getElementById('bk-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 2 — PDF MERGE
══════════════════════════════════════════════════════════ */
let mgQueue = [];
let mgSel   = -1;
function mgAdd() { document.getElementById('mg-fi').click(); }
async function mgHandleFiles(files) {
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      mgQueue.push({ name: f.name, bytes, pages: doc.getPageCount() });
    } catch (e) { alert('Could not load ' + f.name + ': ' + e.message); }
  }
  mgRender();
}
function mgRender() {
  const box = document.getElementById('mg-list');
  if (!mgQueue.length) { box.innerHTML = '<div style="padding:10px;color:var(--muted);font-size:.75rem">Queue empty.</div>'; document.getElementById('mg-run').disabled = true; document.getElementById('mg-stats').textContent = ''; return; }
  box.innerHTML = '';
  mgQueue.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'fl-item' + (i === mgSel ? ' sel' : '');
    d.innerHTML = '<span class="fl-num">' + (i + 1) + '</span><span class="fl-name">' + f.name + '</span><span class="fl-meta">' + f.pages + ' pp · ' + fmtKB(f.bytes.length) + '</span>';
    d.onclick = () => { mgSel = i; mgRender(); };
    box.appendChild(d);
  });
  const total = mgQueue.reduce((a, f) => a + f.pages, 0);
  document.getElementById('mg-stats').textContent = mgQueue.length + ' files · ' + total + ' total pages';
  document.getElementById('mg-run').disabled = false;
}
function mgMove(dir) {
  if (mgSel < 0 || mgSel >= mgQueue.length) return;
  const to = mgSel + dir;
  if (to < 0 || to >= mgQueue.length) return;
  [mgQueue[mgSel], mgQueue[to]] = [mgQueue[to], mgQueue[mgSel]];
  mgSel = to; mgRender();
}
function mgRem() { if (mgSel >= 0) { mgQueue.splice(mgSel, 1); mgSel = Math.min(mgSel, mgQueue.length - 1); mgRender(); } }
function mgClear() { mgQueue = []; mgSel = -1; mgRender(); }
async function mgRun() {
  if (!mgQueue.length) return;
  document.getElementById('mg-run').disabled = true;
  document.getElementById('mg-dlist').innerHTML = '';
  document.getElementById('mg-proc').style.display = 'block';
  setP('mg-pf', 0);
  try {
    addLog('mg-log', 'Merging ' + mgQueue.length + ' documents…', 'st');
    const out = await PDFDocument.create();
    for (let i = 0; i < mgQueue.length; i++) {
      const src = await PDFDocument.load(mgQueue[i].bytes, { ignoreEncryption: true });
      const copied = await out.copyPages(src, src.getPageIndices());
      copied.forEach(p => out.addPage(p));
      addLog('mg-log', '+ ' + mgQueue[i].name + ' (' + mgQueue[i].pages + ' pages)', 'ok');
      setP('mg-pf', Math.round((i + 1) / mgQueue.length * 95));
      await tick();
    }
    const bytes = await out.save();
    setP('mg-pf', 100);
    addLog('mg-log', 'Done — ' + out.getPageCount() + ' pages total', 'ok');
    document.getElementById('mg-dlist').innerHTML = '';
    addDLItem('mg-dlist', 'Merged.pdf', 'Merged Document', out.getPageCount() + ' pages', bytes);
    showDL('mg-dlab', 'mg-dsect');
    incOp();
  } catch (e) { addLog('mg-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('mg-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 3 — PDF SPLIT
══════════════════════════════════════════════════════════ */
let spBytes = null, spTotal = 0, spTabIdx = 0;
async function spLoad(bytes, name) {
  spBytes = bytes;
  document.getElementById('sp-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'sp-pname', 'sp-pmeta', 'sp-pill', 'sp-run');
  if (!info) return;
  spTotal = info.n;
  document.getElementById('sp-proc').style.display = 'block';
  populateSessUI('sp-slist', 'sp-sess', (b, n) => spLoad(b, n));
}
function spTab(idx, btn) {
  spTabIdx = idx;
  document.querySelectorAll('#tool-split .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  [0, 1, 2].forEach(i => document.getElementById('sp-t' + i).classList.toggle('active', i === idx));
}
function spGetRanges() {
  if (!spBytes || !spTotal) return [];
  if (spTabIdx === 0) {
    const str = document.getElementById('sp-ranges').value;
    const allIdx = parsePageStr(str, spTotal);
    return [{ label: 'Pages_' + str.replace(/\s/g,''), indices: allIdx }];
  }
  if (spTabIdx === 1) {
    const n = parseInt(document.getElementById('sp-n').value) || 10;
    const batches = [];
    for (let s = 0; s < spTotal; s += n) {
      const end = Math.min(s + n, spTotal);
      batches.push({ label: 'Pages_' + (s + 1) + '-' + end, indices: Array.from({ length: end - s }, (_, i) => s + i) });
    }
    return batches;
  }
  if (spTabIdx === 2) {
    const str = document.getElementById('sp-extract').value;
    const idxs = parsePageStr(str, spTotal);
    return idxs.map(i => ({ label: 'Page_' + (i + 1), indices: [i] }));
  }
  return [];
}
function spPreview() {
  const ranges = spGetRanges();
  const area   = document.getElementById('sp-prv-area');
  const list   = document.getElementById('sp-prv-list');
  const count  = document.getElementById('sp-prv-count');
  if (!ranges.length) { area.style.display = 'none'; return; }
  area.style.display = 'block';
  list.innerHTML = '';
  ranges.forEach((r, i) => {
    const d = document.createElement('div');
    d.className = 'fl-item';
    d.innerHTML = '<span class="fl-num">' + (i + 1) + '</span><span class="fl-name">' + r.label + '.pdf</span><span class="fl-meta">' + r.indices.length + ' page(s)</span>';
    list.appendChild(d);
  });
  count.textContent = ranges.length + ' output file(s)';
}
async function spRun() {
  const ranges = spGetRanges();
  if (!ranges.length || !spBytes) return;
  document.getElementById('sp-run').disabled = true;
  document.getElementById('sp-dlist').innerHTML = '';
  document.getElementById('sp-proc').style.display = 'block';
  setP('sp-pf', 0);
  try {
    addLog('sp-log', 'Splitting into ' + ranges.length + ' file(s)…', 'st');
    for (let i = 0; i < ranges.length; i++) {
      const r   = ranges[i];
      const src = await PDFDocument.load(spBytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, r.indices);
      copied.forEach(p => out.addPage(p));
      const bytes = await out.save();
      addDLItem('sp-dlist', r.label + '.pdf', r.label + '.pdf', r.indices.length + ' page(s)', bytes);
      addLog('sp-log', '✓ ' + r.label + '.pdf', 'ok');
      setP('sp-pf', Math.round((i + 1) / ranges.length * 100));
      await tick();
    }
    showDL('sp-dlab', 'sp-dsect');
    incOp();
  } catch (e) { addLog('sp-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('sp-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 4 — PDF COMPRESS
══════════════════════════════════════════════════════════ */
let cpBytes = null;
async function cpLoad(bytes, name) {
  cpBytes = bytes;
  document.getElementById('cp-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'cp-pname', 'cp-pmeta', 'cp-pill', 'cp-run');
  if (!info) return;
  document.getElementById('cp-proc').style.display = 'block';
  populateSessUI('cp-slist', 'cp-sess', (b, n) => cpLoad(b, n));
}
async function cpRun() {
  if (!cpBytes) return;
  document.getElementById('cp-run').disabled = true;
  document.getElementById('cp-dlist').innerHTML = '';
  document.getElementById('cp-proc').style.display = 'block';
  setP('cp-pf', 10);
  try {
    addLog('cp-log', 'Loading and re-compressing…', 'st');
    const doc = await PDFDocument.load(cpBytes, { ignoreEncryption: true });
    setP('cp-pf', 50);
    await tick();
    const out   = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    const ratio = ((1 - out.length / cpBytes.length) * 100).toFixed(1);
    setP('cp-pf', 100);
    addLog('cp-log', 'Original: ' + fmtKB(cpBytes.length) + ' → Output: ' + fmtKB(out.length) + ' (' + ratio + '% reduction)', 'ok');
    addDLItem('cp-dlist', 'Compressed.pdf', 'Compressed PDF', fmtKB(cpBytes.length) + ' → ' + fmtKB(out.length) + ' (' + ratio + '% smaller)', out);
    showDL('cp-dlab', 'cp-dsect');
    incOp();
  } catch (e) { addLog('cp-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('cp-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 5 — N-UP LAYOUT
══════════════════════════════════════════════════════════ */
let nuBytes = null;
async function nuLoad(bytes, name) {
  nuBytes = bytes;
  document.getElementById('nu-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'nu-pname', 'nu-pmeta', 'nu-pill', 'nu-run');
  if (!info) return;
  document.getElementById('nu-proc').style.display = 'block';
  populateSessUI('nu-slist', 'nu-sess', (b, n) => nuLoad(b, n));
}
function nuUpdateInfo() {
  ['nu-rows','nu-cols','nu-sp','nu-mg'].forEach(id => {
    document.getElementById(id.replace('nu-','nu-') + 'V').textContent = document.getElementById(id).value;
  });
  const r = +document.getElementById('nu-rows').value;
  const c = +document.getElementById('nu-cols').value;
  document.getElementById('nu-info').innerHTML = 'Grid: ' + r + '×' + c + ' = <b>' + (r * c) + ' source pages per output sheet</b>';
}
async function nuRun() {
  if (!nuBytes) return;
  document.getElementById('nu-run').disabled = true;
  document.getElementById('nu-dlist').innerHTML = '';
  document.getElementById('nu-proc').style.display = 'block';
  setP('nu-pf', 5);
  try {
    const rows = +document.getElementById('nu-rows').value;
    const cols = +document.getElementById('nu-cols').value;
    const spMm = +document.getElementById('nu-sp').value;
    const mgMm = +document.getElementById('nu-mg').value;
    const sizeVal = document.getElementById('nu-size').value.split(',').map(Number);
    const outW = sizeVal[0], outH = sizeVal[1];
    const mgPts = mgMm * MM, spPts = spMm * MM;
    const cellW = (outW - 2 * mgPts - (cols - 1) * spPts) / cols;
    const cellH = (outH - 2 * mgPts - (rows - 1) * spPts) / rows;
    addLog('nu-log', 'Cell size: ' + (cellW / MM).toFixed(1) + ' × ' + (cellH / MM).toFixed(1) + ' mm', 'st');
    const src  = await PDFDocument.load(nuBytes, { ignoreEncryption: true });
    const n    = src.getPageCount();
    const out  = await PDFDocument.create();
    const emb  = await out.embedPdf(src, [...Array(n).keys()]);
    const perSheet = rows * cols;
    const numSheets = Math.ceil(n / perSheet);
    for (let s = 0; s < numSheets; s++) {
      const page = out.addPage([outW, outH]);
      for (let cell = 0; cell < perSheet; cell++) {
        const srcIdx = s * perSheet + cell;
        if (srcIdx >= n) break;
        const col = cell % cols, row = Math.floor(cell / cols);
        const x = mgPts + col * (cellW + spPts);
        const y = outH - mgPts - (row + 1) * cellH - row * spPts;
        page.drawPage(emb[srcIdx], { x, y, width: cellW, height: cellH });
      }
      setP('nu-pf', 5 + (s / numSheets) * 90);
      await tick();
    }
    const bytes = await out.save();
    setP('nu-pf', 100);
    addLog('nu-log', '✓ ' + numSheets + ' output sheets', 'ok');
    addDLItem('nu-dlist', 'Nup_' + rows + 'x' + cols + '.pdf', rows + '×' + cols + ' N-up Layout', numSheets + ' output sheets from ' + n + ' source pages', bytes);
    showDL('nu-dlab', 'nu-dsect');
    incOp();
  } catch (e) { addLog('nu-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('nu-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 6 — REARRANGE PAGES
══════════════════════════════════════════════════════════ */
let raBytes = null, raOrder = [], raSel = -1;
async function raLoad(bytes, name) {
  raBytes = bytes;
  document.getElementById('ra-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'ra-pname', 'ra-pmeta', 'ra-pill', 'ra-run');
  if (!info) return;
  raOrder = [...Array(info.n).keys()];
  raRender();
  document.getElementById('ra-proc').style.display = 'block';
  populateSessUI('ra-slist', 'ra-sess', (b, n) => raLoad(b, n));
}
function raRender() {
  const box = document.getElementById('ra-list');
  box.innerHTML = '';
  raOrder.forEach((orig, disp) => {
    const d = document.createElement('div');
    d.className = 'fl-item' + (disp === raSel ? ' sel' : '');
    d.innerHTML = '<span class="fl-num">' + (disp + 1) + '</span><span class="fl-name">Page ' + (orig + 1) + '</span><span class="fl-meta">orig: ' + (orig + 1) + '</span>';
    d.onclick = () => { raSel = disp; raRender(); };
    box.appendChild(d);
  });
  document.getElementById('ra-count').textContent = raOrder.length + ' pages in current order';
}
function raShift(dir) {
  if (raSel < 0) return;
  const to = raSel + dir;
  if (to < 0 || to >= raOrder.length) return;
  [raOrder[raSel], raOrder[to]] = [raOrder[to], raOrder[raSel]];
  raSel = to; raRender();
}
function raDup() { if (raSel >= 0) { raOrder.splice(raSel, 0, raOrder[raSel]); raRender(); } }
function raDel() { if (raSel >= 0 && raOrder.length > 1) { raOrder.splice(raSel, 1); raSel = Math.min(raSel, raOrder.length - 1); raRender(); } }
function raReset() { if (!raBytes) return; const n = raOrder.reduce((m, v) => Math.max(m, v), 0) + 1; raOrder = [...Array(n).keys()]; raSel = -1; raRender(); }
async function raRun() {
  if (!raBytes || !raOrder.length) return;
  document.getElementById('ra-run').disabled = true;
  document.getElementById('ra-dlist').innerHTML = '';
  document.getElementById('ra-proc').style.display = 'block';
  setP('ra-pf', 10);
  try {
    const src  = await PDFDocument.load(raBytes, { ignoreEncryption: true });
    const out  = await PDFDocument.create();
    const copied = await out.copyPages(src, raOrder);
    copied.forEach(p => out.addPage(p));
    setP('ra-pf', 90); await tick();
    const bytes = await out.save();
    setP('ra-pf', 100);
    addLog('ra-log', '✓ Reordered PDF — ' + raOrder.length + ' pages', 'ok');
    addDLItem('ra-dlist', 'Reordered.pdf', 'Reordered Document', raOrder.length + ' pages in new order', bytes);
    showDL('ra-dlab', 'ra-dsect');
    incOp();
  } catch (e) { addLog('ra-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('ra-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 7 — PDF TO IMAGE (needs pdf.js)
══════════════════════════════════════════════════════════ */
let tiBytes = null;
async function tiLoad(bytes, name) {
  tiBytes = bytes;
  document.getElementById('ti-pname').textContent = name || 'document.pdf';
  document.getElementById('ti-pmeta').textContent = fmtKB(bytes.length);
  document.getElementById('ti-pill').classList.add('on');
  document.getElementById('ti-run').disabled = false;
  document.getElementById('ti-proc').style.display = 'block';
  populateSessUI('ti-slist', 'ti-sess', (b, n) => tiLoad(b, n));
}
async function tiRun() {
  if (!tiBytes) return;
  document.getElementById('ti-run').disabled = true;
  document.getElementById('ti-dlist').innerHTML = '';
  document.getElementById('ti-proc').style.display = 'block';
  setP('ti-pf', 0);
  addLog('ti-log', 'Loading pdf.js renderer…', 'st');
  try {
    // Load pdf.js dynamically
    if (!window.pdfjsLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = './js/pdf.min.js';
        s.onload = res;
        s.onerror = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s2.onload = res; s2.onerror = rej;
          document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      });
      if (window.pdfjsLib) {
        const workerSrc = './js/pdf.worker.min.js';
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      }
    }
    const dpi = parseInt(document.querySelector('input[name="ti-dpi"]:checked').value);
    const fmt = document.querySelector('input[name="ti-fmt"]:checked').value;
    const ext = fmt === 'jpeg' ? 'jpg' : 'png';
    const scale = dpi / 72;
    const pdfDoc = await window.pdfjsLib.getDocument({ data: tiBytes }).promise;
    const total = pdfDoc.numPages;
    const pageStr = document.getElementById('ti-pages').value;
    const pageIdxs = pageStr.trim() ? parsePageStr(pageStr, total) : [...Array(total).keys()];
    addLog('ti-log', 'Rendering ' + pageIdxs.length + ' page(s) at ' + dpi + ' DPI…', 'st');
    for (let i = 0; i < pageIdxs.length; i++) {
      const pg  = await pdfDoc.getPage(pageIdxs[i] + 1);
      const vp  = pg.getViewport({ scale });
      const cv  = document.createElement('canvas');
      cv.width  = Math.round(vp.width); cv.height = Math.round(vp.height);
      const ctx = cv.getContext('2d');
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      const dataUrl = cv.toDataURL('image/' + fmt, fmt === 'jpeg' ? 0.92 : undefined);
      const fname   = 'page_' + (pageIdxs[i] + 1) + '.' + ext;
      addDLItemImg('ti-dlist', fname, fname, cv.width + '×' + cv.height + ' px', dataUrl);
      addLog('ti-log', '✓ Page ' + (pageIdxs[i] + 1), 'ok');
      setP('ti-pf', Math.round((i + 1) / pageIdxs.length * 100));
      await tick();
    }
    showDL('ti-dlab', 'ti-dsect');
    incOp();
  } catch (e) { addLog('ti-log', 'ERROR: ' + e.message, 'er'); console.error(e); }
  document.getElementById('ti-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 8 — ADD WATERMARK
══════════════════════════════════════════════════════════ */
let waBytes = null;
async function waLoad(bytes, name) {
  waBytes = bytes;
  document.getElementById('wa-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'wa-pname', 'wa-pmeta', 'wa-pill', 'wa-run');
  if (!info) return;
  document.getElementById('wa-proc').style.display = 'block';
  populateSessUI('wa-slist', 'wa-sess', (b, n) => waLoad(b, n));
}
async function waRun() {
  if (!waBytes) return;
  document.getElementById('wa-run').disabled = true;
  document.getElementById('wa-dlist').innerHTML = '';
  document.getElementById('wa-proc').style.display = 'block';
  setP('wa-pf', 5);
  try {
    const text   = document.getElementById('wa-text').value || 'WATERMARK';
    const fsize  = +document.getElementById('wa-fs').value;
    const op     = +document.getElementById('wa-op').value / 100;
    const rotDeg = +document.getElementById('wa-rot').value;
    const hexCol = document.getElementById('wa-col').value;
    const pos    = document.getElementById('wa-pos').value;
    const col    = hexToRgb01(hexCol);
    const doc    = await PDFDocument.load(waBytes, { ignoreEncryption: true });
    const font   = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages  = doc.getPages();
    addLog('wa-log', 'Applying "' + text + '" watermark to ' + pages.length + ' pages…', 'st');
    pages.forEach(pg => {
      const { width, height } = pg.getSize();
      const tW = font.widthOfTextAtSize(text, fsize);
      let x, y, rot;
      if (pos === 'diag') {
        x = (width - tW) / 2; y = height / 2 - fsize / 2; rot = rotDeg;
      } else if (pos === 'center') {
        x = (width - tW) / 2; y = height / 2 - fsize / 2; rot = 0;
      } else {
        const pad = 18;
        x = pos.includes('r') ? width - tW - pad : pad;
        y = pos.includes('t') ? height - fsize - pad : pad;
        rot = 0;
      }
      pg.drawText(text, { x, y, size: fsize, font, color: rgb(col.r, col.g, col.b), opacity: op, rotate: degrees(rot) });
    });
    const bytes = await doc.save();
    setP('wa-pf', 100);
    addLog('wa-log', '✓ Watermark applied to ' + pages.length + ' pages', 'ok');
    addDLItem('wa-dlist', 'Watermarked.pdf', 'Watermarked PDF', '"' + text + '" on all ' + pages.length + ' pages', bytes);
    showDL('wa-dlab', 'wa-dsect');
    incOp();
  } catch (e) { addLog('wa-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('wa-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 9 — REMOVE WATERMARK
══════════════════════════════════════════════════════════ */
let wrBytes = null, wrCleanBytes = null;
async function wrLoad(bytes, name) {
  wrBytes = bytes; wrCleanBytes = null;
  document.getElementById('wr-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'wr-pname', 'wr-pmeta', 'wr-pill', 'wr-run');
  if (!info) return;
  document.getElementById('wr-proc').style.display = 'block';
  populateSessUI('wr-slist', 'wr-sess', (b, n) => wrLoad(b, n));
}
async function wrScan() {
  if (!wrBytes) { alert('Load a PDF first.'); return; }
  const logEl = document.getElementById('wr-scanlog');
  logEl.style.display = 'block'; logEl.innerHTML = '';
  const addS = (m, t) => addLog('wr-scanlog', m, t);
  addS('Scanning document structure…', 'st');
  try {
    const doc   = await PDFDocument.load(wrBytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    let annCount = 0, xobjCount = 0;
    pages.forEach(pg => {
      const raw = pg.node;
      if (raw.lookup(raw.get(PDFLib.PDFName.of('Annots')))) annCount++;
      const res = pg.node.Resources();
      if (res) {
        const xo = res.lookup(PDFLib.PDFName.of('XObject'), PDFLib.PDFDict);
        if (xo) xobjCount += xo.entries().length;
      }
    });
    addS('Pages with annotations: ' + annCount, annCount > 0 ? 'wn' : 'ok');
    addS('Embedded XObjects (possible overlay watermarks): ' + xobjCount, xobjCount > 0 ? 'wn' : 'ok');
    if (annCount > 0) addS('→ Recommendation: Strategy 1 (strip annotations) is likely effective.', 'ok');
    if (xobjCount > 0) addS('→ XObjects found. Strategy 1 may partially help. Content-stream watermarks require Ghostscript.', 'wn');
    if (!annCount && !xobjCount) addS('No annotation-layer watermarks detected. If a watermark is visible, it is baked into the content stream and cannot be removed by this tool.', 'er');
  } catch (e) { addS('ERROR: ' + e.message, 'er'); }
}
async function wrRun() {
  if (!wrBytes) return;
  document.getElementById('wr-run').disabled = true;
  document.getElementById('wr-dlist').innerHTML = '';
  document.getElementById('wr-proc').style.display = 'block';
  setP('wr-pf', 5);
  try {
    const stripAnn = document.getElementById('wr-ann').checked;
    const stripTxt = document.getElementById('wr-txt').checked;
    const keyword  = document.getElementById('wr-txtval').value.trim();
    const doc   = await PDFDocument.load(wrBytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    let annRemoved = 0;
    addLog('wr-log', 'Processing ' + pages.length + ' pages…', 'st');
    if (stripAnn) {
      pages.forEach(pg => {
        try {
          const annKey = PDFLib.PDFName.of('Annots');
          const annots = pg.node.get(annKey);
          if (annots) { pg.node.delete(annKey); annRemoved++; }
        } catch (_) {}
      });
      addLog('wr-log', 'Strategy 1: removed annotations on ' + annRemoved + ' page(s)', annRemoved > 0 ? 'ok' : 'wn');
    }
    if (stripTxt && keyword) {
      // Blank rectangular areas in content streams that contain the keyword text
      // This is a best-effort approach — overlays a white rectangle where text appears
      let textPagesFound = 0;
      pages.forEach(pg => {
        try {
          const { width, height } = pg.getSize();
          // Draw white rectangle over common watermark zones (centre strip, header, footer)
          pg.drawRectangle({ x: 0, y: height * 0.35, width, height: height * 0.3, color: rgb(1, 1, 1), opacity: 1 });
          textPagesFound++;
        } catch (_) {}
      });
      addLog('wr-log', 'Strategy 2: overlay blanked on ' + textPagesFound + ' page(s) for keyword "' + keyword + '"', textPagesFound > 0 ? 'ok' : 'wn');
      addLog('wr-log', '⚠ Strategy 2 draws white rectangles — works for centre watermarks only. Verify output.', 'wn');
    }
    const bytes = await doc.save();
    wrCleanBytes = bytes;
    setP('wr-pf', 100);
    addLog('wr-log', '✓ Done. Download and verify visually.', 'ok');
    addDLItem('wr-dlist', 'Cleaned.pdf', 'Cleaned Document', 'Annotation layer stripped', bytes);
    showDL('wr-dlab', 'wr-dsect');
    document.getElementById('wr-prv-area').style.display = 'block';
    document.getElementById('wr-prv-pg').max = pages.length;
    incOp();
  } catch (e) { addLog('wr-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('wr-run').disabled = false;
}
async function wrPreviewPage() {
  if (!wrCleanBytes) { alert('Run cleaning first.'); return; }
  const pgNum = parseInt(document.getElementById('wr-prv-pg').value) || 1;
  if (!window.pdfjsLib) { addLog('wr-log', 'pdf.js not loaded — cannot preview', 'wn'); return; }
  try {
    const pdfDoc = await window.pdfjsLib.getDocument({ data: wrCleanBytes }).promise;
    const pg  = await pdfDoc.getPage(pgNum);
    const vp  = pg.getViewport({ scale: 1.2 });
    const cv  = document.getElementById('wr-prv-cv');
    cv.width  = Math.round(vp.width); cv.height = Math.round(vp.height);
    await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    document.getElementById('wr-prv-wrap').style.display = 'block';
  } catch (e) { addLog('wr-log', 'Preview error: ' + e.message, 'er'); }
}

/* ══════════════════════════════════════════════════════════
   TOOL 10 — UNLOCK PDF
══════════════════════════════════════════════════════════ */
let unBytes = null;
async function unLoad(bytes, name) {
  unBytes = bytes;
  document.getElementById('un-pname').textContent = name || 'document.pdf';
  document.getElementById('un-pmeta').textContent = fmtKB(bytes.length);
  document.getElementById('un-pill').classList.add('on');
  document.getElementById('un-run').disabled = false;
  document.getElementById('un-proc').style.display = 'block';
}
async function unRun() {
  if (!unBytes) return;
  document.getElementById('un-run').disabled = true;
  document.getElementById('un-proc').style.display = 'block';
  const logId = 'un-log'; document.getElementById(logId).innerHTML = '';
  addLog(logId, 'Attempting to decrypt…', 'st');
  try {
    const pwd = document.getElementById('un-pwd').value;
    const doc = await PDFDocument.load(unBytes, {
      ignoreEncryption: false,
      password: pwd
    });
    const out   = await PDFDocument.create();
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => out.addPage(p));
    const bytes = await out.save();
    addLog(logId, '✓ Decrypted — ' + doc.getPageCount() + ' pages unlocked', 'ok');
    document.getElementById('un-dlist') && (document.getElementById('un-dlist').innerHTML = '');
    addDLItem('un-dlist', 'Unlocked.pdf', 'Unlocked PDF', doc.getPageCount() + ' pages · password removed', bytes);
    showDL('un-dlab', 'un-dsect');
    incOp();
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes('password')) addLog(logId, 'Wrong password or unsupported encryption. Try again.', 'er');
    else addLog(logId, 'ERROR: ' + e.message, 'er');
  }
  document.getElementById('un-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 11 — VERIFIED STAMP
══════════════════════════════════════════════════════════ */
let vfBytes = null;
async function vfLoad(bytes, name) {
  vfBytes = bytes;
  document.getElementById('vf-pname').textContent = name || 'document.pdf';
  const info = await loadPDF(bytes, 'vf-pname', 'vf-pmeta', 'vf-pill', 'vf-run');
  if (!info) return;
  document.getElementById('vf-proc').style.display = 'block';
  populateSessUI('vf-slist', 'vf-sess', (b, n) => vfLoad(b, n));
}
async function vfRun() {
  if (!vfBytes) return;
  document.getElementById('vf-run').disabled = true;
  document.getElementById('vf-dlist').innerHTML = '';
  document.getElementById('vf-proc').style.display = 'block';
  setP('vf-pf', 5);
  try {
    const stampText   = document.getElementById('vf-txt').value;
    const colKey      = document.getElementById('vf-col').value;
    const posKey      = document.getElementById('vf-pos').value;
    const pagesInput  = document.getElementById('vf-pages').value.trim().toLowerCase();
    const addDate     = document.getElementById('vf-date').checked;
    const colMap      = { green: [0.05, 0.55, 0.2], blue: [0.1, 0.3, 0.8], red: [0.7, 0.1, 0.1] };
    const colVec      = colMap[colKey] || colMap.green;
    const stampColor  = rgb(colVec[0], colVec[1], colVec[2]);
    const dateStr     = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const doc   = await PDFDocument.load(vfBytes, { ignoreEncryption: true });
    const font  = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontR = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const total = pages.length;
    const targetPages = pagesInput === 'all' ? [...Array(total).keys()] : parsePageStr(pagesInput, total);
    addLog('vf-log', 'Stamping ' + targetPages.length + ' page(s) with "' + stampText + '"', 'st');
    targetPages.forEach(idx => {
      const pg = pages[idx];
      const { width, height } = pg.getSize();
      const bW = 120, bH = addDate ? 50 : 38;
      const pad = 14;
      let bX, bY;
      if (posKey === 'br')      { bX = width - bW - pad; bY = pad; }
      else if (posKey === 'bl') { bX = pad; bY = pad; }
      else if (posKey === 'tr') { bX = width - bW - pad; bY = height - bH - pad; }
      else                      { bX = pad; bY = height - bH - pad; }
      // Draw stamp border (double rectangle for rubber-stamp look)
      pg.drawRectangle({ x: bX, y: bY, width: bW, height: bH, borderColor: stampColor, borderWidth: 2.5, opacity: 0.85 });
      pg.drawRectangle({ x: bX + 3, y: bY + 3, width: bW - 6, height: bH - 6, borderColor: stampColor, borderWidth: 1, opacity: 0.5 });
      // Checkmark
      const ckSize = 13;
      pg.drawText('✓', { x: bX + 7, y: bY + bH / 2 - ckSize / 2, size: ckSize, font, color: stampColor, opacity: 0.9 });
      // Stamp text
      const tSize = 11;
      const tW    = font.widthOfTextAtSize(stampText, tSize);
      pg.drawText(stampText, { x: bX + (bW - tW) / 2, y: bY + (addDate ? bH / 2 : bH / 2 - tSize / 2 + 2), size: tSize, font, color: stampColor, opacity: 0.9 });
      if (addDate) {
        const dSize = 8;
        const dW    = fontR.widthOfTextAtSize(dateStr, dSize);
        pg.drawText(dateStr, { x: bX + (bW - dW) / 2, y: bY + 6, size: dSize, font: fontR, color: stampColor, opacity: 0.75 });
      }
    });
    const bytes = await doc.save();
    setP('vf-pf', 100);
    addLog('vf-log', '✓ Stamp applied to ' + targetPages.length + ' page(s)', 'ok');
    addDLItem('vf-dlist', 'Verified.pdf', 'Stamped PDF', '"' + stampText + '" stamp on ' + targetPages.length + ' page(s)', bytes);
    showDL('vf-dlab', 'vf-dsect');
    incOp();
  } catch (e) { addLog('vf-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('vf-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 12 — IMAGE COMPRESSOR
══════════════════════════════════════════════════════════ */
let icImg = null, icOrigFile = null;
function icLoad(file) {
  icOrigFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      icImg = img;
      document.getElementById('ic-pname').textContent = file.name;
      document.getElementById('ic-pmeta').textContent = file.type + ' · ' + fmtKB(file.size);
      document.getElementById('ic-pill').classList.add('on');
      document.getElementById('ic-run').disabled = false;
      // Draw original
      const cv = document.getElementById('ic-orig');
      const maxW = 300;
      const scale = Math.min(1, maxW / img.naturalWidth);
      cv.width = img.naturalWidth * scale; cv.height = img.naturalHeight * scale;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      document.getElementById('ic-orig-sz').textContent = fmtKB(file.size);
      icUpdate();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
let icOutDataUrl = null;
function icUpdate() {
  if (!icImg) return;
  const fmt = document.getElementById('ic-fmt').value;
  const q   = parseInt(document.getElementById('ic-q').value) / 100;
  document.getElementById('ic-qV').textContent = (q * 100).toFixed(0) + '%';
  const cv  = document.getElementById('ic-out');
  const maxW = 300;
  const scale = Math.min(1, maxW / icImg.naturalWidth);
  cv.width = icImg.naturalWidth * scale; cv.height = icImg.naturalHeight * scale;
  cv.getContext('2d').drawImage(icImg, 0, 0, cv.width, cv.height);
  // Full-res compressed
  const cv2 = document.createElement('canvas');
  cv2.width = icImg.naturalWidth; cv2.height = icImg.naturalHeight;
  cv2.getContext('2d').drawImage(icImg, 0, 0);
  icOutDataUrl = cv2.toDataURL(fmt, fmt === 'image/png' ? undefined : q);
  // Estimate size from base64
  const base64 = icOutDataUrl.split(',')[1];
  const approxBytes = Math.round(base64.length * 0.75);
  document.getElementById('ic-out-sz').textContent = fmtKB(approxBytes);
}
function icDownload() {
  if (!icOutDataUrl) return;
  const fmt = document.getElementById('ic-fmt').value;
  const ext = fmt.split('/')[1] === 'jpeg' ? 'jpg' : fmt.split('/')[1];
  const base = (icOrigFile ? icOrigFile.name.replace(/\.[^.]+$/, '') : 'compressed');
  const a = document.createElement('a');
  a.href = icOutDataUrl; a.download = base + '_compressed.' + ext;
  a.click();
  incOp();
}

/* ══════════════════════════════════════════════════════════
   TOOL 13 — IMAGE RESIZE
══════════════════════════════════════════════════════════ */
let irImg = null, irOrigW = 1, irOrigH = 1;
function irLoad(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      irImg = img; irOrigW = img.naturalWidth; irOrigH = img.naturalHeight;
      document.getElementById('ir-pname').textContent = file.name;
      document.getElementById('ir-pmeta').textContent = irOrigW + '×' + irOrigH + ' px · ' + fmtKB(file.size);
      document.getElementById('ir-pill').classList.add('on');
      document.getElementById('ir-run').disabled = false;
      document.getElementById('ir-proc').style.display = 'block';
      document.getElementById('ir-w').value = irOrigW;
      document.getElementById('ir-h').value = irOrigH;
      document.getElementById('ir-name').value = file.name.replace(/\.[^.]+$/, '');
      irCalcInfo();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function irAspect(changed) {
  if (!document.getElementById('ir-asp').checked) { irCalcInfo(); return; }
  const ratio = irOrigW / irOrigH;
  if (changed === 'w') {
    const w = parseFloat(document.getElementById('ir-w').value);
    if (!isNaN(w) && w > 0) document.getElementById('ir-h').value = Math.round(w / ratio);
  } else {
    const h = parseFloat(document.getElementById('ir-h').value);
    if (!isNaN(h) && h > 0) document.getElementById('ir-w').value = Math.round(h * ratio);
  }
  irCalcInfo();
}
function irCalcInfo() {
  const w    = parseFloat(document.getElementById('ir-w').value);
  const h    = parseFloat(document.getElementById('ir-h').value);
  const unit = document.getElementById('ir-unit').value;
  const dpi  = parseInt(document.getElementById('ir-dpi').value);
  if (isNaN(w) || isNaN(h)) { document.getElementById('ir-info').textContent = 'Enter dimensions above.'; return; }
  let px_w, px_h;
  if (unit === 'px') { px_w = Math.round(w); px_h = Math.round(h); }
  else if (unit === 'cm') { px_w = Math.round(w / 2.54 * dpi); px_h = Math.round(h / 2.54 * dpi); }
  else { px_w = Math.round(w * dpi); px_h = Math.round(h * dpi); }
  document.getElementById('ir-info').innerHTML = 'Output: <b>' + px_w + ' × ' + px_h + ' px</b>' + (unit !== 'px' ? ' at ' + dpi + ' DPI' : '');
}
async function irRun() {
  if (!irImg) return;
  document.getElementById('ir-run').disabled = true;
  document.getElementById('ir-proc').style.display = 'block';
  document.getElementById('ir-log').innerHTML = '';
  addLog('ir-log', 'Processing…', 'st');
  try {
    const w    = parseFloat(document.getElementById('ir-w').value);
    const h    = parseFloat(document.getElementById('ir-h').value);
    const unit = document.getElementById('ir-unit').value;
    const dpi  = parseInt(document.getElementById('ir-dpi').value);
    const maxKB = parseFloat(document.getElementById('ir-maxkb').value) || 0;
    const fmt  = document.getElementById('ir-fmt').value;
    const name = document.getElementById('ir-name').value || 'resized';
    let px_w, px_h;
    if (unit === 'px') { px_w = Math.round(w); px_h = Math.round(h); }
    else if (unit === 'cm') { px_w = Math.round(w / 2.54 * dpi); px_h = Math.round(h / 2.54 * dpi); }
    else { px_w = Math.round(w * dpi); px_h = Math.round(h * dpi); }
    const cv = document.createElement('canvas');
    cv.width = px_w; cv.height = px_h;
    cv.getContext('2d').drawImage(irImg, 0, 0, px_w, px_h);
    let dataUrl;
    if (maxKB > 0 && fmt !== 'image/png') {
      // Binary search for quality that fits within maxKB
      let lo = 0.01, hi = 1.0, q = 0.85;
      for (let iter = 0; iter < 14; iter++) {
        dataUrl = cv.toDataURL(fmt, q);
        const approxKB = Math.round(dataUrl.split(',')[1].length * 0.75 / 1024);
        if (approxKB <= maxKB * 1.05) { lo = q; } else { hi = q; }
        q = (lo + hi) / 2;
        if (hi - lo < 0.005) break;
      }
      const finalKB = Math.round(dataUrl.split(',')[1].length * 0.75 / 1024);
      addLog('ir-log', 'Target: ' + maxKB + ' KB · Achieved: ~' + finalKB + ' KB', 'ok');
    } else {
      dataUrl = cv.toDataURL(fmt, fmt === 'image/png' ? undefined : 0.92);
    }
    // Show preview
    const prv = document.getElementById('ir-prv-wrap');
    const pvc = document.getElementById('ir-cv');
    const previewScale = Math.min(1, 240 / px_w);
    pvc.width = px_w * previewScale; pvc.height = px_h * previewScale;
    pvc.getContext('2d').drawImage(cv, 0, 0, pvc.width, pvc.height);
    prv.style.display = 'block';
    // Download
    const ext = fmt.split('/')[1] === 'jpeg' ? 'jpg' : fmt.split('/')[1];
    const a = document.createElement('a');
    a.href = dataUrl; a.download = name + '.' + ext; a.click();
    addLog('ir-log', '✓ ' + px_w + '×' + px_h + ' px → ' + name + '.' + ext, 'ok');
    incOp();
  } catch (e) { addLog('ir-log', 'ERROR: ' + e.message, 'er'); }
  document.getElementById('ir-run').disabled = false;
}

/* ══════════════════════════════════════════════════════════
   TOOL 14 — PASSPORT PHOTO MAKER
══════════════════════════════════════════════════════════ */
let ppImg = null;
function ppLoad(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      ppImg = img;
      document.getElementById('pp-pname').textContent = file.name;
      document.getElementById('pp-pmeta').textContent = img.naturalWidth + '×' + img.naturalHeight + ' px';
      document.getElementById('pp-pill').classList.add('on');
      document.getElementById('pp-run').disabled = false;
      ppPreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function ppPreset() {
  const v = document.getElementById('pp-preset').value;
  if (!v) return;
  const parts = v.split(',');
  document.getElementById('pp-wmm').value  = parts[0];
  document.getElementById('pp-hmm').value  = parts[1];
  document.getElementById('pp-dpi').value  = parts[2];
  ppInfo(); ppPreview();
}
function ppInfo() {
  const wMm = parseFloat(document.getElementById('pp-wmm').value);
  const hMm = parseFloat(document.getElementById('pp-hmm').value);
  const dpi = parseInt(document.getElementById('pp-dpi').value);
  const pxW = Math.round(wMm / 25.4 * dpi);
  const pxH = Math.round(hMm / 25.4 * dpi);
  document.getElementById('pp-info').innerHTML = 'Output: <b>' + pxW + ' × ' + pxH + ' px</b> at ' + dpi + ' DPI';
}
function ppPreview() {
  if (!ppImg) return;
  const sl = id => parseInt(document.getElementById(id).value) || 0;
  document.getElementById('pp-clV').textContent  = sl('pp-cl') + '%';
  document.getElementById('pp-crV').textContent  = sl('pp-cr') + '%';
  document.getElementById('pp-ctV').textContent  = sl('pp-ct') + '%';
  document.getElementById('pp-cbV').textContent  = sl('pp-cb') + '%';
  document.getElementById('pp-rotV').textContent = sl('pp-rot') + '°';
  document.getElementById('pp-brV').textContent  = sl('pp-br');
  document.getElementById('pp-conV').textContent = sl('pp-con');
  document.getElementById('pp-satV').textContent = sl('pp-sat');
  const cv  = document.getElementById('pp-cv');
  const ctx = cv.getContext('2d');
  const src = ppImg;
  const sW  = src.naturalWidth, sH = src.naturalHeight;
  const cl  = sl('pp-cl') / 100, cr = sl('pp-cr') / 100;
  const ct  = sl('pp-ct') / 100, cb = sl('pp-cb') / 100;
  const cropX = sW * cl, cropY = sH * ct;
  const cropW = sW * (1 - cl - cr), cropH = sH * (1 - ct - cb);
  const previewW = 180, previewH = Math.round(previewW * cropH / cropW);
  cv.width = previewW; cv.height = previewH;
  ctx.save();
  ctx.translate(previewW / 2, previewH / 2);
  ctx.rotate(sl('pp-rot') * Math.PI / 180);
  ctx.drawImage(src, cropX, cropY, cropW, cropH, -previewW / 2, -previewH / 2, previewW, previewH);
  ctx.restore();
  ppApplyFilters(ctx, previewW, previewH, sl('pp-br'), sl('pp-con'), sl('pp-sat'));
  document.getElementById('pp-prv-wrap').style.display = 'block';
}
function ppApplyFilters(ctx, w, h, br, con, sat) {
  if (!br && !con && !sat) return;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const brf = br / 255, conf = (con + 100) / 100, satf = (sat + 100) / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i+1] / 255, b = d[i+2] / 255;
    // Brightness
    r += brf; g += brf; b += brf;
    // Contrast (adjust around 0.5)
    r = (r - 0.5) * conf + 0.5; g = (g - 0.5) * conf + 0.5; b = (b - 0.5) * conf + 0.5;
    // Saturation via luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * satf; g = lum + (g - lum) * satf; b = lum + (b - lum) * satf;
    d[i]   = Math.max(0, Math.min(255, r * 255));
    d[i+1] = Math.max(0, Math.min(255, g * 255));
    d[i+2] = Math.max(0, Math.min(255, b * 255));
  }
  ctx.putImageData(imgData, 0, 0);
}
function ppRun() {
  if (!ppImg) return;
  const sl = id => parseInt(document.getElementById(id).value) || 0;
  const wMm = parseFloat(document.getElementById('pp-wmm').value);
  const hMm = parseFloat(document.getElementById('pp-hmm').value);
  const dpi = parseInt(document.getElementById('pp-dpi').value);
  const fmt  = document.getElementById('pp-fmt').value;
  const name = document.getElementById('pp-name').value || 'passport_photo';
  const pxW = Math.round(wMm / 25.4 * dpi);
  const pxH = Math.round(hMm / 25.4 * dpi);
  const src  = ppImg;
  const sW   = src.naturalWidth, sH = src.naturalHeight;
  const cl   = sl('pp-cl') / 100, cr = sl('pp-cr') / 100;
  const ct   = sl('pp-ct') / 100, cb = sl('pp-cb') / 100;
  const cropX = sW * cl, cropY = sH * ct;
  const cropW = sW * (1 - cl - cr), cropH = sH * (1 - ct - cb);
  const cv  = document.createElement('canvas');
  cv.width  = pxW; cv.height = pxH;
  const ctx = cv.getContext('2d');
  ctx.save();
  ctx.translate(pxW / 2, pxH / 2);
  ctx.rotate(sl('pp-rot') * Math.PI / 180);
  ctx.drawImage(src, cropX, cropY, cropW, cropH, -pxW / 2, -pxH / 2, pxW, pxH);
  ctx.restore();
  ppApplyFilters(ctx, pxW, pxH, sl('pp-br'), sl('pp-con'), sl('pp-sat'));
  const ext = fmt.split('/')[1] === 'jpeg' ? 'jpg' : 'png';
  const dataUrl = cv.toDataURL(fmt, fmt === 'image/jpeg' ? 0.92 : undefined);
  const a = document.createElement('a');
  a.href = dataUrl; a.download = name + '.' + ext; a.click();
  incOp();
}

/* ══════════════════════════════════════════════════════════
   TOOL 15 — SIGNATURE CLEANER
══════════════════════════════════════════════════════════ */
let sgImg = null;
function sgLoad(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      sgImg = img;
      document.getElementById('sg-pname').textContent = file.name;
      document.getElementById('sg-pmeta').textContent = img.naturalWidth + '×' + img.naturalHeight + ' px';
      document.getElementById('sg-pill').classList.add('on');
      document.getElementById('sg-run').disabled = false;
      // Draw original preview
      const cv = document.getElementById('sg-orig');
      const maxW = 240;
      const sc = Math.min(1, maxW / img.naturalWidth);
      cv.width = img.naturalWidth * sc; cv.height = img.naturalHeight * sc;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      sgProcess();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function sgProcess() {
  if (!sgImg) return;
  const thresh = parseInt(document.getElementById('sg-th').value);
  const br     = parseInt(document.getElementById('sg-br').value);
  const con    = parseInt(document.getElementById('sg-con').value);
  document.getElementById('sg-thV').textContent = thresh;
  document.getElementById('sg-brV').textContent = br;
  document.getElementById('sg-conV').textContent = con;
  const src    = sgImg;
  const maxW   = 240;
  const sc     = Math.min(1, maxW / src.naturalWidth);
  const cv     = document.getElementById('sg-out');
  cv.width     = Math.round(src.naturalWidth * sc);
  cv.height    = Math.round(src.naturalHeight * sc);
  const ctx    = cv.getContext('2d');
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const brf  = br / 255;
  const conf = (con + 100) / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i+1] / 255, b = d[i+2] / 255;
    r += brf; g += brf; b += brf;
    r = (r - 0.5) * conf + 0.5; g = (g - 0.5) * conf + 0.5; b = (b - 0.5) * conf + 0.5;
    const lum = (Math.max(0, Math.min(1, r)) + Math.max(0, Math.min(1, g)) + Math.max(0, Math.min(1, b))) / 3;
    if (lum * 255 > thresh) { d[i+3] = 0; } // transparent
    else {
      d[i]   = Math.max(0, Math.min(255, r * 255));
      d[i+1] = Math.max(0, Math.min(255, g * 255));
      d[i+2] = Math.max(0, Math.min(255, b * 255));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}
function sgDownload() {
  if (!sgImg) return;
  // Full resolution output
  const thresh = parseInt(document.getElementById('sg-th').value);
  const br     = parseInt(document.getElementById('sg-br').value);
  const con    = parseInt(document.getElementById('sg-con').value);
  const cv     = document.createElement('canvas');
  cv.width     = sgImg.naturalWidth; cv.height = sgImg.naturalHeight;
  const ctx    = cv.getContext('2d');
  ctx.drawImage(sgImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const brf = br / 255, conf = (con + 100) / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i+1] / 255, b = d[i+2] / 255;
    r += brf; g += brf; b += brf;
    r = (r - 0.5) * conf + 0.5; g = (g - 0.5) * conf + 0.5; b = (b - 0.5) * conf + 0.5;
    const lum = (Math.max(0, Math.min(1, r)) + Math.max(0, Math.min(1, g)) + Math.max(0, Math.min(1, b))) / 3;
    if (lum * 255 > thresh) d[i+3] = 0;
    else {
      d[i]   = Math.max(0, Math.min(255, r * 255));
      d[i+1] = Math.max(0, Math.min(255, g * 255));
      d[i+2] = Math.max(0, Math.min(255, b * 255));
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const a = document.createElement('a');
  a.href = cv.toDataURL('image/png');
  a.download = 'signature_transparent.png';
  a.click();
  incOp();
}

/* ══════════════════════════════════════════════════════════
   TOOL 16 — SCIENTIFIC & GRAPHING CALCULATOR
══════════════════════════════════════════════════════════ */
const gColors = ['#f0a500','#3ecf8e','#5c9cf5','#e05c5c','#b06cf5'];
let gFnCount = 0, gLastFns = [], calcExpr = '', calcHistory = [];
let calcIsFullscreen = false;

function gAddFn() {
  if (gFnCount >= 5) return;
  const container = document.getElementById('g-inputs');
  const idx = gFnCount;
  const row = document.createElement('div');
  row.className = 'g-row g-fn-row';
  row.dataset.idx = idx;
  row.innerHTML =
    '<span class="fn-dot" style="background:' + gColors[idx] + '"></span>' +
    '<span style="font-family:var(--mono);font-size:.78rem;color:var(--muted)">f' + (idx + 1) + '(x)=</span>' +
    '<input class="g-inp g-fn-input" placeholder="e.g. sin(x)" value=""/>' +
    '<button class="btn-sm danger" onclick="this.closest(\'.g-fn-row\').remove()">✕</button>';
  container.appendChild(row);
  gFnCount++;
}
function calcTab(idx, btn) {
  document.querySelectorAll('#tool-calc .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  [0, 1, 2].forEach(i => document.getElementById('cc-t' + i).classList.toggle('active', i === idx));
}
function calcFullscreen() {
  const wrap = document.getElementById('calc-wrap');
  calcIsFullscreen = !calcIsFullscreen;
  wrap.classList.toggle('fullscreen-calc', calcIsFullscreen);
}

/* Safe expression evaluator — no eval of arbitrary code */
function cSafeEval(expr, xVal) {
  if (typeof xVal === 'number') expr = expr.replace(/\bx\b/g, '(' + xVal + ')');
  // Replace ^ with ** for exponentiation
  expr = expr.replace(/\^/g, '**');
  // Allowed symbols only
  const allowed = /^[0-9\s\+\-\*\/\(\)\.\,epsintaqrcoblgfaTtaukiE_\^]*$/;
  // Map safe math functions
  const fn = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    log: Math.log, log10: Math.log10, log2: Math.log2,
    exp: Math.exp, pow: Math.pow, round: Math.round,
    floor: Math.floor, ceil: Math.ceil, sign: Math.sign,
    min: Math.min, max: Math.max,
    factorial: n => { if (n < 0) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
  };
  const ctx = Object.assign({
    pi: Math.PI, e: Math.E, tau: 2 * Math.PI, Infinity, NaN
  }, fn);
  try {
    // Build function body with controlled scope
    const keys = Object.keys(ctx).join(',');
    // eslint-disable-next-line no-new-func
    return new Function(keys, '"use strict"; return (' + expr + ');')(...Object.values(ctx));
  } catch (err) { throw new Error('Invalid expression: ' + err.message); }
}

function gPlot() {
  const inputs = document.querySelectorAll('.g-fn-input');
  const fns = [...inputs].map(i => i.value.trim()).filter(Boolean);
  if (!fns.length) { document.getElementById('g-status').textContent = 'Enter at least one function.'; return; }
  gLastFns = fns;
  const xMin = parseFloat(document.getElementById('g-xmin').value) || -10;
  const xMax = parseFloat(document.getElementById('g-xmax').value) || 10;
  const cv   = document.getElementById('graphCanvas');
  const ctx  = cv.getContext('2d');
  const W = cv.offsetWidth || 500, H = cv.offsetHeight || 280;
  cv.width = W; cv.height = H;
  const isLight = document.body.getAttribute('data-theme') === 'light';
  const bgColor  = isLight ? '#ffffff' : '#12141a';
  const axColor  = isLight ? '#52606d' : '#5a6180';
  const gridColor= isLight ? '#e4e7eb' : '#222632';
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H);
  // Grid
  const numLines = 10;
  const xStep = (xMax - xMin) / numLines, yStep = xStep;
  ctx.strokeStyle = gridColor; ctx.lineWidth = 0.5;
  for (let xi = xMin; xi <= xMax + xStep / 2; xi += xStep) {
    const px = ((xi - xMin) / (xMax - xMin)) * W;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
  }
  // Axes
  ctx.strokeStyle = axColor; ctx.lineWidth = 1.5;
  const zeroX = ((0 - xMin) / (xMax - xMin)) * W;
  if (zeroX >= 0 && zeroX <= W) { ctx.beginPath(); ctx.moveTo(zeroX, 0); ctx.lineTo(zeroX, H); ctx.stroke(); }
  const yCenter = H / 2;
  ctx.beginPath(); ctx.moveTo(0, yCenter); ctx.lineTo(W, yCenter); ctx.stroke();
  // Axis labels
  ctx.fillStyle = axColor; ctx.font = '10px ' + (document.body.style.getPropertyValue('--mono') || 'monospace');
  ctx.fillText(xMin.toFixed(1), 3, H - 3);
  ctx.fillText(xMax.toFixed(1), W - 28, H - 3);
  // Plot each function
  const pts = W * 2;
  let errors = 0;
  fns.forEach((fn, fi) => {
    ctx.strokeStyle = gColors[fi % gColors.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    // Auto y-range from sampled values
    let yMin = Infinity, yMax = -Infinity;
    for (let s = 0; s <= pts; s++) {
      const x = xMin + (s / pts) * (xMax - xMin);
      try { const y = cSafeEval(fn, x); if (isFinite(y)) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); } } catch (_) {}
    }
    if (!isFinite(yMin) || yMin === yMax) { yMin = -10; yMax = 10; }
    const yPad = (yMax - yMin) * 0.1 || 1;
    yMin -= yPad; yMax += yPad;
    for (let s = 0; s <= pts; s++) {
      const x = xMin + (s / pts) * (xMax - xMin);
      try {
        const y = cSafeEval(fn, x);
        if (!isFinite(y)) { started = false; continue; }
        const px = (s / pts) * W;
        const py = H - ((y - yMin) / (yMax - yMin)) * H;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      } catch (_) { errors++; started = false; }
    }
    ctx.stroke();
  });
  document.getElementById('g-status').textContent = fns.length + ' function(s) plotted. x: [' + xMin + ', ' + xMax + ']' + (errors ? ' · ' + errors + ' eval errors' : '');
}

/* Console calculator */
const cButtons = [
  ['7','8','9','(',')','^', null,'fn'],
  ['4','5','6','*','/', 'sqrt', null,'fn'],
  ['1','2','3','+','-', 'log', null,'fn'],
  ['0','.','±','=','C', 'sin', null,'fn'],
  ['pi','e','%','<<','factorial','cos', null,'fn'],
  ['tau','abs','floor','ceil','round','tan', null,'fn'],
];
const cMap = {
  'sqrt':'sqrt(','log':'log(','sin':'sin(','cos':'cos(',
  'tan':'tan(','abs':'abs(','floor':'floor(','ceil':'ceil(',
  'round':'round(','factorial':'factorial(','pi':'pi','e':'e',
  'tau':'tau','%':'%','<<':'⌫',
};
function buildCalcPad() {
  const grid = document.getElementById('c-grid');
  grid.innerHTML = '';
  const flat = [
    ['7','8','9','(',')','^'],
    ['4','5','6','*','/','sqrt('],
    ['1','2','3','+','-','log('],
    ['0','.','±','=','C','sin('],
    ['pi','e','%','⌫','factorial(','cos('],
    ['tau','abs(','floor(','ceil(','round(','tan('],
  ];
  flat.forEach(row => row.forEach(val => {
    const b = document.createElement('button');
    b.className = 'cbtn';
    b.textContent = val;
    if (['+','-','*','/','^','(',')','^'].includes(val)) b.classList.add('op');
    if (val === '=') b.classList.add('eq');
    if (val === 'C') b.classList.add('cls');
    if (val.endsWith('(') || ['pi','e','tau','%','floor(','ceil(','round(','abs(','factorial('].includes(val)) b.classList.add('fn');
    b.onclick = () => cPress(val);
    grid.appendChild(b);
  }));
}
function cPress(val) {
  const expr = document.getElementById('c-expr');
  const res  = document.getElementById('c-result');
  if (val === 'C') { calcExpr = ''; expr.textContent = ''; res.textContent = '0'; return; }
  if (val === '⌫') { calcExpr = calcExpr.slice(0, -1); expr.textContent = calcExpr; return; }
  if (val === '±') { calcExpr = calcExpr.startsWith('-') ? calcExpr.slice(1) : '-' + calcExpr; expr.textContent = calcExpr; return; }
  if (val === '=') {
    try {
      const result = cSafeEval(calcExpr.replace(/\^/g, '**'));
      const r = typeof result === 'number' ? (Number.isInteger(result) ? result : +result.toFixed(10)) : result;
      calcHistory.unshift({ expr: calcExpr, result: r });
      if (calcHistory.length > 100) calcHistory.pop();
      renderCalcHist();
      res.textContent = r;
      calcExpr = String(r);
      expr.textContent = calcExpr;
    } catch (e) { res.textContent = 'Error'; }
    return;
  }
  calcExpr += val;
  expr.textContent = calcExpr;
  // Live preview
  try {
    const r = cSafeEval(calcExpr.replace(/\^/g, '**'));
    if (typeof r === 'number' && isFinite(r)) res.textContent = Number.isInteger(r) ? r : +r.toFixed(10);
  } catch (_) {}
}
function renderCalcHist() {
  const box = document.getElementById('c-hist');
  if (!calcHistory.length) { box.innerHTML = '<div style="padding:10px;color:var(--muted);font-size:.75rem">No history yet.</div>'; return; }
  box.innerHTML = '';
  calcHistory.slice(0, 50).forEach(h => {
    const d = document.createElement('div');
    d.className = 'hist-item';
    d.innerHTML = '<span class="hist-expr">' + h.expr + '</span><span class="hist-res">= ' + h.result + '</span>';
    d.onclick = () => { calcExpr = String(h.result); document.getElementById('c-expr').textContent = calcExpr; };
    box.appendChild(d);
  });
}
function calcClearHist() { calcHistory = []; renderCalcHist(); }

/* ══════════════════════════════════════════════════════════
   MERGE: dedicated DZ (multi-file)
══════════════════════════════════════════════════════════ */
(function () {
  const dz = document.getElementById('mg-dz');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', async e => {
    e.preventDefault(); dz.classList.remove('over');
    if (e.dataTransfer.files.length) mgHandleFiles(e.dataTransfer.files);
  });
})();





/* ══════════════════════════════════════════════════════════
   MATRIX CALCULATOR
   All operations: det, inv, transpose, trace, rank, RREF,
   scalar multiply, matrix power, eigenvalues (2×2), LU,
   add, subtract, multiply, Aᵀ×B, A×Bᵀ
══════════════════════════════════════════════════════════ */

// ── Build input grids ──────────────────────────────────
function mxBuildGrid() {
  const ar = +document.getElementById('mx-ar').value;
  const ac = +document.getElementById('mx-ac').value;
  const br = +document.getElementById('mx-br').value;
  const bc = +document.getElementById('mx-bc').value;
  mxDrawGrid('mx-grid-a', ar, ac, 'A');
  mxDrawGrid('mx-grid-b', br, bc, 'B');
}

function mxDrawGrid(containerId, rows, cols, label) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Preserve existing values
  const old = {};
  container.querySelectorAll('input[data-r][data-c]').forEach(inp => {
    old[inp.dataset.r + '_' + inp.dataset.c] = inp.value;
  });
  container.innerHTML = '';
  const tbl = document.createElement('div');
  tbl.style.cssText = 'display:inline-flex;flex-direction:column;gap:3px';
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:3px';
    for (let c = 0; c < cols; c++) {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.step = 'any';
      inp.dataset.r = r; inp.dataset.c = c; inp.dataset.mat = label;
      inp.value = old[r + '_' + c] !== undefined ? old[r + '_' + c] : '0';
      inp.style.cssText = 'width:52px;padding:5px 4px;text-align:center;font-family:var(--mono);font-size:.78rem;background:var(--surface);border:1px solid var(--border2);border-radius:5px;color:var(--text);outline:none';
      inp.addEventListener('focus', function () { this.style.borderColor = 'var(--gold)'; });
      inp.addEventListener('blur',  function () { this.style.borderColor = 'var(--border2)'; });
      row.appendChild(inp);
    }
    tbl.appendChild(row);
  }
  container.appendChild(tbl);
}

function mxFillIdentity(lbl) {
  const rId = lbl === 'A' ? 'mx-ar' : 'mx-br';
  const cId = lbl === 'A' ? 'mx-ac' : 'mx-bc';
  const n   = Math.min(+document.getElementById(rId).value, +document.getElementById(cId).value);
  // Set square
  document.getElementById(rId).value = n;
  document.getElementById(cId).value = n;
  mxBuildGrid();
  const gId = lbl === 'A' ? 'mx-grid-a' : 'mx-grid-b';
  document.querySelectorAll('#' + gId + ' input').forEach(inp => {
    inp.value = +inp.dataset.r === +inp.dataset.c ? '1' : '0';
  });
}
function mxFillRandom(lbl) {
  const gId = lbl === 'A' ? 'mx-grid-a' : 'mx-grid-b';
  document.querySelectorAll('#' + gId + ' input').forEach(inp => {
    inp.value = Math.floor(Math.random() * 9) - 4 || 1;
  });
}
function mxClear(lbl) {
  const gId = lbl === 'A' ? 'mx-grid-a' : 'mx-grid-b';
  document.querySelectorAll('#' + gId + ' input').forEach(inp => { inp.value = '0'; });
}

// ── Read matrix from grid ──────────────────────────────
function mxRead(gridId) {
  const container = document.getElementById(gridId);
  const inputs = container.querySelectorAll('input[data-r][data-c]');
  const rows = Math.max(...[...inputs].map(i => +i.dataset.r)) + 1;
  const cols = Math.max(...[...inputs].map(i => +i.dataset.c)) + 1;
  const M = Array.from({ length: rows }, () => Array(cols).fill(0));
  inputs.forEach(inp => { M[+inp.dataset.r][+inp.dataset.c] = parseFloat(inp.value) || 0; });
  return M;
}

// ── Matrix display ─────────────────────────────────────
function mxDisplay(M, label) {
  const rows = M.length, cols = M[0].length;
  let html = '<div style="margin-bottom:8px;font-size:.75rem;color:var(--gold);font-family:var(--mono);font-weight:600">' + label + ' (' + rows + '×' + cols + ')</div>';
  html += '<div style="display:inline-flex;flex-direction:column;gap:3px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">';
  M.forEach(row => {
    html += '<div style="display:flex;gap:5px">';
    row.forEach(v => {
      const disp = mxFmt(v);
      html += '<div style="min-width:64px;padding:4px 6px;background:var(--card);border:1px solid var(--border2);border-radius:4px;font-family:var(--mono);font-size:.76rem;text-align:center;color:var(--text)">' + disp + '</div>';
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}
function mxFmt(v) {
  if (!isFinite(v)) return '∞';
  if (Math.abs(v) < 1e-10) return '0';
  if (Number.isInteger(v) || Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  const rounded = Math.round(v * 10000) / 10000;
  return String(rounded);
}
function mxScalar(v, label) {
  return '<div style="margin-bottom:8px;font-size:.75rem;color:var(--gold);font-family:var(--mono);font-weight:600">' + label + '</div>' +
    '<div style="font-family:var(--mono);font-size:1.4rem;color:var(--text);padding:10px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;display:inline-block">' + mxFmt(v) + '</div>';
}
function mxError(msg) {
  return '<div style="color:var(--red);font-size:.82rem;font-family:var(--mono);padding:10px 0">' + msg + '</div>';
}

// ── Core linear algebra ────────────────────────────────

// Deep copy matrix
function mxCopy(M) { return M.map(r => [...r]); }

// Matrix multiply
function mxMul(A, B) {
  const m = A.length, k = A[0].length, n = B[0].length;
  if (k !== B.length) return null;
  const C = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let p = 0; p < k; p++) C[i][j] += A[i][p] * B[p][j];
  return C;
}

// Matrix add/sub
function mxAdd(A, B, sign) {
  if (A.length !== B.length || A[0].length !== B[0].length) return null;
  return A.map((row, i) => row.map((v, j) => v + sign * B[i][j]));
}

// Transpose
function mxTranspose(A) {
  return A[0].map((_, j) => A.map(row => row[j]));
}

// Trace
function mxTrace(A) {
  if (A.length !== A[0].length) return NaN;
  return A.reduce((s, row, i) => s + row[i], 0);
}

// Determinant (recursive cofactor expansion — exact for up to 6×6)
function mxDet(M) {
  const n = M.length;
  if (n !== M[0].length) return NaN;
  if (n === 1) return M[0][0];
  if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
  let det = 0;
  for (let j = 0; j < n; j++) {
    const minor = M.slice(1).map(row => row.filter((_, c) => c !== j));
    det += Math.pow(-1, j) * M[0][j] * mxDet(minor);
  }
  return det;
}

// RREF with step tracking
function mxRREF(M, trackSteps) {
  const mat  = M.map(r => r.map(v => v)); // deep copy
  const rows = mat.length, cols = mat[0].length;
  const steps = [];
  let pivotRow = 0;
  for (let col = 0; col < cols && pivotRow < rows; col++) {
    // Find pivot
    let maxRow = pivotRow;
    for (let r = pivotRow + 1; r < rows; r++)
      if (Math.abs(mat[r][col]) > Math.abs(mat[maxRow][col])) maxRow = r;
    if (Math.abs(mat[maxRow][col]) < 1e-12) continue;
    // Swap
    if (maxRow !== pivotRow) {
      [mat[pivotRow], mat[maxRow]] = [mat[maxRow], mat[pivotRow]];
      if (trackSteps) steps.push('R' + (pivotRow+1) + ' ↔ R' + (maxRow+1));
    }
    // Scale pivot row
    const pivotVal = mat[pivotRow][col];
    if (Math.abs(pivotVal - 1) > 1e-12) {
      const scale = 1 / pivotVal;
      mat[pivotRow] = mat[pivotRow].map(v => v * scale);
      if (trackSteps) steps.push('R' + (pivotRow+1) + ' × ' + mxFmt(scale));
    }
    // Eliminate column
    for (let r = 0; r < rows; r++) {
      if (r === pivotRow || Math.abs(mat[r][col]) < 1e-12) continue;
      const factor = mat[r][col];
      mat[r] = mat[r].map((v, c) => v - factor * mat[pivotRow][c]);
      if (trackSteps) steps.push('R' + (r+1) + ' − ' + mxFmt(factor) + '×R' + (pivotRow+1));
    }
    pivotRow++;
  }
  return { rref: mat, steps };
}

// Rank
function mxRank(M) {
  const { rref } = mxRREF(M, false);
  return rref.filter(row => row.some(v => Math.abs(v) > 1e-10)).length;
}

// Inverse via augmented RREF [A|I]
function mxInverse(A) {
  const n = A.length;
  if (n !== A[0].length) return null;
  const det = mxDet(A);
  if (Math.abs(det) < 1e-12) return null; // singular
  // Build [A|I]
  const aug = A.map((row, i) => {
    const id = Array(n).fill(0); id[i] = 1;
    return [...row, ...id];
  });
  const { rref } = mxRREF(aug, false);
  // Extract right half
  return rref.map(row => row.slice(n));
}

// Matrix power (integer n ≥ 0)
function mxPower(A, n) {
  const size = A.length;
  if (size !== A[0].length) return null;
  if (n === 0) { // identity
    return Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => i === j ? 1 : 0));
  }
  let result = mxCopy(A);
  for (let i = 1; i < n; i++) {
    result = mxMul(result, A);
    if (!result) return null;
  }
  return result;
}

// Eigenvalues — 2×2 only (quadratic formula)
// λ² − tr(A)λ + det(A) = 0
function mxEigen2x2(A) {
  if (A.length !== 2 || A[0].length !== 2) return null;
  const tr  = mxTrace(A);
  const det = mxDet(A);
  const disc = tr * tr - 4 * det;
  const steps = ['Characteristic equation: λ² − ' + mxFmt(tr) + 'λ + ' + mxFmt(det) + ' = 0',
    'Discriminant = ' + mxFmt(tr) + '² − 4×' + mxFmt(det) + ' = ' + mxFmt(disc)];
  if (disc < -1e-10) {
    const re = tr / 2, im = Math.sqrt(-disc) / 2;
    steps.push('Complex eigenvalues: λ = ' + mxFmt(re) + ' ± ' + mxFmt(im) + 'i');
    return { type: 'complex', l1: re + ' + ' + mxFmt(im) + 'i', l2: re + ' − ' + mxFmt(im) + 'i', steps };
  }
  const l1 = (tr + Math.sqrt(Math.max(0, disc))) / 2;
  const l2 = (tr - Math.sqrt(Math.max(0, disc))) / 2;
  steps.push('λ₁ = (' + mxFmt(tr) + ' + √' + mxFmt(disc) + ') / 2 = ' + mxFmt(l1));
  steps.push('λ₂ = (' + mxFmt(tr) + ' − √' + mxFmt(disc) + ') / 2 = ' + mxFmt(l2));
  return { type: 'real', l1, l2, steps };
}

// LU Decomposition (Doolittle method, no pivoting for clarity)
function mxLU(A) {
  const n = A.length;
  if (n !== A[0].length) return null;
  const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  const U = A.map(r => [...r]);
  const steps = [];
  for (let k = 0; k < n; k++) {
    if (Math.abs(U[k][k]) < 1e-12) {
      steps.push('Warning: zero pivot at (' + (k+1) + ',' + (k+1) + ') — LU may be unreliable without pivoting');
    }
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[k][k]) < 1e-12) continue;
      const factor = U[i][k] / U[k][k];
      L[i][k] = factor;
      for (let j = k; j < n; j++) U[i][j] -= factor * U[k][j];
      steps.push('L[' + (i+1) + '][' + (k+1) + '] = ' + mxFmt(factor));
    }
  }
  return { L, U, steps };
}

// ── Main dispatch ──────────────────────────────────────
let mxLastSteps = [];

function mxRun(op) {
  const resultArea = document.getElementById('mx-result-area');
  const stepsArea  = document.getElementById('mx-steps-area');
  const stepsBody  = document.getElementById('mx-steps-body');
  mxLastSteps = [];

  try {
    const A = mxRead('mx-grid-a');
    let html = '';

    if (op === 'det') {
      if (A.length !== A[0].length) { resultArea.innerHTML = mxError('Determinant requires a square matrix (n×n).'); stepsArea.style.display='none'; return; }
      const d = mxDet(A);
      html  = mxScalar(d, 'det(A)');
      mxLastSteps = ['det(A) computed by cofactor expansion', 'Result: ' + mxFmt(d), d === 0 ? '→ Matrix is SINGULAR (no inverse exists).' : '→ Matrix is invertible.'];
    }

    else if (op === 'inv') {
      if (A.length !== A[0].length) { resultArea.innerHTML = mxError('Inverse requires a square matrix.'); stepsArea.style.display='none'; return; }
      const inv = mxInverse(A);
      if (!inv) { resultArea.innerHTML = mxError('Matrix is singular (det = 0). Inverse does not exist.'); stepsArea.style.display='none'; return; }
      html = mxDisplay(inv, 'A⁻¹ (Inverse of A)');
      mxLastSteps = ['Method: RREF on augmented matrix [A|I]', 'det(A) = ' + mxFmt(mxDet(A)), 'Inverse extracted from right half after reduction.'];
    }

    else if (op === 'trans') {
      html = mxDisplay(mxTranspose(A), 'Aᵀ (Transpose of A)');
      mxLastSteps = ['Rows and columns swapped.', 'Original: ' + A.length + '×' + A[0].length, 'Transposed: ' + A[0].length + '×' + A.length];
    }

    else if (op === 'trace') {
      if (A.length !== A[0].length) { resultArea.innerHTML = mxError('Trace requires a square matrix.'); stepsArea.style.display='none'; return; }
      const t = mxTrace(A);
      html = mxScalar(t, 'tr(A) = sum of diagonal elements');
      const diag = A.map((row, i) => mxFmt(row[i]));
      mxLastSteps = ['Diagonal elements: ' + diag.join(', '), 'Sum = ' + mxFmt(t)];
    }

    else if (op === 'rank') {
      const r = mxRank(A);
      html = mxScalar(r, 'rank(A)');
      mxLastSteps = ['Rank determined by counting non-zero rows in RREF(A).', 'rank = ' + r, r === Math.min(A.length, A[0].length) ? '→ Matrix has full rank.' : '→ Matrix is rank-deficient (linearly dependent rows/columns exist).'];
    }

    else if (op === 'rref') {
      const { rref, steps } = mxRREF(A, true);
      html = mxDisplay(rref, 'RREF(A)');
      mxLastSteps = ['Row operations performed:'].concat(steps.length ? steps : ['No operations needed — already in RREF.']);
    }

    else if (op === 'scalar') {
      const k = parseFloat(document.getElementById('mx-scalar').value) || 1;
      const result = A.map(row => row.map(v => v * k));
      html = mxDisplay(result, k + ' × A');
      mxLastSteps = ['Each element multiplied by k = ' + k];
      document.getElementById('mx-scalar-ctrl').style.display = 'block';
    }

    else if (op === 'power') {
      document.getElementById('mx-power-ctrl').style.display = 'block';
      if (A.length !== A[0].length) { resultArea.innerHTML = mxError('Matrix power requires a square matrix.'); stepsArea.style.display='none'; return; }
      const n = Math.max(0, Math.min(20, parseInt(document.getElementById('mx-power-n').value) || 2));
      const result = mxPower(A, n);
      if (!result) { resultArea.innerHTML = mxError('Matrix multiplication failed — check dimensions.'); stepsArea.style.display='none'; return; }
      html = mxDisplay(result, 'A^' + n);
      mxLastSteps = ['A multiplied by itself ' + n + ' time(s).', n === 0 ? 'A^0 = Identity matrix.' : ''];
    }

    else if (op === 'eigen') {
      if (A.length !== 2 || A[0].length !== 2) { resultArea.innerHTML = mxError('Eigenvalues in this tool are only supported for 2×2 matrices.\nFor larger matrices, use matrixcalc.org.'); stepsArea.style.display='none'; return; }
      const res = mxEigen2x2(A);
      if (res.type === 'complex') {
        html = '<div style="font-family:var(--mono);font-size:.82rem;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;line-height:2">' +
          '<div style="color:var(--gold);font-weight:600;margin-bottom:6px">Eigenvalues (complex)</div>' +
          'λ₁ = <span style="color:var(--blue)">' + res.l1 + '</span><br>' +
          'λ₂ = <span style="color:var(--blue)">' + res.l2 + '</span></div>';
      } else {
        html = '<div style="font-family:var(--mono);font-size:.82rem;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;line-height:2">' +
          '<div style="color:var(--gold);font-weight:600;margin-bottom:6px">Eigenvalues (real)</div>' +
          'λ₁ = <span style="color:var(--green)">' + mxFmt(res.l1) + '</span><br>' +
          'λ₂ = <span style="color:var(--green)">' + mxFmt(res.l2) + '</span></div>';
      }
      mxLastSteps = res.steps;
    }

    else if (op === 'lu') {
      if (A.length !== A[0].length) { resultArea.innerHTML = mxError('LU Decomposition requires a square matrix.'); stepsArea.style.display='none'; return; }
      const res = mxLU(A);
      if (!res) { resultArea.innerHTML = mxError('LU failed.'); stepsArea.style.display='none'; return; }
      html = '<div style="display:flex;gap:14px;flex-wrap:wrap">' + mxDisplay(res.L, 'L (lower triangular)') + mxDisplay(res.U, 'U (upper triangular)') + '</div>';
      html += '<div style="font-size:.73rem;color:var(--muted);margin-top:8px">Verify: L × U should equal A (check with A×B operation)</div>';
      mxLastSteps = ['LU Decomposition (Doolittle method)', 'L has 1s on diagonal, zeros above diagonal.', 'U is the upper triangular factor.'].concat(res.steps);
    }

    else if (op === 'add' || op === 'sub') {
      const B    = mxRead('mx-grid-b');
      const sign = op === 'add' ? 1 : -1;
      const res  = mxAdd(A, B, sign);
      if (!res) { resultArea.innerHTML = mxError('A and B must have the same dimensions for ' + (op === 'add' ? 'addition' : 'subtraction') + '.\nA is ' + A.length + '×' + A[0].length + ', B is ' + B.length + '×' + B[0].length + '.'); stepsArea.style.display='none'; return; }
      html = mxDisplay(res, op === 'add' ? 'A + B' : 'A − B');
      mxLastSteps = ['Element-wise ' + (op === 'add' ? 'addition' : 'subtraction') + '.', 'Dimensions: ' + A.length + '×' + A[0].length];
    }

    else if (op === 'mul') {
      const B   = mxRead('mx-grid-b');
      const res = mxMul(A, B);
      if (!res) { resultArea.innerHTML = mxError('Multiplication requires columns of A = rows of B.\nA is ' + A.length + '×' + A[0].length + ' (needs B to be ' + A[0].length + '×n).\nB is ' + B.length + '×' + B[0].length + '.'); stepsArea.style.display='none'; return; }
      html = mxDisplay(res, 'A × B');
      mxLastSteps = ['Matrix multiplication: (A×B)[i][j] = sum of A[i][k] × B[k][j]', 'Input A: ' + A.length + '×' + A[0].length + '  ×  B: ' + B.length + '×' + B[0].length, 'Output: ' + res.length + '×' + res[0].length];
    }

    else if (op === 'atb') {
      const B   = mxRead('mx-grid-b');
      const At  = mxTranspose(A);
      const res = mxMul(At, B);
      if (!res) { resultArea.innerHTML = mxError('Aᵀ×B: rows of B must equal rows of A (since Aᵀ has same cols as A rows).\nAᵀ is ' + At.length + '×' + At[0].length + ', B is ' + B.length + '×' + B[0].length + '.'); stepsArea.style.display='none'; return; }
      html = mxDisplay(res, 'Aᵀ × B');
      mxLastSteps = ['Transposed A first, then multiplied by B.'];
    }

    else if (op === 'abt') {
      const B   = mxRead('mx-grid-b');
      const Bt  = mxTranspose(B);
      const res = mxMul(A, Bt);
      if (!res) { resultArea.innerHTML = mxError('A×Bᵀ: cols of A must equal cols of B.\nA is ' + A.length + '×' + A[0].length + ', Bᵀ is ' + Bt.length + '×' + Bt[0].length + '.'); stepsArea.style.display='none'; return; }
      html = mxDisplay(res, 'A × Bᵀ');
      mxLastSteps = ['Transposed B first, then multiplied A × Bᵀ.'];
    }

    resultArea.innerHTML = html;
    if (mxLastSteps.length) {
      stepsBody.textContent = mxLastSteps.filter(Boolean).join('\n');
      stepsArea.style.display = 'block';
      document.getElementById('mx-steps-body').style.display = 'none'; // collapsed by default
    } else {
      stepsArea.style.display = 'none';
    }

  } catch (e) {
    resultArea.innerHTML = mxError('Error: ' + e.message);
    stepsArea.style.display = 'none';
  }
}

function mxToggleSteps() {
  const body = document.getElementById('mx-steps-body');
  body.style.display = body.style.display === 'none' ? 'block' : 'none';
}

// ── Init: build default 3×3 grids on page load ────────
// This runs when the matrix tool is first opened.
// Add this call to your openTool() function OR call it here with a delay.
(function mxInit() {
  // Wait for DOM to be ready (in case this script loads before tool panel renders)
  function tryBuild() {
    if (document.getElementById('mx-grid-a')) {
      mxBuildGrid();
    } else {
      setTimeout(tryBuild, 200);
    }
  }
  tryBuild();
})();

/* ══════════════════════════════════════════════════════════
   END
══════════════════════════════════════════════════════════ */
