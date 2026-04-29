/**
 * Student's Suite - Core Logic Engine
 * Architecture: Offline-First SPA
 */

window.addEventListener('DOMContentLoaded', async () => {

    /* ═════════════════════════════════════════════════════════
       1. GLOBAL STATE & UI ROUTING (ANDROID BACK-BUTTON SYNC)
    ═════════════════════════════════════════════════════════ */
    let activeBlobs = [];
    const trackBlob = (url) => activeBlobs.push(url);

    // Theme Engine
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('suite-theme', next);
    });
    if(localStorage.getItem('suite-theme') === 'light') document.body.setAttribute('data-theme', 'light');

    // SPA Routing & History API
    function showLanding() {
        document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
        document.getElementById('landing').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openTool(id) {
        document.getElementById('landing').style.display = 'none';
        document.querySelectorAll('.tool-panel').forEach(p => p.style.display = 'none');
        const target = document.getElementById('tool-' + id);
        if(target) target.style.display = 'block';
        
        // Push state for native Android back button
        history.pushState({ tool: id }, '', '#' + id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Intercept native back button
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.tool) {
            openTool(e.state.tool); // Edge case: navigating between tools
        } else {
            showLanding();
        }
    });

    // Attach listeners to DOM
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => openTool(card.dataset.target));
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
       2. DEPENDENCY VALIDATION & PDF CORE
    ═════════════════════════════════════════════════════════ */
    if (typeof PDFLib === 'undefined') {
        console.error("FATAL: PDF-Lib not found. Check local ./js/pdf-lib.min.js path.");
        return; // Halt execution to prevent cascaded errors
    }
    const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;

    /* ═════════════════════════════════════════════════════════
       3. ADVANCED IMAGE PROCESSING (CANVAS MATRIX ENGINE)
    ═════════════════════════════════════════════════════════ */
    
    // Utility: Image Loader
    const loadImage = (file) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });

    // Utility: Truncate RGB values
    const clamp = (val) => Math.min(255, Math.max(0, val));

    // A. Signature Digitizer Logic
    const sigInput = document.createElement('input'); // Mocking inputs absent in short HTML
    sigInput.type = 'file'; sigInput.accept = 'image/*';
    
    window.processSignatureMatrix = async (file, lumTolerance, contrastLevel) => {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        
        // Contrast calculation factor
        const factor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel)); 

        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i+1], b = d[i+2];
            // Luminance formula
            const luminance = 0.299*r + 0.587*g + 0.114*b; 
            
            if (luminance > lumTolerance) {
                d[i+3] = 0; // Force transparent alpha
            } else {
                // Apply aggressive contrast to ink
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
            // Leverage native browser JPEG encoder for qualitative reduction
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', qualityPct / 100);
        });
    };

    /* ═════════════════════════════════════════════════════════
       4. ADVANCED PDF INTERVENTIONS
    ═════════════════════════════════════════════════════════ */

    // A. PDF Verified Tag Injector
    window.injectVerifiedTag = async (pdfBytes, textStr, quadrant) => {
        const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = doc.getPages();
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        
        // Standard geometric checkmark SVG path
        const checkPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';

        for (const pg of pages) {
            const { width, height } = pg.getSize();
            let x = 40, y = 40; // Default BL
            
            if (quadrant === 'BR') { x = width - 150; y = 40; }
            if (quadrant === 'TR') { x = width - 150; y = height - 60; }

            // Draw SVG Icon
            pg.drawSvgPath(checkPath, {
                x: x, y: y + 25,
                scale: 1.5,
                color: rgb(0.2, 0.8, 0.2) // Green check
            });

            // Draw Verification Text
            pg.drawText(textStr, {
                x: x + 40, y: y + 10,
                size: 14,
                font: font,
                color: rgb(0.1, 0.5, 0.1)
            });
        }
        return await doc.save();
    };

    // B. Diagnostic Watermark Removal (Heuristics)
    window.diagnosticWatermarkSweep = async (pdfBytes, redactHeader, redactFooter) => {
        const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pages = doc.getPages();
        
        for (const pg of pages) {
            const { width, height } = pg.getSize();

            // Strategy 1: Structural Severance (Always target annotations)
            try {
                if (pg.node.get(PDFLib.PDFName.of('Annots'))) {
                    pg.node.delete(PDFLib.PDFName.of('Annots'));
                }
            } catch(e) { console.warn("No annot structure found."); }

            // Strategy 2: Coordinate Redaction
            // Applies a pure white overlay to the specified geometric zones
            if (redactHeader) {
                pg.drawRectangle({ x: 0, y: height * 0.85, width: width, height: height * 0.15, color: rgb(1,1,1) });
            }
            if (redactFooter) {
                pg.drawRectangle({ x: 0, y: 0, width: width, height: height * 0.15, color: rgb(1,1,1) });
            }
        }
        return await doc.save();
    };

    /* ═════════════════════════════════════════════════════════
       5. DESCRIPTIVE ACCORDION LOGIC
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

    console.log("Student's Suite: Local execution engine loaded successfully.");
});
