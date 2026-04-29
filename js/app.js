/**
 * Student's Suite - Core Logic Engine
 * Architecture: Offline-First SPA
 */

window.addEventListener('DOMContentLoaded', async () => {

    /* ═════════════════════════════════════════════════════════
       1. GLOBAL STATE & UI ROUTING (ANDROID BACK-BUTTON SYNC)
    ═════════════════════════════════════════════════════════ */
    let activeBlobs = [];
    window.trackBlob = (url) => activeBlobs.push(url);

    // Theme Engine
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('suite-theme', next);
        });
    }
    if(localStorage.getItem('suite-theme') === 'light') document.body.setAttribute('data-theme', 'light');

    // SPA Routing & History API
    function showLanding() {
        document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
        document.getElementById('landing').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.openTool = function(id) {
        document.getElementById('landing').style.display = 'none';
        document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
        const target = document.getElementById('tool-' + id);
        if(target) target.style.display = 'block';
        
        // Push state for native Android back button
        history.pushState({ tool: id }, '', '#' + id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Intercept native back button
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.tool) {
            window.openTool(e.state.tool); // Edge case: navigating between tools
        } else {
            showLanding();
        }
    });

    // Attach listeners to DOM
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => window.openTool(card.dataset.target));
    });

    document.querySelectorAll('.nav-back').forEach(btn => {
        btn.addEventListener('click', () => history.back());
    });

    // Category Filtering Engine
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.dataset.filter;
            document.querySelectorAll('.tool-card').forEach(card => {
                if (filter === 'all' || card.dataset.category.includes(filter)) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });

    /* ═════════════════════════════════════════════════════════
       2. UNIVERSAL FILE INGESTION & DOM BINDING
    ═════════════════════════════════════════════════════════ */
    
    window.setupDZ = function(dzId, fiId, pillNameId, pillMetaId, pillId, runId, procId, onLoadCallback) {
        const dz = document.getElementById(dzId);
        const fi = document.getElementById(fiId);
        if (!dz || !fi) return;

        // Handle standard click-to-browse
        fi.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFileIngestion(e.target.files[0], pillNameId, pillMetaId, pillId, runId, procId, onLoadCallback);
        });

        // Handle Drag and Drop
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('over'));
        dz.addEventListener('drop', (e) => {
            e.preventDefault(); dz.classList.remove('over');
            if (e.dataTransfer.files[0]) {
                handleFileIngestion(e.dataTransfer.files[0], pillNameId, pillMetaId, pillId, runId, procId, onLoadCallback);
            }
        });

        // Ensure clicking the zone triggers the hidden file input
        dz.addEventListener('click', (e) => {
            if (e.target !== fi) fi.click();
        });
    };

    async function handleFileIngestion(file, pillNameId, pillMetaId, pillId, runId, procId, onLoadCallback) {
        const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        const isImg = file.type.startsWith('image/');

        if (!isPDF && !isImg) {
            alert('Architecture Fault: Invalid format. Please supply a PDF or Image matrix.');
            return;
        }

        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);

        // Update UI Pills
        const pName = document.getElementById(pillNameId);
        const pMeta = document.getElementById(pillMetaId);
        const pill = document.getElementById(pillId);
        const runBtn = document.getElementById(runId);

        if(pName) pName.textContent = file.name;
        if(pMeta) pMeta.textContent = `${(bytes.length / 1024).toFixed(0)} KB`;
        if(pill) pill.classList.add('on');
        if(runBtn) runBtn.disabled = false;
        
        const procArea = document.getElementById(procId);
        if(procArea) procArea.style.display = 'block';

        if (isPDF) {
            try {
                // Parse PDF to extract page count for the UI metadata
                if (typeof PDFLib !== 'undefined') {
                    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
                    if(pMeta) pMeta.textContent += ` · ${doc.getPageCount()} Pages`;
                    if(onLoadCallback) onLoadCallback(bytes, file.name, doc.getPageCount(), file);
                } else {
                    if(onLoadCallback) onLoadCallback(bytes, file.name, null, file);
                }
            } catch (e) {
                alert('Parsing Error: Could not read document architecture. ' + e.message);
            }
        } else if (isImg) {
            if(onLoadCallback) onLoadCallback(bytes, file.name, null, file);
        }
    }

    // Shared UI Helpers required by tools
    window.logMsg = function(boxId, msg, type='li') {
        const box = document.getElementById(boxId);
        if(!box) return;
        const d = document.createElement('div');
        d.className = type;
        d.innerHTML = `<span style="opacity:.32">[System]</span> ${msg}`;
        box.appendChild(d);
        box.scrollTop = box.scrollHeight;
    };
    
    window.logClear = function(boxId) { const b = document.getElementById(boxId); if(b) b.innerHTML = ''; };
    window.setP = function(id, pct) { const el = document.getElementById(id); if(el) el.style.width = pct + '%'; };

    /* ═════════════════════════════════════════════════════════
       3. DEPENDENCY VALIDATION
    ═════════════════════════════════════════════════════════ */
    if (typeof PDFLib === 'undefined') {
        console.warn("Notice: PDF-Lib dependency is pending or missing. PDF manipulation tools require this library to function.");
    }

    /* ═════════════════════════════════════════════════════════
       4. ADVANCED IMAGE PROCESSING (CANVAS MATRIX ENGINE)
    ═════════════════════════════════════════════════════════ */
    
    const loadImage = (file) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });

    const clamp = (val) => Math.min(255, Math.max(0, val));

    // A. Signature Digitizer Logic
    window.processSignatureMatrix = async (file, lumTolerance, contrastLevel) => {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        
        const factor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel)); 

        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i+1], b = d[i+2];
            const luminance = 0.299*r + 0.587*g + 0.114*b; 
            
            if (luminance > lumTolerance) {
                d[i+3] = 0; 
            } else {
                d[i]   = clamp(factor * (r - 128) + 128);
                d[i+1] = clamp(factor * (g - 128) + 128);
                d[i+2] = clamp(factor * (b - 128) + 128);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL('image/png');
    };

    // B. Image Compressor Logic
    window.executeLossyCompression = async (file, qualityPct) => {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', qualityPct / 100);
        });
    };

    /* ═════════════════════════════════════════════════════════
       5. ADVANCED PDF INTERVENTIONS
    ═════════════════════════════════════════════════════════ */

    window.injectVerifiedTag = async (pdfBytes, textStr, quadrant) => {
        if (typeof PDFLib === 'undefined') return null;
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = doc.getPages();
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        
        const checkPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';

        for (const pg of pages) {
            const { width, height } = pg.getSize();
            let x = 40, y = 40; 
            
            if (quadrant === 'BR') { x = width - 150; y = 40; }
            if (quadrant === 'TR') { x = width - 150; y = height - 60; }

            pg.drawSvgPath(checkPath, { x: x, y: y + 25, scale: 1.5, color: rgb(0.2, 0.8, 0.2) });
            pg.drawText(textStr, { x: x + 40, y: y + 10, size: 14, font: font, color: rgb(0.1, 0.5, 0.1) });
        }
        return await doc.save();
    };

    window.diagnosticWatermarkSweep = async (pdfBytes, redactHeader, redactFooter) => {
        if (typeof PDFLib === 'undefined') return null;
        const { PDFDocument, rgb } = PDFLib;
        const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = doc.getPages();
        
        for (const pg of pages) {
            const { width, height } = pg.getSize();
            try {
                if (pg.node.get(PDFLib.PDFName.of('Annots'))) {
                    pg.node.delete(PDFLib.PDFName.of('Annots'));
                }
            } catch(e) { }

            if (redactHeader) pg.drawRectangle({ x: 0, y: height * 0.85, width: width, height: height * 0.15, color: rgb(1,1,1) });
            if (redactFooter) pg.drawRectangle({ x: 0, y: 0, width: width, height: height * 0.15, color: rgb(1,1,1) });
        }
        return await doc.save();
    };

    /* ═════════════════════════════════════════════════════════
       6. DESCRIPTIVE ACCORDION LOGIC
    ═════════════════════════════════════════════════════════ */
    document.querySelectorAll('.desc-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const body = e.target.nextElementSibling;
            if (body.style.display === 'none' || body.style.display === '') {
                body.style.display = 'block';
                e.target.innerHTML = e.target.innerHTML.replace('▾', '▴');
            } else {
                body.style.display = 'none';
                e.target.innerHTML = e.target.innerHTML.replace('▴', '▾');
            }
        });
    });

    console.log("Student's Suite: Local execution engine compiled securely.");
});
