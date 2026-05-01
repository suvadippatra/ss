<div align="center">

# 📚 Student's Suite

## An offline-first academic document processor — no server, no upload, no cost.

[![Visitors](https://suvadip.goatcounter.com/counter/TOTAL.svg)](https://suvadip.goatcounter.com)
&nbsp;&nbsp;

<br/>
[![GitHub Pages](https://img.shields.io/badge/Live%20on-GitHub%20Pages-gold?style=flat-square&logo=github)](https://suvadippatra.github.io/students-suite/)
&nbsp;&nbsp;
[![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey?style=flat-square)](LICENSE)
&nbsp;&nbsp;
![No Server](https://img.shields.io/badge/Server-None-3ecf8e?style=flat-square)
![No Upload](https://img.shields.io/badge/Upload-Never-3ecf8e?style=flat-square)

<br/>

*The visitor count badge above is live — powered by GoatCounter. This is the only way i can track*

</div>

---

## § 1 — What This Is

This is a collection of document and image processing tools I built for myself — and for anyone in an Indian academic environment who has spent twenty minutes trying to resize a photograph to exactly 3.5 × 4.5 cm at 200 DPI before an exam form deadline, or who has needed to self-attest a scanned Aadhaar card at 11 PM with no printer nearby.

I built it with help from [Claude](https://claude.ai) (Anthropic's AI assistant), iterating the design and logic across many conversations. The result is a single webpage that runs entirely inside your browser — on your phone, your tablet, or your laptop — with no internet required after the first load. There is no account, no login, no cloud. You open the page, drop a file, get your output, close the tab. That is the entire experience.

It started as a booklet imposition tool for printing multi-page documents on a home printer. It grew into something broader when I kept running into the same formatting friction every time an exam portal asked for a signature in a specific KB limit, or a question paper needed to be arranged in a particular order before printing. Every tool here exists because I personally needed it and found the available alternatives either too heavy, too expensive, or too privacy-invasive.

---

## § 2 — What the Repository Contains

```
students-suite/
│
├── index.html                 ← The entire user interface — all 16 tool panels,
│                                the landing page, category tabs, theme toggle,
│                                and GoatCounter visitor widget. One file, no framework.
│
├── app.js                     ← All processing logic for all 16 tools.
│                                Booklet imposition maths, PDF manipulation,
│                                image compression, passport photo cropping,
│                                signature background removal, and the graphing
│                                calculator — all in one clean JS file.
│
├── js/
│   ├── pdf-lib.min.js         ← pdf-lib v1.17.1 (Holderbaum et al.)
│   │                            The PDF read/write engine. Processes PDFs
│   │                            entirely in the browser with no server.
│   │                            Source: https://github.com/Hopding/pdf-lib
│   │
│   ├── pdf.min.js             ← PDF.js v3.11.174 (Mozilla Foundation)
│   │                            Used only by the PDF→Image rendering tool.
│   │                            Rasterises PDF pages to canvas at chosen DPI.
│   │                            Source: https://github.com/mozilla/pdf.js
│   │
│   └── pdf.worker.min.js      ← PDF.js worker thread file.
│                                Must be kept alongside pdf.min.js.
│
├── logo.png                   ← My own logo here (rough design).
│
└── README.md                  ← This file.
```

> **Offline note:** The three files in `js/` are the only reason you need internet on first load. Once cached by your browser, or if you host these files yourself, the suite works entirely offline — on a flight, in a rural area, or behind an institutional firewall.

---

## § 3 — Why a Webapp, When Apps and Websites Already Exist

This is the most important question about this project, and it deserves a real answer.

**The problem with existing tools is not capability — it is friction and trust.**

When a student in India needs to resize a photograph before submitting an online exam form, the existing paths are roughly these:

- Use an online tool like ILovePDF or Smallpdf → your document travels to a server in Europe or the US, is processed there, and you download the result. You have no way to verify what was retained, logged, or associated with your account. For an Aadhaar card or personal document, this is a genuine privacy concern.
- Use desktop software like Adobe Acrobat or GIMP → requires installation, a license, a learning curve, and in many cases administrative access to a college computer. Most students in India are working on shared lab machines or low-end phones where none of this is realistic.
- Use Microsoft Office or Google Docs → works for basic tasks, but fails immediately when the requirement is "signature in JPEG, max 20 KB, exactly 3.5 × 1.5 cm at 200 DPI, white background removed." No menu in Word leads you there without several painful intermediate steps.

**A webapp with a fixed template removes all of these barriers.**

The browser is the one application that is guaranteed to be installed on every device — phone, tablet, laptop, Chromebook, shared lab computer. No installation required. No account. No license. The interface is purpose-built for the specific tasks that come up repeatedly in academic life, so a first-time user does not need to discover the right sequence of menus — the tool describes what it does, why each parameter exists, and what the output will be, before you upload anything.

Processing happens on the device using the browser's own JavaScript engine. This means a mid-range Android phone from 2020 is sufficient. The PDF manipulation library used here (pdf-lib) is the same one used by professional PDF tooling in production Node.js applications — it is not a toy. The image processing uses the HTML5 Canvas API, which is hardware-accelerated on virtually every modern device.

**The philosophical argument in one sentence:** a webapp with a deliberately narrow scope, running on-device, trusts the user more than any cloud alternative does — because it gives them the output without asking for anything in return.

---

## § 4 — What You Can Do, and the Extremes

### PDF Tools

| Tool | What it does | Extreme capability |
|---|---|---|
| **Booklet Imposition** | Reorders pages for saddle-stitch booklet printing. Adds fold guides and "Sig. N · Sheet N of N" registration marks. | A 200-page document split into 4-sheet signatures with spine gap and outer trim — all three steps in under 30 seconds on a mid-range device. |
| **PDF Merge** | Combines multiple PDFs in any order you choose. | Tested with 40+ files, 500+ total pages merged into a single document. |
| **PDF Split** | Custom ranges, uniform interval, or page-by-page extraction. | A 300-page exam archive split into 300 individual single-page files in one pass. |
| **PDF Compress** | Lossless structural re-compression — strips metadata bloat, packs object streams. | Typical 20–40% reduction on text-heavy PDFs. Image-heavy PDFs need server-side tools for larger reductions — this is stated honestly in the tool. |
| **N-up Layout** | Places multiple source pages onto each output sheet in a grid (2-up, 4-up, 6-up, etc.). | A 48-page lecture slide deck printed 6-up on A4, fitting an entire semester of notes on 8 sheets. |
| **Rearrange Pages** | Reorder, duplicate, or delete pages interactively. | Clone a cover page to every 10th position in a multi-chapter document. |
| **PDF → Image** | Renders each page as PNG or JPEG at chosen DPI. | 300 DPI PNG render of a 20-page document — every page exported as a print-quality image. |
| **Add Watermark** | Text stamp with opacity, rotation, colour, and position control. | Custom diagonal "DRAFT" stamp in 10% opacity gold across a 100-page report. |
| **Remove Watermark** | Scans and strips annotation-layer and overlay watermarks. Honest about content-stream limits. | Strips all annotation stamps added by Acrobat or similar tools. Correctly reports when a watermark is baked in and cannot be removed without Ghostscript. |
| **Unlock PDF** | Decrypts password-protected PDFs. | Aadhaar PDFs, bank statements, and mark sheets locked with DOB passwords — unlocked and re-saved without any password. |
| **Add Verified Stamp** | Draws a rubber-stamp-style "VERIFIED" or "SELF ATTESTED" visual mark. | Applied to all pages of a multi-document submission pack in one operation. |

### Image Tools

| Tool | What it does | Extreme capability |
|---|---|---|
| **Image Compressor** | Reduces file size by JPEG/WebP quality percentage. Live before/after preview. | 4 MB phone photo compressed to under 100 KB with visually near-identical quality at 65%. |
| **Image Resize** | Exact dimensions in px, cm, or inch. DPI-aware (50–1200). Binary-search for target KB. | Exam form photograph: 3.5 × 4.5 cm at 200 DPI, under 50 KB, JPEG — in one operation. |
| **Passport Photo Maker** | Crop, rotate, brightness/contrast/saturation adjust. Export at preset ID dimensions. | Indian Passport (51×51 mm), Aadhaar/PAN (35×45 mm), US Visa — all presets built in. |
| **Signature Cleaner** | Removes white/light backgrounds from scanned signatures via luminance threshold. Exports transparent PNG. | Dark ballpoint on slightly grey paper — threshold at 195 keeps all ink and removes the background completely. |

### Maths Tool

| Tool | What it does | Extreme capability |
|---|---|---|
| **Scientific & Graphing Calculator** | Full scientific console + multi-function graph plotter. Calculates history. | Plot 5 functions simultaneously on one canvas with auto y-range scaling. Evaluate factorial(170) (≈7.26×10³⁰⁶) without overflow. |

---

## § 5 — How Your Data Is Processed

**No file you open in this suite ever leaves your device. This is a client-side web-app**

Here is exactly what happens when you use any tool:

1. You select a file. The browser's `FileReader` API reads it into a JavaScript `ArrayBuffer` — a block of memory inside the browser tab. The file is never transmitted anywhere.

2. The processing library (pdf-lib or the HTML5 Canvas API) operates entirely on that in-memory buffer. Intermediate steps between tool stages also stay in RAM as `Uint8Array` byte buffers.

3. When you click Download, the browser generates a `Blob URL` — a temporary local URL pointing to data already in your RAM — and triggers a local file save. Nothing leaves the device at this point either.

4. The session manager tracks your in-memory files so you can pass outputs from one tool into another without re-uploading. Clicking "Purge Memory" calls `URL.revokeObjectURL()` on every Blob URL and clears all buffers — the browser's garbage collector reclaims the RAM.

**What `localStorage` is used for:**

| Key | What is stored | Why |
|---|---|---|
| `ss-theme` | `"dark"` or `"light"` | Remembers your theme preference across sessions |
| `ss-notes` | Your private notepad text | Persists your typed notes in the browser only |

That is the complete list. No PDF content, no image data, no filenames, no metadata, and no usage events are ever written to `localStorage` or sent anywhere.

**On analytics:** GoatCounter is used to count page visits on the live hosted version. It records only an anonymous page load count — no IP address stored, no cookies, no fingerprinting. You can read GoatCounter's privacy policy at [goatcounter.com](https://www.goatcounter.com/help/privacy). If you host your own copy, you have no analytics at all unless you add them yourself.

---

## § 6 — How to Host Your Own Copy

You do not need to ask permission. Fork the repository and host it in four steps.

**Step 1 — Fork**

Click the **Fork** button at the top-right of this repository page on GitHub. This creates your own copy under your GitHub account.

**Step 2 — (Optional) Add the offline JS files**

For a fully offline-capable deployment, download the three dependency files and add them to the `js/` folder in your fork:

```
pdf-lib.min.js    →  https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js
pdf.min.js        →  https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
pdf.worker.min.js →  https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js
```

If you skip this step, the suite still works — it falls back to the CDN versions on first load and the browser caches them.

**Step 3 — Enable GitHub Pages**

Go to your forked repository → **Settings** → **Pages** (left sidebar) → under *Branch*, select `main` and folder `/` (root) → click **Save**.

**Step 4 — Open your live URL**

After about 60 seconds, your suite will be live at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

That URL works on any device, browser, or operating system with no installation required.

**Optional — Add your own GoatCounter visitor counter**

Sign up free at [goatcounter.com](https://www.goatcounter.com), create a site, and replace both occurrences of `suvadip.goatcounter.com` in `index.html` with your own GoatCounter site URL. Then go to GoatCounter → Settings → enable **"Allow adding visitor counts on your website"**. Your visitor count badge in this README will work once you update the badge URL at the top of this file to match your site.

---

## § 7 — Credits, Licences, and a Note on Ownership

### Open source libraries used

| Library | Author | Licence | Used for |
|---|---|---|---|
| **pdf-lib** v1.17.1 | Andrew Dillon Holderbaum | MIT | All PDF read, write, and manipulation operations |
| **PDF.js** v3.11.174 | Mozilla Foundation | Apache 2.0 | PDF-to-image page rendering |
| **Space Grotesk** | Florian Karsten | SIL OFL 1.1 | UI typeface |
| **JetBrains Mono** | JetBrains s.r.o. | SIL OFL 1.1 | Monospaced code and data display |
| **GoatCounter** | Martin Tournoij | EUPL / Commercial | Anonymous page view counting |

All libraries are used in accordance with their respective licences. No modifications were made to any library source code.

### This project's licence

```
Copyright © 2026 Suvadip Patra (@suvadippatra)

This work is licensed under the Creative Commons
Attribution-NonCommercial 4.0 International License.

You are free to:
  Share  — copy and redistribute the material in any medium or format
  Adapt  — remix, transform, and build upon the material

Under the following terms:
  Attribution    — You must give appropriate credit and link to the original.
  NonCommercial  — You may not use the material for commercial purposes.

Full licence text: https://creativecommons.org/licenses/by-nc/4.0/
```

### On the role of AI in building this

A significant portion of the logic, architecture, and code in this project was written in collaboration with [Claude](https://claude.ai) by Anthropic. This is stated openly because I think it matters — not as a disclaimer, but as an honest account of how the project was made.

The ideas, the use cases, the design decisions, the debugging, and the final judgement on what works were mine. Claude contributed code structure, implementation detail, and the ability to produce correct, tested logic faster than I could have written it alone. The result is something I could not have built as quickly or as cleanly working by myself, and pretending otherwise would be dishonest.

I think this is what responsible use of AI tools looks like: a person who knows what they want to build, using AI to build it better, and being transparent about that afterwards.

---

<div align="center">

Made with patience, frustration, and eventually satisfaction by me, **Suvadip Patra**.

*If this saved you time before an exam form deadline, it did its job.*

</div>
