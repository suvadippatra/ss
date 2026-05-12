
/* ═══════════════════════════════════════════════════════════════
   Student's Suite -- app.js v4.0.0
   Changes: preview system, inline rename, watermark fix+image,
   4-strategy watermark removal (pako), EXIF cleaner tool,
   metadata display on every file load, PDF output preview.
═══════════════════════════════════════════════════════════════ */
let PDFDocument,rgb,degrees,StandardFonts,grayscale;
const MM=72/25.4,CW=277*MM,CH=190*MM;
let opCount=0,sessionFiles={},sessionIdSeq=0;
window._activeBlobs=[];

window.addEventListener('load',function(){
  const banner=document.getElementById('libStatus');
  if(typeof PDFLib==='undefined'){banner.style.display='block';banner.className='err';banner.innerHTML='⚠ pdf-lib failed to load. Place pdf-lib.min.js in ./js/ folder.';return;}
  ({PDFDocument,rgb,degrees,StandardFonts,grayscale}=PDFLib);
  banner.style.display='block';banner.className='ok';banner.textContent='✓ pdf-lib ready -- all tools offline.';
  setTimeout(()=>{banner.style.display='none';},2500);
  initAll();
});

function initAll(){
  document.addEventListener('pointermove',e=>{document.body.style.setProperty('--mx',e.clientX+'px');document.body.style.setProperty('--my',e.clientY+'px');},{passive:true});
  document.addEventListener('touchmove',e=>{if(e.touches.length===1){document.body.style.setProperty('--mx',e.touches[0].clientX+'px');document.body.style.setProperty('--my',e.touches[0].clientY+'px');}},{passive:true});
  let ty0=0;
  document.addEventListener('touchstart',e=>{ty0=e.touches[0].clientY;},{passive:true});
  document.addEventListener('touchmove',e=>{if(window.scrollY===0&&e.touches[0].clientY-ty0>10&&e.touches.length===1)e.preventDefault();},{passive:false});
  if(localStorage.getItem('ss-theme')==='light')document.body.setAttribute('data-theme','light');
  const note=localStorage.getItem('ss-notes');if(note)document.getElementById('localNoteArea').value=note;
  document.getElementById('bk-gap').addEventListener('input',bkUpdatePreview);
  document.getElementById('bk-out').addEventListener('input',bkUpdatePreview);
  bkUpdatePreview();
  ['nu-rows','nu-cols','nu-sp','nu-mg'].forEach(id=>document.getElementById(id).addEventListener('input',nuUpdateInfo));
  nuUpdateInfo();
  ['wa-fs','wa-op','wa-rot'].forEach(id=>document.getElementById(id).addEventListener('input',function(){const u={'wa-fs':' pt','wa-op':'%','wa-rot':'°'},v={'wa-fs':'wa-fsV','wa-op':'wa-opV','wa-rot':'wa-rotV'};document.getElementById(v[id]).textContent=this.value+u[id];}));
  document.getElementById('sp-n').addEventListener('input',function(){document.getElementById('sp-nV').textContent=this.value;});
  buildCalcPad();gAddFn();
  wireDZ('bk-dz','bk-fi',(b,n)=>bkLoad(b,n));
  wireDZ('mg-dz','mg-fi',null);
  wireDZ('sp-dz','sp-fi',(b,n)=>spLoad(b,n));
  wireDZ('cp-dz','cp-fi',(b,n)=>cpLoad(b,n));
  wireDZ('nu-dz','nu-fi',(b,n)=>nuLoad(b,n));
  wireDZ('ra-dz','ra-fi',(b,n)=>raLoad(b,n));
  wireDZ('ti-dz','ti-fi',(b,n)=>tiLoad(b,n));
  wireDZ('wa-dz','wa-fi',(b,n)=>waLoad(b,n));
  wireDZ('wr-dz','wr-fi',(b,n)=>wrLoad(b,n));
  wireDZ('un-dz','un-fi',(b,n)=>unLoad(b,n));
  wireDZ('vf-dz','vf-fi',(b,n)=>vfLoad(b,n));
  wireDZImg('ic-dz','ic-fi',icLoad);wireDZImg('ir-dz','ir-fi',irLoad);
  wireDZImg('pp-dz','pp-fi',ppLoad);wireDZImg('sg-dz','sg-fi',sgLoad);
  wireDZImg('exif-dz','exif-fi',exifLoad);
  const waImgFI=document.getElementById('wa-img-fi');
  if(waImgFI)waImgFI.addEventListener('change',function(){if(this.files[0])waLoadImg(this.files[0]);this.value='';});
  const waImgDZ=document.getElementById('wa-img-dz');
  if(waImgDZ){waImgDZ.addEventListener('dragover',e=>{e.preventDefault();waImgDZ.classList.add('over');});waImgDZ.addEventListener('dragleave',()=>waImgDZ.classList.remove('over'));waImgDZ.addEventListener('drop',e=>{e.preventDefault();waImgDZ.classList.remove('over');const f=e.dataTransfer.files[0];if(f)waLoadImg(f);});}
  document.getElementById('mg-fi').addEventListener('change',function(){mgHandleFiles(this.files);this.value='';});
  const runs={'bk-run':bkRun,'mg-run':mgRun,'sp-run':spRun,'cp-run':cpRun,'nu-run':nuRun,'ra-run':raRun,'ti-run':tiRun,'wa-run':waRun,'wr-run':wrRun,'un-run':unRun,'vf-run':vfRun,'ic-run':icDownload,'ir-run':irRun,'pp-run':ppRun,'sg-run':sgDownload,'exif-run':exifRun};
  Object.entries(runs).forEach(([id,fn])=>{const el=document.getElementById(id);if(el)el.addEventListener('click',fn);});
  document.getElementById('ic-q').addEventListener('input',function(){document.getElementById('ic-qV').textContent=this.value+'%';icUpdate();});
  injectMetaCSS();
}

function openTool(id){
  document.getElementById('landing').style.display='none';
  document.querySelectorAll('.tool-panel').forEach(p=>p.style.display='none');
  document.getElementById('tool-'+id).style.display='block';
  window.scrollTo(0,0);
  if(id==='matrix'&&document.getElementById('mx-grid-a'))mxBuildGrid();
}
function goBack(){document.querySelectorAll('.tool-panel').forEach(p=>p.style.display='none');document.getElementById('landing').style.display='block';window.scrollTo(0,0);}
function filterCat(cat){document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));event.currentTarget.classList.add('active');document.querySelectorAll('.tool-card').forEach(c=>{c.style.display=(cat==='all'||c.dataset.cat===cat)?'':' none';});}
function toggleTheme(){const l=document.body.getAttribute('data-theme')==='light';document.body.setAttribute('data-theme',l?'dark':'light');localStorage.setItem('ss-theme',l?'dark':'light');if(typeof gLastFns!=='undefined'&&gLastFns.length)gPlot();}
function saveNote(){localStorage.setItem('ss-notes',document.getElementById('localNoteArea').value);const st=document.getElementById('noteSt');st.style.display='inline';setTimeout(()=>st.style.display='none',2000);}
function addToSession(name,bytes){sessionFiles['sf'+(++sessionIdSeq)]={name,bytes};updateSessionBadge();}
function updateSessionBadge(){const n=Object.keys(sessionFiles).length;document.getElementById('gBadgeCount').textContent=n;document.getElementById('gBadge').classList.toggle('on',n>0);}
function showSessionModal(){const keys=Object.keys(sessionFiles);if(!keys.length){alert('No files in session.');return;}const names=Object.values(sessionFiles).map(f=>f.name).join('\n');if(confirm('Session has '+keys.length+' file(s):\n\n'+names+'\n\nPurge all from memory?')){window._activeBlobs.forEach(u=>URL.revokeObjectURL(u));window._activeBlobs=[];sessionFiles={};updateSessionBadge();}}
function populateSessUI(listId,trayId,onLoad){const tray=document.getElementById(trayId),list=document.getElementById(listId),files=Object.values(sessionFiles);if(!files.length){tray.classList.remove('on');return;}tray.classList.add('on');list.innerHTML='';files.forEach(f=>{const btn=document.createElement('button');btn.className='sess-file-btn';btn.textContent=f.name+' ('+fmtKB(f.bytes.length)+')';btn.onclick=()=>onLoad(f.bytes,f.name);list.appendChild(btn);});}
const tick=()=>new Promise(r=>setTimeout(r,0));
function ts(){return new Date().toLocaleTimeString('en-GB',{hour12:false});}
function fmtKB(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(2)+' MB';}
function addLog(id,msg,type){const box=document.getElementById(id);if(!box)return;const d=document.createElement('div');d.className=type||'li';d.innerHTML='<span style="opacity:.32">'+ts()+'</span>  '+msg;box.appendChild(d);box.scrollTop=box.scrollHeight;}
function setP(id,pct){const el=document.getElementById(id);if(el)el.style.width=pct+'%';}
function chipSet(id,state){const el=document.getElementById(id);if(!el)return;el.classList.remove('active','done');if(state)el.classList.add(state);}
function showDL(labId,sectId){document.getElementById(labId).style.display='';document.getElementById(sectId).style.display='block';}
function tDesc(id){const el=document.getElementById(id);el.style.display=el.style.display==='none'?'block':'none';}
function incOp(){opCount++;document.getElementById('localOpCount').textContent=opCount;}
function parsePageStr(str,total){if(!str||!str.trim())return[...Array(total).keys()];const r=[];str.split(',').forEach(p=>{p=p.trim();if(p.includes('-')){const[a,b]=p.split('-').map(x=>parseInt(x.trim()));if(!isNaN(a)&&!isNaN(b))for(let i=a;i<=b;i++)if(i>=1&&i<=total)r.push(i-1);}else{const n=parseInt(p);if(!isNaN(n)&&n>=1&&n<=total)r.push(n-1);}});return[...new Set(r)];}
function hexToRgb01(hex){hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const n=parseInt(hex,16);return{r:((n>>16)&255)/255,g:((n>>8)&255)/255,b:(n&255)/255};}
function escQ(s){return s.replace(/'/g,"\\'");}

function wireDZ(dzId,fiId,onLoad){const dz=document.getElementById(dzId);if(!dz)return;const fi=document.getElementById(fiId);if(fi&&onLoad)fi.addEventListener('change',async function(){if(!this.files[0])return;const bytes=new Uint8Array(await this.files[0].arrayBuffer());onLoad(bytes,this.files[0].name);this.value='';});dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});dz.addEventListener('dragleave',()=>dz.classList.remove('over'));dz.addEventListener('drop',async e=>{e.preventDefault();dz.classList.remove('over');const f=e.dataTransfer.files[0];if(f&&onLoad){const bytes=new Uint8Array(await f.arrayBuffer());onLoad(bytes,f.name);}});}
function wireDZImg(dzId,fiId,onLoad){const dz=document.getElementById(dzId);if(!dz)return;const fi=document.getElementById(fiId);if(fi)fi.addEventListener('change',function(){if(this.files[0])onLoad(this.files[0]);this.value='';});dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});dz.addEventListener('dragleave',()=>dz.classList.remove('over'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');const f=e.dataTransfer.files[0];if(f)onLoad(f);});}
async function loadPDF(bytes,pnameId,pmetaId,pillId,runId,onLoaded){try{const doc=await PDFDocument.load(bytes,{ignoreEncryption:true}),n=doc.getPageCount();document.getElementById(pnameId).textContent='';document.getElementById(pmetaId).textContent=n+' page'+(n!==1?'s':'')+' · '+fmtKB(bytes.length);document.getElementById(pillId).classList.add('on');if(runId)document.getElementById(runId).disabled=false;if(onLoaded)onLoaded(bytes,n,doc);return{bytes,n,doc};}catch(e){alert('Could not read PDF: '+e.message);return null;}}

/* ── Metadata Display (fast, no extra library) ─────────── */
async function showPDFMeta(bytes,metaId){const el=document.getElementById(metaId);if(!el)return;try{const doc=await PDFDocument.load(bytes,{ignoreEncryption:true}),pg0=doc.getPage(0),{width,height}=pg0.getSize();const info=[['Pages',doc.getPageCount()],['Page size',(width/MM).toFixed(0)+'×'+(height/MM).toFixed(0)+' mm'],['File size',fmtKB(bytes.length)],['Title',doc.getTitle()||'--'],['Author',doc.getAuthor()||'--'],['Creator',doc.getCreator()||'--'],['Producer',doc.getProducer()||'--'],['Created',doc.getCreationDate()?doc.getCreationDate().toLocaleDateString():'--']];el.innerHTML=info.map(([k,v])=>'<div class="meta-row"><span class="meta-k">'+k+'</span><span class="meta-v">'+v+'</span></div>').join('');el.style.display='block';}catch(_){}}
function showImageMeta(file,img,metaId){const el=document.getElementById(metaId);if(!el)return;const info=[['File',file.name],['Dimensions',img.naturalWidth+' × '+img.naturalHeight+' px'],['File size',fmtKB(file.size)],['Type',file.type||'--']];el.innerHTML=info.map(([k,v])=>'<div class="meta-row"><span class="meta-k">'+k+'</span><span class="meta-v">'+v+'</span></div>').join('');el.style.display='block';}

/* ── PDF.js loader ─────────────────────────────────────── */
function loadPdfJs(){if(window.pdfjsLib)return Promise.resolve();return new Promise((res,rej)=>{const s=document.createElement('script');s.src='./js/pdf.min.js';s.onload=()=>{if(window.pdfjsLib)window.pdfjsLib.GlobalWorkerOptions.workerSrc='./js/pdf.worker.min.js';res();};s.onerror=()=>{const s2=document.createElement('script');s2.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s2.onload=()=>{if(window.pdfjsLib)window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';res();};s2.onerror=rej;document.head.appendChild(s2);};document.head.appendChild(s);});}
function loadPako(){if(window.pako)return Promise.resolve();return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});}

/* ── PDF Output Preview (shared) ──────────────────────── */
const _prvBytes={};
async function previewOutputPage(toolId){const bytes=_prvBytes[toolId];if(!bytes)return;const pgNum=parseInt(document.getElementById(toolId+'-prv-pg').value)||1,cvEl=document.getElementById(toolId+'-prv-cv'),wrap=document.getElementById(toolId+'-prv-wrap');if(!cvEl||!wrap)return;await loadPdfJs();try{const pd=await window.pdfjsLib.getDocument({data:bytes}).promise,pg=await pd.getPage(Math.min(pgNum,pd.numPages)),vp=pg.getViewport({scale:1.3});cvEl.width=Math.round(vp.width);cvEl.height=Math.round(vp.height);await pg.render({canvasContext:cvEl.getContext('2d'),viewport:vp}).promise;wrap.style.display='block';}catch(e){console.error('Preview:',e);}}
function setPDFPreview(toolId,bytes,totalPages){_prvBytes[toolId]=bytes;const area=document.getElementById(toolId+'-prv-area'),pgEl=document.getElementById(toolId+'-prv-pg');if(area)area.style.display='block';if(pgEl)pgEl.max=totalPages||999;}

/* ── Download with inline rename ──────────────────────── */
function addDLItemV2(listId,defaultName,title,desc,bytes,mime){const m=mime||'application/pdf',blob=new Blob([bytes],{type:m}),url=URL.createObjectURL(blob);window._activeBlobs.push(url);const item=document.createElement('div');item.className='dl-item';item.innerHTML='<div style="flex:1;min-width:0"><div class="dl-title">'+title+'</div><div class="dl-desc">'+desc+'</div><input class="dl-rename" value="'+defaultName+'" placeholder="filename" title="Edit filename before downloading"/></div><div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end"><a href="'+url+'" class="dl-btn" onclick="this.download=this.closest(\'.dl-item\').querySelector(\'.dl-rename\').value||\''+escQ(defaultName)+'\'">⬇ Download</a><button class="sess-btn" onclick="addToSession(this.closest(\'.dl-item\').querySelector(\'.dl-rename\').value,this._b)">+ Session</button></div>';item.querySelector('.sess-btn')._b=bytes;document.getElementById(listId).appendChild(item);}
function addDLItemImgV2(listId,defaultName,title,desc,dataUrl){const item=document.createElement('div');item.className='dl-item';item.innerHTML='<div style="flex:1;min-width:0"><div class="dl-title">'+title+'</div><div class="dl-desc">'+desc+'</div><input class="dl-rename" value="'+defaultName+'" placeholder="filename" title="Edit filename before downloading"/></div><a href="'+dataUrl+'" class="dl-btn" onclick="this.download=this.closest(\'.dl-item\').querySelector(\'.dl-rename\').value||\''+escQ(defaultName)+'\'">⬇ Download</a>';document.getElementById(listId).appendChild(item);}
function addDLItem(l,f,t,d,b){addDLItemV2(l,f,t,d,b);}

/* ═══════════════════ TOOL 1: BOOKLET ═══════════════════ */
let bkBytes=null;
async function bkLoad(bytes,name){bkBytes=bytes;document.getElementById('bk-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'bk-pname','bk-pmeta','bk-pill','bk-run');if(!info){bkBytes=null;return;}document.getElementById('bk-proc').style.display='block';addLog('bk-log','Loaded: '+info.n+' pages · '+fmtKB(bytes.length),'ok');showPDFMeta(bytes,'bk-meta');populateSessUI('bk-slist','bk-sess',(b,n)=>bkLoad(b,n));}
function bkUpdatePreview(){const g=+document.getElementById('bk-gap').value,o=+document.getElementById('bk-out').value;document.getElementById('bk-gapV').textContent=g;document.getElementById('bk-outV').textContent=o;document.getElementById('bk-pw').textContent=((277-g-2*o)/2).toFixed(1)+' × 190 mm';}
/* Binding sequence -- verified against Revised.ipynb Python output */
function bkBindSeq(total,n){const g=4*n,seq=[];for(let k=1;k<=total/g;k++){const base=(k-1)*g;for(let sheet=0;sheet<n;sheet++){seq.push(base+g-sheet*2);seq.push(base+sheet*2+1);seq.push(base+sheet*2+2);seq.push(base+g-sheet*2-1);}}return seq;}
function bkPad(total,cap){const need=(cap-(total%cap))%cap;let front=0,back=0;if(need===1)back=1;else if(need>1&&need%2===0)front=back=need/2;else if(need>1){front=(need>>1)+1;back=need>>1;}return{need,front,back};}
async function bkRun(){
  if(!bkBytes)return;const gapMm=+document.getElementById('bk-gap').value,outMm=+document.getElementById('bk-out').value,sigs=+document.getElementById('bk-sheets').value,marks=document.getElementById('bk-marks').checked;
  document.getElementById('bk-run').disabled=true;document.getElementById('bk-dlist').innerHTML='';['bk-c1','bk-c2','bk-c3'].forEach(c=>chipSet(c,null));setP('bk-pf',0);
  try{
    chipSet('bk-c1','active');setP('bk-pf',5);const wMm=(277-gapMm-2*outMm)/2,tW=wMm*MM,tH=CH;
    addLog('bk-log','Step 1 › Resize to '+wMm.toFixed(2)+' × 190 mm','st');
    const src1=await PDFDocument.load(bkBytes,{ignoreEncryption:true}),out1=await PDFDocument.create(),n1=src1.getPageCount();
    const emb1=await out1.embedPdf(src1,[...Array(n1).keys()]);
    for(let i=0;i<n1;i++){out1.addPage([tW,tH]).drawPage(emb1[i],{x:0,y:0,width:tW,height:tH});if(i%4===3){setP('bk-pf',5+(i/n1)*25);await tick();}}
    const r1=await out1.save({useObjectStreams:false});chipSet('bk-c1','done');addLog('bk-log','Step 1 ✓ -- '+n1+' pages','ok');
    addDLItemV2('bk-dlist','Step1_Resized.pdf','① Resized Sub-pages',wMm.toFixed(1)+' × 190 mm per page',r1);
    chipSet('bk-c2','active');setP('bk-pf',35);const cap=sigs*4;
    const src2=await PDFDocument.load(r1,{ignoreEncryption:true}),nSrc=src2.getPageCount();
    const{need,front,back}=bkPad(nSrc,cap),working=nSrc+front+back;
    addLog('bk-log','Step 2 › '+nSrc+' pages | pad '+need+' (↑'+front+' front ↓'+back+' back)','st');
    const order=bkBindSeq(working,sigs),pageW=tW,gapPts=gapMm*MM,outPts=outMm*MM,rightX=outPts+pageW+gapPts;
    const out2=await PDFDocument.create(),emb2=await out2.embedPdf(src2,[...Array(nSrc).keys()]);
    for(let i=0;i<order.length;i+=2){
      const sheet=out2.addPage([CW,CH]),lIdx=(order[i]-1)-front,rIdx=(order[i+1]-1)-front;
      if(lIdx>=0&&lIdx<nSrc)sheet.drawPage(emb2[lIdx],{x:outPts,y:0,width:pageW,height:CH});
      if(rIdx>=0&&rIdx<nSrc)sheet.drawPage(emb2[rIdx],{x:rightX,y:0,width:pageW,height:CH});
      if(i%8===6){setP('bk-pf',35+(i/order.length)*28);await tick();}
    }
    const r2=await out2.save({useObjectStreams:false});chipSet('bk-c2','done');addLog('bk-log','Step 2 ✓ -- '+out2.getPageCount()+' sheets','ok');
    addDLItemV2('bk-dlist','Step2_Imposed.pdf','② Imposed Booklet','Pages in saddle-stitch print order',r2);
    let finalBytes=r2,finalPages=out2.getPageCount();
    if(marks){
      chipSet('bk-c3','active');setP('bk-pf',67);addLog('bk-log','Step 3 › Registration marks…','st');
      const doc3=await PDFDocument.load(r2,{ignoreEncryption:true}),font=await doc3.embedFont(StandardFonts.Helvetica);
      const midX=CW/2,fsize=11,pad=11,lnCol=rgb(0.6,0.6,0.6),txtCol=rgb(0.25,0.25,0.25),dotCol=rgb(0,0,0),da=[1.5*MM,2*MM],avail=CH-40*MM;
      const dotY=[CH-20*MM,CH-20*MM-avail/3,CH-20*MM-2*avail/3,20*MM];
      const pgs=doc3.getPages();
      for(let idx=0;idx<pgs.length;idx++){
        const pg=pgs[idx];
        if((idx+1)%2!==0){pg.drawLine({start:{x:midX,y:0},end:{x:midX,y:CH},thickness:1,color:lnCol,opacity:0.5,dashArray:da,dashPhase:0});}
        else{const ei=Math.floor(idx/2),sigNum=Math.floor(ei/sigs)+1,sheetNum=(ei%sigs)+1,text='Sig. '+sigNum+' · Sheet '+sheetNum+' of '+sigs,tW2=font.widthOfTextAtSize(text,fsize),ctr=CH/2,gBot=ctr-tW2/2-pad,gTop=ctr+tW2/2+pad;
          pg.drawLine({start:{x:midX,y:0},end:{x:midX,y:gBot},thickness:1,color:lnCol,opacity:0.5,dashArray:da,dashPhase:0});
          pg.drawLine({start:{x:midX,y:gTop},end:{x:midX,y:CH},thickness:1,color:lnCol,opacity:0.5,dashArray:da,dashPhase:0});
          pg.drawText(text,{x:midX+fsize*0.3,y:ctr-tW2/2,size:fsize,font,color:txtCol,rotate:degrees(90),opacity:0.5});}
        dotY.forEach(y=>{pg.drawCircle({x:midX,y,size:1.0*MM,borderColor:dotCol,borderWidth:0.5});pg.drawCircle({x:midX,y,size:0.3*MM,color:dotCol,borderColor:dotCol,borderWidth:0.5});});
        if(idx%4===3){setP('bk-pf',67+(idx/pgs.length)*28);await tick();}
      }
      finalBytes=await doc3.save();finalPages=pgs.length;chipSet('bk-c3','done');addLog('bk-log','Step 3 ✓','ok');
      addDLItemV2('bk-dlist','Step3_Final.pdf','③ Final + Registration Marks','Fold guide, Sig labels, binding dots',finalBytes);
    }else chipSet('bk-c3','done');
    setP('bk-pf',100);addLog('bk-log','All steps complete ✓','ok');
    setPDFPreview('bk',finalBytes,finalPages);showDL('bk-dlab','bk-dsect');incOp();
  }catch(e){addLog('bk-log','ERROR: '+e.message,'er');console.error(e);}
  document.getElementById('bk-run').disabled=false;
}

/* ═══════════════════ TOOL 2: MERGE ═══════════════════════ */
let mgQueue=[],mgSel=-1;
function mgAdd(){document.getElementById('mg-fi').click();}
async function mgHandleFiles(files){for(const f of files){const bytes=new Uint8Array(await f.arrayBuffer());try{const doc=await PDFDocument.load(bytes,{ignoreEncryption:true});mgQueue.push({name:f.name,bytes,pages:doc.getPageCount()});}catch(e){alert('Could not load '+f.name+': '+e.message);}}mgRender();}
function mgRender(){const box=document.getElementById('mg-list');if(!mgQueue.length){box.innerHTML='<div style="padding:10px;color:var(--muted);font-size:.75rem">Queue empty.</div>';document.getElementById('mg-run').disabled=true;document.getElementById('mg-stats').textContent='';return;}box.innerHTML='';mgQueue.forEach((f,i)=>{const d=document.createElement('div');d.className='fl-item'+(i===mgSel?' sel':'');d.innerHTML='<span class="fl-num">'+(i+1)+'</span><span class="fl-name">'+f.name+'</span><span class="fl-meta">'+f.pages+' pp · '+fmtKB(f.bytes.length)+'</span>';d.onclick=()=>{mgSel=i;mgRender();};box.appendChild(d);});const total=mgQueue.reduce((a,f)=>a+f.pages,0);document.getElementById('mg-stats').textContent=mgQueue.length+' files · '+total+' total pages';document.getElementById('mg-run').disabled=false;}
function mgMove(dir){if(mgSel<0||mgSel>=mgQueue.length)return;const to=mgSel+dir;if(to<0||to>=mgQueue.length)return;[mgQueue[mgSel],mgQueue[to]]=[mgQueue[to],mgQueue[mgSel]];mgSel=to;mgRender();}
function mgRem(){if(mgSel>=0){mgQueue.splice(mgSel,1);mgSel=Math.min(mgSel,mgQueue.length-1);mgRender();}}
function mgClear(){mgQueue=[];mgSel=-1;mgRender();}
async function mgRun(){
  if(!mgQueue.length)return;document.getElementById('mg-run').disabled=true;document.getElementById('mg-dlist').innerHTML='';document.getElementById('mg-proc').style.display='block';setP('mg-pf',0);
  try{addLog('mg-log','Merging '+mgQueue.length+' documents…','st');const out=await PDFDocument.create();for(let i=0;i<mgQueue.length;i++){const src=await PDFDocument.load(mgQueue[i].bytes,{ignoreEncryption:true});const copied=await out.copyPages(src,src.getPageIndices());copied.forEach(p=>out.addPage(p));addLog('mg-log','+ '+mgQueue[i].name+' ('+mgQueue[i].pages+' pages)','ok');setP('mg-pf',Math.round((i+1)/mgQueue.length*95));await tick();}
  const bytes=await out.save();setP('mg-pf',100);addLog('mg-log','Done -- '+out.getPageCount()+' pages','ok');addDLItemV2('mg-dlist','Merged.pdf','Merged Document',out.getPageCount()+' total pages',bytes);setPDFPreview('mg',bytes,out.getPageCount());showDL('mg-dlab','mg-dsect');incOp();}catch(e){addLog('mg-log','ERROR: '+e.message,'er');}document.getElementById('mg-run').disabled=false;
}

/* ═══════════════════ TOOL 3: SPLIT ═══════════════════════ */
let spBytes=null,spTotal=0,spTabIdx=0;
async function spLoad(bytes,name){spBytes=bytes;document.getElementById('sp-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'sp-pname','sp-pmeta','sp-pill','sp-run');if(!info)return;spTotal=info.n;document.getElementById('sp-proc').style.display='block';showPDFMeta(bytes,'sp-meta');populateSessUI('sp-slist','sp-sess',(b,n)=>spLoad(b,n));}
function spTab(idx,btn){spTabIdx=idx;document.querySelectorAll('#tool-split .tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');[0,1,2].forEach(i=>document.getElementById('sp-t'+i).classList.toggle('active',i===idx));}
function spGetRanges(){if(!spBytes||!spTotal)return[];if(spTabIdx===0){const str=document.getElementById('sp-ranges').value;return[{label:'Pages_'+str.replace(/\s/g,''),indices:parsePageStr(str,spTotal)}];}if(spTabIdx===1){const n=parseInt(document.getElementById('sp-n').value)||10,b=[];for(let s=0;s<spTotal;s+=n){const e=Math.min(s+n,spTotal);b.push({label:'Pages_'+(s+1)+'-'+e,indices:Array.from({length:e-s},(_,i)=>s+i)});}return b;}if(spTabIdx===2){const str=document.getElementById('sp-extract').value;return parsePageStr(str,spTotal).map(i=>({label:'Page_'+(i+1),indices:[i]}));}return[];}
function spPreview(){const r=spGetRanges(),area=document.getElementById('sp-prv-area'),list=document.getElementById('sp-prv-list'),count=document.getElementById('sp-prv-count');if(!r.length){area.style.display='none';return;}area.style.display='block';list.innerHTML='';r.forEach((rx,i)=>{const d=document.createElement('div');d.className='fl-item';d.innerHTML='<span class="fl-num">'+(i+1)+'</span><span class="fl-name">'+rx.label+'.pdf</span><span class="fl-meta">'+rx.indices.length+' page(s)</span>';list.appendChild(d);});count.textContent=r.length+' output file(s)';}
async function spRun(){const ranges=spGetRanges();if(!ranges.length||!spBytes)return;document.getElementById('sp-run').disabled=true;document.getElementById('sp-dlist').innerHTML='';document.getElementById('sp-proc').style.display='block';setP('sp-pf',0);try{addLog('sp-log','Splitting into '+ranges.length+' file(s)…','st');for(let i=0;i<ranges.length;i++){const r=ranges[i],src=await PDFDocument.load(spBytes,{ignoreEncryption:true}),out=await PDFDocument.create();const copied=await out.copyPages(src,r.indices);copied.forEach(p=>out.addPage(p));const bytes=await out.save();addDLItemV2('sp-dlist',r.label+'.pdf',r.label+'.pdf',r.indices.length+' page(s)',bytes);addLog('sp-log','✓ '+r.label+'.pdf','ok');setP('sp-pf',Math.round((i+1)/ranges.length*100));await tick();}showDL('sp-dlab','sp-dsect');incOp();}catch(e){addLog('sp-log','ERROR: '+e.message,'er');}document.getElementById('sp-run').disabled=false;}

/* ═══════════════════ TOOL 4: COMPRESS ════════════════════ */
let cpBytes=null;
async function cpLoad(bytes,name){cpBytes=bytes;document.getElementById('cp-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'cp-pname','cp-pmeta','cp-pill','cp-run');if(!info)return;document.getElementById('cp-proc').style.display='block';showPDFMeta(bytes,'cp-meta');populateSessUI('cp-slist','cp-sess',(b,n)=>cpLoad(b,n));}
async function cpRun(){if(!cpBytes)return;document.getElementById('cp-run').disabled=true;document.getElementById('cp-dlist').innerHTML='';document.getElementById('cp-proc').style.display='block';setP('cp-pf',10);try{addLog('cp-log','Re-compressing…','st');const doc=await PDFDocument.load(cpBytes,{ignoreEncryption:true});setP('cp-pf',50);await tick();const out=await doc.save({useObjectStreams:true,addDefaultPage:false}),ratio=((1-out.length/cpBytes.length)*100).toFixed(1);setP('cp-pf',100);addLog('cp-log','Original: '+fmtKB(cpBytes.length)+' → '+fmtKB(out.length)+' ('+ratio+'% reduction)','ok');addDLItemV2('cp-dlist','Compressed.pdf','Compressed PDF',fmtKB(cpBytes.length)+' → '+fmtKB(out.length)+' ('+ratio+'% smaller)',out);setPDFPreview('cp',out,doc.getPageCount());showDL('cp-dlab','cp-dsect');incOp();}catch(e){addLog('cp-log','ERROR: '+e.message,'er');}document.getElementById('cp-run').disabled=false;}

/* ═══════════════════ TOOL 5: N-UP ════════════════════════ */
let nuBytes=null;
async function nuLoad(bytes,name){nuBytes=bytes;document.getElementById('nu-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'nu-pname','nu-pmeta','nu-pill','nu-run');if(!info)return;document.getElementById('nu-proc').style.display='block';showPDFMeta(bytes,'nu-meta');populateSessUI('nu-slist','nu-sess',(b,n)=>nuLoad(b,n));}
function nuUpdateInfo(){['nu-rows','nu-cols','nu-sp','nu-mg'].forEach(id=>{document.getElementById(id+'V').textContent=document.getElementById(id).value;});const r=+document.getElementById('nu-rows').value,c=+document.getElementById('nu-cols').value;document.getElementById('nu-info').innerHTML='Grid: '+r+'×'+c+' = <b>'+(r*c)+' source pages per output sheet</b>';}
async function nuRun(){if(!nuBytes)return;document.getElementById('nu-run').disabled=true;document.getElementById('nu-dlist').innerHTML='';document.getElementById('nu-proc').style.display='block';setP('nu-pf',5);try{const rows=+document.getElementById('nu-rows').value,cols=+document.getElementById('nu-cols').value,spMm=+document.getElementById('nu-sp').value,mgMm=+document.getElementById('nu-mg').value;const sv=document.getElementById('nu-size').value.split(',').map(Number),outW=sv[0],outH=sv[1];const mgPts=mgMm*MM,spPts=spMm*MM,cellW=(outW-2*mgPts-(cols-1)*spPts)/cols,cellH=(outH-2*mgPts-(rows-1)*spPts)/rows;addLog('nu-log','Cell: '+(cellW/MM).toFixed(1)+' × '+(cellH/MM).toFixed(1)+' mm','st');const src=await PDFDocument.load(nuBytes,{ignoreEncryption:true}),n=src.getPageCount(),out=await PDFDocument.create(),emb=await out.embedPdf(src,[...Array(n).keys()]);const perSheet=rows*cols,numSheets=Math.ceil(n/perSheet);for(let s=0;s<numSheets;s++){const page=out.addPage([outW,outH]);for(let cell=0;cell<perSheet;cell++){const srcIdx=s*perSheet+cell;if(srcIdx>=n)break;const col=cell%cols,row=Math.floor(cell/cols);const x=mgPts+col*(cellW+spPts),y=outH-mgPts-(row+1)*cellH-row*spPts;page.drawPage(emb[srcIdx],{x,y,width:cellW,height:cellH});}setP('nu-pf',5+(s/numSheets)*90);await tick();}const bytes=await out.save();setP('nu-pf',100);addLog('nu-log','✓ '+numSheets+' output sheets','ok');addDLItemV2('nu-dlist','Nup_'+rows+'x'+cols+'.pdf',rows+'×'+cols+' N-up Layout',numSheets+' sheets from '+n+' pages',bytes);setPDFPreview('nu',bytes,numSheets);showDL('nu-dlab','nu-dsect');incOp();}catch(e){addLog('nu-log','ERROR: '+e.message,'er');}document.getElementById('nu-run').disabled=false;}

/* ═══════════════════ TOOL 6: REARRANGE ══════════════════ */
let raBytes=null,raOrder=[],raSel=-1;
async function raLoad(bytes,name){raBytes=bytes;document.getElementById('ra-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'ra-pname','ra-pmeta','ra-pill','ra-run');if(!info)return;raOrder=[...Array(info.n).keys()];raRender();document.getElementById('ra-proc').style.display='block';showPDFMeta(bytes,'ra-meta');populateSessUI('ra-slist','ra-sess',(b,n)=>raLoad(b,n));}
function raRender(){const box=document.getElementById('ra-list');box.innerHTML='';raOrder.forEach((orig,disp)=>{const d=document.createElement('div');d.className='fl-item'+(disp===raSel?' sel':'');d.innerHTML='<span class="fl-num">'+(disp+1)+'</span><span class="fl-name">Page '+(orig+1)+'</span><span class="fl-meta">orig: '+(orig+1)+'</span>';d.onclick=()=>{raSel=disp;raRender();};box.appendChild(d);});document.getElementById('ra-count').textContent=raOrder.length+' pages in current order';}
function raShift(dir){if(raSel<0)return;const to=raSel+dir;if(to<0||to>=raOrder.length)return;[raOrder[raSel],raOrder[to]]=[raOrder[to],raOrder[raSel]];raSel=to;raRender();}
function raDup(){if(raSel>=0){raOrder.splice(raSel,0,raOrder[raSel]);raRender();}}
function raDel(){if(raSel>=0&&raOrder.length>1){raOrder.splice(raSel,1);raSel=Math.min(raSel,raOrder.length-1);raRender();}}
function raReset(){if(!raBytes)return;const n=raOrder.reduce((m,v)=>Math.max(m,v),0)+1;raOrder=[...Array(n).keys()];raSel=-1;raRender();}
async function raRun(){if(!raBytes||!raOrder.length)return;document.getElementById('ra-run').disabled=true;document.getElementById('ra-dlist').innerHTML='';document.getElementById('ra-proc').style.display='block';setP('ra-pf',10);try{const src=await PDFDocument.load(raBytes,{ignoreEncryption:true}),out=await PDFDocument.create();const copied=await out.copyPages(src,raOrder);copied.forEach(p=>out.addPage(p));setP('ra-pf',90);await tick();const bytes=await out.save();setP('ra-pf',100);addLog('ra-log','✓ Reordered -- '+raOrder.length+' pages','ok');addDLItemV2('ra-dlist','Reordered.pdf','Reordered Document',raOrder.length+' pages in new order',bytes);setPDFPreview('ra',bytes,raOrder.length);showDL('ra-dlab','ra-dsect');incOp();}catch(e){addLog('ra-log','ERROR: '+e.message,'er');}document.getElementById('ra-run').disabled=false;}

/* ═══════════════════ TOOL 7: PDF→IMAGE ══════════════════ */
let tiBytes=null;
async function tiLoad(bytes,name){tiBytes=bytes;document.getElementById('ti-pname').textContent=name||'document.pdf';document.getElementById('ti-pmeta').textContent=fmtKB(bytes.length);document.getElementById('ti-pill').classList.add('on');document.getElementById('ti-run').disabled=false;document.getElementById('ti-proc').style.display='block';showPDFMeta(bytes,'ti-meta');populateSessUI('ti-slist','ti-sess',(b,n)=>tiLoad(b,n));}
async function tiRun(){if(!tiBytes)return;document.getElementById('ti-run').disabled=true;document.getElementById('ti-dlist').innerHTML='';document.getElementById('ti-proc').style.display='block';setP('ti-pf',0);addLog('ti-log','Loading pdf.js…','st');try{await loadPdfJs();const dpi=parseInt(document.querySelector('input[name="ti-dpi"]:checked').value),fmt=document.querySelector('input[name="ti-fmt"]:checked').value,ext=fmt==='jpeg'?'jpg':'png',scale=dpi/72;const pdfDoc=await window.pdfjsLib.getDocument({data:tiBytes}).promise,total=pdfDoc.numPages;const pageStr=document.getElementById('ti-pages').value;const pageIdxs=pageStr.trim()?parsePageStr(pageStr,total):[...Array(total).keys()];addLog('ti-log','Rendering '+pageIdxs.length+' page(s) at '+dpi+' DPI…','st');for(let i=0;i<pageIdxs.length;i++){const pg=await pdfDoc.getPage(pageIdxs[i]+1),vp=pg.getViewport({scale});const cv=document.createElement('canvas');cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;const dataUrl=cv.toDataURL('image/'+fmt,fmt==='jpeg'?0.92:undefined),fname='page_'+(pageIdxs[i]+1)+'.'+ext;addDLItemImgV2('ti-dlist',fname,fname,cv.width+'×'+cv.height+' px',dataUrl);addLog('ti-log','✓ Page '+(pageIdxs[i]+1),'ok');setP('ti-pf',Math.round((i+1)/pageIdxs.length*100));await tick();}showDL('ti-dlab','ti-dsect');incOp();}catch(e){addLog('ti-log','ERROR: '+e.message,'er');console.error(e);}document.getElementById('ti-run').disabled=false;}

/* ═══════════════════ TOOL 8: ADD WATERMARK ══════════════
   FIX: Trig-corrected anchor for diagonal text.
   In pdf-lib, drawText rotates around (x,y). To visually centre
   rotated text at page centre, compute the anchor as:
     x = pageCentreX − (textWidth/2)*cos(θ) + (fontSize/2)*sin(θ)
     y = pageCentreY − (textWidth/2)*sin(θ) − (fontSize/2)*cos(θ)
   This places the text's visual midpoint exactly at page centre.
═══════════════════════════════════════════════════════════ */
let waBytes=null,waImgBytes=null,waImgType=null;
async function waLoad(bytes,name){waBytes=bytes;document.getElementById('wa-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'wa-pname','wa-pmeta','wa-pill','wa-run');if(!info)return;document.getElementById('wa-proc').style.display='block';showPDFMeta(bytes,'wa-meta');populateSessUI('wa-slist','wa-sess',(b,n)=>waLoad(b,n));}
function waLoadImg(file){waImgType=file.type;const reader=new FileReader();reader.onload=e=>{waImgBytes=new Uint8Array(e.target.result);const p=document.getElementById('wa-img-pill');if(p){p.querySelector('.pill-name').textContent=file.name;p.querySelector('.pill-meta').textContent=fmtKB(file.size);p.classList.add('on');}};reader.readAsArrayBuffer(file);}
function waTab(idx,btn){document.querySelectorAll('#tool-wmadd .tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.getElementById('wa-tab-text').style.display=idx===0?'block':'none';document.getElementById('wa-tab-img').style.display=idx===1?'block':'none';}
async function waRun(){
  if(!waBytes)return;document.getElementById('wa-run').disabled=true;document.getElementById('wa-dlist').innerHTML='';document.getElementById('wa-proc').style.display='block';setP('wa-pf',5);
  const isImg=document.getElementById('wa-tab-img')&&document.getElementById('wa-tab-img').style.display==='block';
  const op=+document.getElementById('wa-op').value/100,pos=document.getElementById('wa-pos').value;
  try{
    const doc=await PDFDocument.load(waBytes,{ignoreEncryption:true}),pages=doc.getPages();
    if(isImg&&waImgBytes){
      addLog('wa-log','Embedding image watermark on '+pages.length+' pages…','st');
      let embImg;if(waImgType==='image/png')embImg=await doc.embedPng(waImgBytes);else embImg=await doc.embedJpg(waImgBytes);
      const scaleVal=document.getElementById('wa-img-scale')?+document.getElementById('wa-img-scale').value/100:0.3;
      const dims=embImg.scale(scaleVal);const pad=20;
      pages.forEach(pg=>{const{width,height}=pg.getSize();let x,y;if(pos==='diag'||pos==='center'){x=(width-dims.width)/2;y=(height-dims.height)/2;}else if(pos==='tl'){x=pad;y=height-dims.height-pad;}else if(pos==='tr'){x=width-dims.width-pad;y=height-dims.height-pad;}else if(pos==='bl'){x=pad;y=pad;}else{x=width-dims.width-pad;y=pad;}pg.drawImage(embImg,{x,y,width:dims.width,height:dims.height,opacity:op});});
    } else {
      const text=document.getElementById('wa-text').value||'WATERMARK';
      const fsize=+document.getElementById('wa-fs').value,rotDeg=+document.getElementById('wa-rot').value;
      const hexCol=document.getElementById('wa-col').value,col=hexToRgb01(hexCol);
      const font=await doc.embedFont(StandardFonts.HelveticaBold);
      addLog('wa-log','Applying "'+text+'" to '+pages.length+' pages…','st');
      pages.forEach(pg=>{
        const{width,height}=pg.getSize(),tW=font.widthOfTextAtSize(text,fsize);
        let x,y,rot=rotDeg;const pad=18;
        if(pos==='diag'||pos==='center'){
          /* TRIG-CORRECTED CENTRE: anchor point adjusted so text midpoint lands at page centre */
          const rad=(pos==='center'?0:rotDeg)*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
          x=width/2-(tW/2)*cos+(fsize/2)*sin;
          y=height/2-(tW/2)*sin-(fsize/2)*cos;
          if(pos==='center')rot=0;
        }else{x=pos.includes('r')?width-tW-pad:pad;y=pos.includes('t')?height-fsize-pad:pad;rot=0;}
        pg.drawText(text,{x,y,size:fsize,font,color:rgb(col.r,col.g,col.b),opacity:op,rotate:degrees(rot)});
      });
    }
    const bytes=await doc.save();setP('wa-pf',100);
    addLog('wa-log','✓ Watermark applied to '+pages.length+' pages','ok');
    addDLItemV2('wa-dlist','Watermarked.pdf','Watermarked PDF',(isImg?'Image':'Text')+' watermark on all '+pages.length+' pages',bytes);
    setPDFPreview('wa',bytes,pages.length);showDL('wa-dlab','wa-dsect');incOp();
  }catch(e){addLog('wa-log','ERROR: '+e.message,'er');}
  document.getElementById('wa-run').disabled=false;
}

/* ═══════════════════ TOOL 9: REMOVE WATERMARK ══════════
   4 strategies ported from Watermark_removal_.ipynb:
   S1: Strip annotation layer (handles Acrobat stamps)
   S2: Text-search redaction (pdf.js + white rect)
   S3: Overdraw large background raster images
   S4: Grey-vector neutralization (pako DEFLATE decompress)
═══════════════════════════════════════════════════════════ */
let wrBytes=null,wrCleanBytes=null;
async function wrLoad(bytes,name){wrBytes=bytes;wrCleanBytes=null;document.getElementById('wr-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'wr-pname','wr-pmeta','wr-pill','wr-run');if(!info)return;document.getElementById('wr-proc').style.display='block';showPDFMeta(bytes,'wr-meta');populateSessUI('wr-slist','wr-sess',(b,n)=>wrLoad(b,n));}
async function wrScan(){
  if(!wrBytes){alert('Load a PDF first.');return;}
  const logEl=document.getElementById('wr-scanlog');logEl.style.display='block';logEl.innerHTML='';
  const addS=(m,t)=>addLog('wr-scanlog',m,t);
  addS('Scanning document structure…','st');
  try{
    const doc=await PDFDocument.load(wrBytes,{ignoreEncryption:true}),pages=doc.getPages();
    let annCount=0,xobjCount=0;
    pages.forEach(pg=>{try{const a=pg.node.get(PDFLib.PDFName.of('Annots'));if(a)annCount++;}catch(_){}try{const res=pg.node.Resources();if(res){const xo=res.lookup(PDFLib.PDFName.of('XObject'),PDFLib.PDFDict);if(xo)xobjCount+=xo.entries().length;}}catch(_){}});
    addS('Annotation layers on pages: '+annCount,(annCount>0?'wn':'ok'));
    addS('XObject overlays found: '+xobjCount,(xobjCount>0?'wn':'ok'));
    if(annCount>0)addS('→ Strategy 1 (strip annotations) should be effective.','ok');
    if(xobjCount>0)addS('→ Strategy 3 (image overdraw) or Strategy 4 (vector) may help XObjects.','ok');
    if(!annCount&&!xobjCount)addS('No annotation-layer marks detected. Try Strategies 3 or 4 for embedded watermarks.','wn');
  }catch(e){addS('ERROR: '+e.message,'er');}
}
async function wrNeutralizeVectors(doc,logId){
  await loadPako().catch(()=>null);
  if(!window.pako){addLog(logId,'⚠ pako unavailable -- skipping Strategy 4','wn');return 0;}
  /* Grey range: 0.60–0.99 (same as Python obliterate_remaining_watermark) */
  const rgbRE=/(?:0\.[6-9]\d*)\s+(?:0\.[6-9]\d*)\s+(?:0\.[6-9]\d*)\s+(rg|RG)\b/g;
  const grayRE=/(?:0\.[6-9]\d*)\s+(g|G)\b/g;
  let count=0;
  try{
    for(const[,obj]of doc.context.enumerateIndirectObjects()){
      if(!(obj instanceof PDFLib.PDFRawStream))continue;
      try{
        const filterObj=obj.dict.get(PDFLib.PDFName.of('Filter'));
        const isFlate=filterObj&&filterObj.toString().includes('FlateDecode');
        let bytes=obj.contents,decompressed;
        if(isFlate){try{decompressed=pako.inflate(bytes);}catch(_){continue;}}
        else if(!filterObj)decompressed=bytes;
        else continue;
        let str='';for(let i=0;i<decompressed.length;i++)str+=String.fromCharCode(decompressed[i]);
        const modified=str.replace(rgbRE,'1.0 1.0 1.0 $1').replace(grayRE,'1.0 $1');
        if(modified===str)continue;
        const nb=new Uint8Array(modified.length);for(let i=0;i<modified.length;i++)nb[i]=modified.charCodeAt(i)&0xff;
        obj.contents=isFlate?pako.deflate(nb):nb;
        obj.dict.set(PDFLib.PDFName.of('Length'),doc.context.obj(obj.contents.length));count++;
      }catch(_){continue;}
    }
  }catch(_){}
  return count;
}
async function wrRun(){
  if(!wrBytes)return;document.getElementById('wr-run').disabled=true;document.getElementById('wr-dlist').innerHTML='';document.getElementById('wr-proc').style.display='block';setP('wr-pf',5);
  const s1=document.getElementById('wr-s1').checked,s2=document.getElementById('wr-s2').checked;
  const s2kw=(document.getElementById('wr-txtval').value||'').trim();
  const s3=document.getElementById('wr-s3').checked,s4=document.getElementById('wr-s4').checked;
  const s3thresh=parseInt((document.getElementById('wr-s3thresh')||{value:'400'}).value)||400;
  try{
    const doc=await PDFDocument.load(wrBytes,{ignoreEncryption:true}),pages=doc.getPages();
    addLog('wr-log','Processing '+pages.length+' pages…','st');
    if(s1){let n=0;pages.forEach(pg=>{try{const k=PDFLib.PDFName.of('Annots');if(pg.node.get(k)){pg.node.delete(k);n++;}}catch(_){} });addLog('wr-log','Strategy 1: removed annotations on '+n+' page(s)',n>0?'ok':'wn');}
    setP('wr-pf',20);await tick();
    if(s2&&s2kw){
      let found=0;
      await loadPdfJs().catch(()=>null);
      if(window.pdfjsLib){
        const pdfDoc=await window.pdfjsLib.getDocument({data:wrBytes}).promise;
        for(let pi=0;pi<pages.length;pi++){const pg=pages[pi],{height}=pg.getSize(),pjsPg=await pdfDoc.getPage(pi+1),tc=await pjsPg.getTextContent();tc.items.forEach(item=>{if(item.str&&item.str.toUpperCase().includes(s2kw.toUpperCase())){const t=item.transform,x=t[4],y=t[5],w=item.width||80,h=item.height||12;pg.drawRectangle({x:x-5,y:y-3,width:w+10,height:h+6,color:rgb(1,1,1),opacity:1});found++;}});}
      }else{pages.forEach(pg=>{const{width,height}=pg.getSize();pg.drawRectangle({x:0,y:height*0.35,width,height:height*0.3,color:rgb(1,1,1),opacity:1});found++;});addLog('wr-log','⚠ pdf.js not loaded -- used centre-stripe fallback','wn');}
      addLog('wr-log','Strategy 2: covered '+found+' text occurrence(s) of "'+s2kw+'"',found>0?'ok':'wn');
    }
    setP('wr-pf',45);await tick();
    if(s3){let n=0;for(let pi=0;pi<pages.length;pi++){const pg=pages[pi],{width,height}=pg.getSize();try{const xos=pg.node.Resources()?.lookup(PDFLib.PDFName.of('XObject'),PDFLib.PDFDict);if(!xos)continue;for(const[,val]of xos.entries()){try{const sub=val.dict&&val.dict.get(PDFLib.PDFName.of('Subtype'));if(sub&&sub.toString()==='/Image'){const iw=parseInt(val.dict.get(PDFLib.PDFName.of('Width')))||0,ih=parseInt(val.dict.get(PDFLib.PDFName.of('Height')))||0;if(iw>s3thresh&&ih>s3thresh){pg.drawRectangle({x:0,y:0,width,height,color:rgb(1,1,1),opacity:1});n++;}}}catch(_){}}}catch(_){}}addLog('wr-log','Strategy 3: covered '+n+' large image(s) >'+s3thresh+'px',n>0?'ok':'wn');}
    setP('wr-pf',65);await tick();
    if(s4){addLog('wr-log','Strategy 4: Loading pako and scanning content streams…','st');const mod=await wrNeutralizeVectors(doc,'wr-log');addLog('wr-log','Strategy 4: modified '+mod+' stream(s)',mod>0?'ok':'wn');}
    setP('wr-pf',90);await tick();
    wrCleanBytes=await doc.save();setP('wr-pf',100);
    addLog('wr-log','✓ Done -- review output visually before use.','ok');
    addDLItemV2('wr-dlist','Cleaned.pdf','Cleaned Document','Watermark removal applied',wrCleanBytes);
    setPDFPreview('wr',wrCleanBytes,pages.length);showDL('wr-dlab','wr-dsect');incOp();
  }catch(e){addLog('wr-log','ERROR: '+e.message,'er');console.error(e);}
  document.getElementById('wr-run').disabled=false;
}

/* ═══════════════════ TOOL 10: UNLOCK ════════════════════ */
let unBytes=null;
async function unLoad(bytes,name){unBytes=bytes;document.getElementById('un-pname').textContent=name||'document.pdf';document.getElementById('un-pmeta').textContent=fmtKB(bytes.length);document.getElementById('un-pill').classList.add('on');document.getElementById('un-run').disabled=false;document.getElementById('un-proc').style.display='block';showPDFMeta(bytes,'un-meta');}
async function unRun(){if(!unBytes)return;document.getElementById('un-run').disabled=true;document.getElementById('un-proc').style.display='block';document.getElementById('un-log').innerHTML='';addLog('un-log','Attempting decrypt…','st');try{const pwd=document.getElementById('un-pwd').value,doc=await PDFDocument.load(unBytes,{ignoreEncryption:false,password:pwd});const out=await PDFDocument.create(),pages=await out.copyPages(doc,doc.getPageIndices());pages.forEach(p=>out.addPage(p));const bytes=await out.save();addLog('un-log','✓ Decrypted -- '+doc.getPageCount()+' pages unlocked','ok');addDLItemV2('un-dlist','Unlocked.pdf','Unlocked PDF',doc.getPageCount()+' pages · password removed',bytes);setPDFPreview('un',bytes,doc.getPageCount());showDL('un-dlab','un-dsect');incOp();}catch(e){if(e.message&&e.message.toLowerCase().includes('password'))addLog('un-log','Wrong password. Try again.','er');else addLog('un-log','ERROR: '+e.message,'er');}document.getElementById('un-run').disabled=false;}

/* ═══════════════════ TOOL 11: VERIFIED STAMP ════════════ */
let vfBytes=null;
async function vfLoad(bytes,name){vfBytes=bytes;document.getElementById('vf-pname').textContent=name||'document.pdf';const info=await loadPDF(bytes,'vf-pname','vf-pmeta','vf-pill','vf-run');if(!info)return;document.getElementById('vf-proc').style.display='block';showPDFMeta(bytes,'vf-meta');populateSessUI('vf-slist','vf-sess',(b,n)=>vfLoad(b,n));}
async function vfRun(){if(!vfBytes)return;document.getElementById('vf-run').disabled=true;document.getElementById('vf-dlist').innerHTML='';document.getElementById('vf-proc').style.display='block';setP('vf-pf',5);try{const stampText=document.getElementById('vf-txt').value,colKey=document.getElementById('vf-col').value,posKey=document.getElementById('vf-pos').value;const pagesInput=document.getElementById('vf-pages').value.trim().toLowerCase(),addDate=document.getElementById('vf-date').checked;const colMap={green:[0.05,0.55,0.2],blue:[0.1,0.3,0.8],red:[0.7,0.1,0.1]},cv=colMap[colKey]||colMap.green,sc=rgb(cv[0],cv[1],cv[2]);const dateStr=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});const doc=await PDFDocument.load(vfBytes,{ignoreEncryption:true}),font=await doc.embedFont(StandardFonts.HelveticaBold),fontR=await doc.embedFont(StandardFonts.Helvetica);const pages=doc.getPages(),total=pages.length;const tgPgs=pagesInput==='all'?[...Array(total).keys()]:parsePageStr(pagesInput,total);addLog('vf-log','Stamping '+tgPgs.length+' page(s)…','st');tgPgs.forEach(idx=>{const pg=pages[idx],{width,height}=pg.getSize();const bW=120,bH=addDate?50:38,pad=14;let bX,bY;if(posKey==='br'){bX=width-bW-pad;bY=pad;}else if(posKey==='bl'){bX=pad;bY=pad;}else if(posKey==='tr'){bX=width-bW-pad;bY=height-bH-pad;}else{bX=pad;bY=height-bH-pad;}pg.drawRectangle({x:bX,y:bY,width:bW,height:bH,borderColor:sc,borderWidth:2.5,opacity:0.85});pg.drawRectangle({x:bX+3,y:bY+3,width:bW-6,height:bH-6,borderColor:sc,borderWidth:1,opacity:0.5});pg.drawText('✓',{x:bX+7,y:bY+bH/2-6,size:13,font,color:sc,opacity:0.9});const tSize=11,tW2=font.widthOfTextAtSize(stampText,tSize);pg.drawText(stampText,{x:bX+(bW-tW2)/2,y:bY+(addDate?bH/2:bH/2-tSize/2+2),size:tSize,font,color:sc,opacity:0.9});if(addDate){const dSize=8,dW=fontR.widthOfTextAtSize(dateStr,dSize);pg.drawText(dateStr,{x:bX+(bW-dW)/2,y:bY+6,size:dSize,font:fontR,color:sc,opacity:0.75});}});const bytes=await doc.save();setP('vf-pf',100);addLog('vf-log','✓ Stamp applied to '+tgPgs.length+' page(s)','ok');addDLItemV2('vf-dlist','Verified.pdf','Stamped PDF','"'+stampText+'" on '+tgPgs.length+' page(s)',bytes);setPDFPreview('vf',bytes,total);showDL('vf-dlab','vf-dsect');incOp();}catch(e){addLog('vf-log','ERROR: '+e.message,'er');}document.getElementById('vf-run').disabled=false;}

/* ═══════════════════ TOOL 12: IMAGE COMPRESS ════════════ */
let icImg=null,icOrigFile=null,icOutDataUrl=null;
function icLoad(file){icOrigFile=file;const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{icImg=img;document.getElementById('ic-pname').textContent=file.name;document.getElementById('ic-pmeta').textContent=file.type+' · '+fmtKB(file.size);document.getElementById('ic-pill').classList.add('on');document.getElementById('ic-run').disabled=false;const cv=document.getElementById('ic-orig'),mx=300,sc=Math.min(1,mx/img.naturalWidth);cv.width=img.naturalWidth*sc;cv.height=img.naturalHeight*sc;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);document.getElementById('ic-orig-sz').textContent=fmtKB(file.size);showImageMeta(file,img,'ic-meta');icUpdate();};img.src=e.target.result;};reader.readAsDataURL(file);}
function icUpdate(){if(!icImg)return;const fmt=document.getElementById('ic-fmt').value,q=parseInt(document.getElementById('ic-q').value)/100;document.getElementById('ic-qV').textContent=(q*100).toFixed(0)+'%';const cv=document.getElementById('ic-out'),mx=300,sc=Math.min(1,mx/icImg.naturalWidth);cv.width=icImg.naturalWidth*sc;cv.height=icImg.naturalHeight*sc;cv.getContext('2d').drawImage(icImg,0,0,cv.width,cv.height);const cv2=document.createElement('canvas');cv2.width=icImg.naturalWidth;cv2.height=icImg.naturalHeight;cv2.getContext('2d').drawImage(icImg,0,0);icOutDataUrl=cv2.toDataURL(fmt,fmt==='image/png'?undefined:q);document.getElementById('ic-out-sz').textContent=fmtKB(Math.round(icOutDataUrl.split(',')[1].length*0.75));}
function icDownload(){if(!icOutDataUrl)return;const fmt=document.getElementById('ic-fmt').value,ext=fmt.split('/')[1]==='jpeg'?'jpg':fmt.split('/')[1],base=icOrigFile?icOrigFile.name.replace(/\.[^.]+$/,''):'compressed';const a=document.createElement('a');a.href=icOutDataUrl;a.download=base+'_compressed.'+ext;a.click();incOp();}

/* ═══════════════════ TOOL 13: IMAGE RESIZE ══════════════ */
let irImg=null,irOrigW=1,irOrigH=1;
function irLoad(file){const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{irImg=img;irOrigW=img.naturalWidth;irOrigH=img.naturalHeight;document.getElementById('ir-pname').textContent=file.name;document.getElementById('ir-pmeta').textContent=irOrigW+'×'+irOrigH+' px · '+fmtKB(file.size);document.getElementById('ir-pill').classList.add('on');document.getElementById('ir-run').disabled=false;document.getElementById('ir-proc').style.display='block';document.getElementById('ir-w').value=irOrigW;document.getElementById('ir-h').value=irOrigH;document.getElementById('ir-name').value=file.name.replace(/\.[^.]+$/,'');showImageMeta(file,img,'ir-meta');irCalcInfo();};img.src=e.target.result;};reader.readAsDataURL(file);}
function irAspect(changed){if(!document.getElementById('ir-asp').checked){irCalcInfo();return;}const ratio=irOrigW/irOrigH;if(changed==='w'){const w=parseFloat(document.getElementById('ir-w').value);if(!isNaN(w)&&w>0)document.getElementById('ir-h').value=Math.round(w/ratio);}else{const h=parseFloat(document.getElementById('ir-h').value);if(!isNaN(h)&&h>0)document.getElementById('ir-w').value=Math.round(h*ratio);}irCalcInfo();}
function irCalcInfo(){const w=parseFloat(document.getElementById('ir-w').value),h=parseFloat(document.getElementById('ir-h').value),unit=document.getElementById('ir-unit').value,dpi=parseInt(document.getElementById('ir-dpi').value);if(isNaN(w)||isNaN(h)){document.getElementById('ir-info').textContent='Enter dimensions above.';return;}let px_w,px_h;if(unit==='px'){px_w=Math.round(w);px_h=Math.round(h);}else if(unit==='cm'){px_w=Math.round(w/2.54*dpi);px_h=Math.round(h/2.54*dpi);}else{px_w=Math.round(w*dpi);px_h=Math.round(h*dpi);}document.getElementById('ir-info').innerHTML='Output: <b>'+px_w+' × '+px_h+' px</b>'+(unit!=='px'?' at '+dpi+' DPI':'');}
async function irRun(){if(!irImg)return;document.getElementById('ir-run').disabled=true;document.getElementById('ir-proc').style.display='block';document.getElementById('ir-log').innerHTML='';addLog('ir-log','Processing…','st');try{const w=parseFloat(document.getElementById('ir-w').value),h=parseFloat(document.getElementById('ir-h').value),unit=document.getElementById('ir-unit').value,dpi=parseInt(document.getElementById('ir-dpi').value),maxKB=parseFloat(document.getElementById('ir-maxkb').value)||0,fmt=document.getElementById('ir-fmt').value,name=document.getElementById('ir-name').value||'resized';let px_w,px_h;if(unit==='px'){px_w=Math.round(w);px_h=Math.round(h);}else if(unit==='cm'){px_w=Math.round(w/2.54*dpi);px_h=Math.round(h/2.54*dpi);}else{px_w=Math.round(w*dpi);px_h=Math.round(h*dpi);}const cv=document.createElement('canvas');cv.width=px_w;cv.height=px_h;cv.getContext('2d').drawImage(irImg,0,0,px_w,px_h);let dataUrl;if(maxKB>0&&fmt!=='image/png'){let lo=0.01,hi=1.0,q=0.85;for(let i=0;i<14;i++){dataUrl=cv.toDataURL(fmt,q);const approxKB=Math.round(dataUrl.split(',')[1].length*0.75/1024);if(approxKB<=maxKB*1.05)lo=q;else hi=q;q=(lo+hi)/2;if(hi-lo<0.005)break;}addLog('ir-log','Target: '+maxKB+' KB · Achieved: ~'+Math.round(dataUrl.split(',')[1].length*0.75/1024)+' KB','ok');}else dataUrl=cv.toDataURL(fmt,fmt==='image/png'?undefined:0.92);const prv=document.getElementById('ir-prv-wrap'),pvc=document.getElementById('ir-cv'),psc=Math.min(1,240/px_w);pvc.width=px_w*psc;pvc.height=px_h*psc;pvc.getContext('2d').drawImage(cv,0,0,pvc.width,pvc.height);prv.style.display='block';const ext=fmt.split('/')[1]==='jpeg'?'jpg':fmt.split('/')[1];const a=document.createElement('a');a.href=dataUrl;a.download=name+'.'+ext;a.click();addLog('ir-log','✓ '+px_w+'×'+px_h+' px → '+name+'.'+ext,'ok');incOp();}catch(e){addLog('ir-log','ERROR: '+e.message,'er');}document.getElementById('ir-run').disabled=false;}

/* ═══════════════════ TOOL 14: PASSPORT PHOTO ════════════ */
let ppImg=null;
function ppLoad(file){const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{ppImg=img;document.getElementById('pp-pname').textContent=file.name;document.getElementById('pp-pmeta').textContent=img.naturalWidth+'×'+img.naturalHeight+' px';document.getElementById('pp-pill').classList.add('on');document.getElementById('pp-run').disabled=false;showImageMeta(file,img,'pp-meta');ppPreview();};img.src=e.target.result;};reader.readAsDataURL(file);}
function ppPreset(){const v=document.getElementById('pp-preset').value;if(!v)return;const p=v.split(',');document.getElementById('pp-wmm').value=p[0];document.getElementById('pp-hmm').value=p[1];document.getElementById('pp-dpi').value=p[2];ppInfo();ppPreview();}
function ppInfo(){const wM=parseFloat(document.getElementById('pp-wmm').value),hM=parseFloat(document.getElementById('pp-hmm').value),dpi=parseInt(document.getElementById('pp-dpi').value);document.getElementById('pp-info').innerHTML='Output: <b>'+Math.round(wM/25.4*dpi)+' × '+Math.round(hM/25.4*dpi)+' px</b> at '+dpi+' DPI';}
function ppPreview(){if(!ppImg)return;const sl=id=>parseInt(document.getElementById(id).value)||0;['pp-clV','pp-crV','pp-ctV','pp-cbV'].forEach((id,i)=>document.getElementById(id).textContent=sl(['pp-cl','pp-cr','pp-ct','pp-cb'][i])+'%');document.getElementById('pp-rotV').textContent=sl('pp-rot')+'°';document.getElementById('pp-brV').textContent=sl('pp-br');document.getElementById('pp-conV').textContent=sl('pp-con');document.getElementById('pp-satV').textContent=sl('pp-sat');const cv=document.getElementById('pp-cv'),ctx=cv.getContext('2d'),src=ppImg,sW=src.naturalWidth,sH=src.naturalHeight;const cl=sl('pp-cl')/100,cr=sl('pp-cr')/100,ct=sl('pp-ct')/100,cb=sl('pp-cb')/100;const cropX=sW*cl,cropY=sH*ct,cropW=sW*(1-cl-cr),cropH=sH*(1-ct-cb);const pW=180,pH=Math.round(pW*cropH/cropW);cv.width=pW;cv.height=pH;ctx.save();ctx.translate(pW/2,pH/2);ctx.rotate(sl('pp-rot')*Math.PI/180);ctx.drawImage(src,cropX,cropY,cropW,cropH,-pW/2,-pH/2,pW,pH);ctx.restore();ppApplyFilters(ctx,pW,pH,sl('pp-br'),sl('pp-con'),sl('pp-sat'));document.getElementById('pp-prv-wrap').style.display='block';}
function ppApplyFilters(ctx,w,h,br,con,sat){if(!br&&!con&&!sat)return;const imgData=ctx.getImageData(0,0,w,h),d=imgData.data,brf=br/255,conf=(con+100)/100,satf=(sat+100)/100;for(let i=0;i<d.length;i+=4){let r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;r+=brf;g+=brf;b+=brf;r=(r-.5)*conf+.5;g=(g-.5)*conf+.5;b=(b-.5)*conf+.5;const lum=.299*r+.587*g+.114*b;r=lum+(r-lum)*satf;g=lum+(g-lum)*satf;b=lum+(b-lum)*satf;d[i]=Math.max(0,Math.min(255,r*255));d[i+1]=Math.max(0,Math.min(255,g*255));d[i+2]=Math.max(0,Math.min(255,b*255));}ctx.putImageData(imgData,0,0);}
function ppRun(){if(!ppImg)return;const sl=id=>parseInt(document.getElementById(id).value)||0;const wM=parseFloat(document.getElementById('pp-wmm').value),hM=parseFloat(document.getElementById('pp-hmm').value),dpi=parseInt(document.getElementById('pp-dpi').value),fmt=document.getElementById('pp-fmt').value;const name=document.getElementById('pp-name').value||'passport_photo';const pxW=Math.round(wM/25.4*dpi),pxH=Math.round(hM/25.4*dpi);const src=ppImg,sW=src.naturalWidth,sH=src.naturalHeight;const cl=sl('pp-cl')/100,cr=sl('pp-cr')/100,ct=sl('pp-ct')/100,cb=sl('pp-cb')/100;const cv=document.createElement('canvas');cv.width=pxW;cv.height=pxH;const ctx=cv.getContext('2d');ctx.save();ctx.translate(pxW/2,pxH/2);ctx.rotate(sl('pp-rot')*Math.PI/180);ctx.drawImage(src,sW*cl,sH*ct,sW*(1-cl-cr),sH*(1-ct-cb),-pxW/2,-pxH/2,pxW,pxH);ctx.restore();ppApplyFilters(ctx,pxW,pxH,sl('pp-br'),sl('pp-con'),sl('pp-sat'));const ext=fmt.split('/')[1]==='jpeg'?'jpg':'png';const a=document.createElement('a');a.href=cv.toDataURL(fmt,fmt==='image/jpeg'?0.92:undefined);a.download=name+'.'+ext;a.click();incOp();}

/* ═══════════════════ TOOL 15: SIGNATURE CLEANER ════════ */
let sgImg=null;
function sgLoad(file){const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{sgImg=img;document.getElementById('sg-pname').textContent=file.name;document.getElementById('sg-pmeta').textContent=img.naturalWidth+'×'+img.naturalHeight+' px';document.getElementById('sg-pill').classList.add('on');document.getElementById('sg-run').disabled=false;const cv=document.getElementById('sg-orig'),mx=240,sc=Math.min(1,mx/img.naturalWidth);cv.width=img.naturalWidth*sc;cv.height=img.naturalHeight*sc;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);showImageMeta(file,img,'sg-meta');sgProcess();};img.src=e.target.result;};reader.readAsDataURL(file);}
function sgProcess(){if(!sgImg)return;const thresh=parseInt(document.getElementById('sg-th').value),br=parseInt(document.getElementById('sg-br').value),con=parseInt(document.getElementById('sg-con').value);document.getElementById('sg-thV').textContent=thresh;document.getElementById('sg-brV').textContent=br;document.getElementById('sg-conV').textContent=con;const src=sgImg,mx=240,sc=Math.min(1,mx/src.naturalWidth);const cv=document.getElementById('sg-out');cv.width=Math.round(src.naturalWidth*sc);cv.height=Math.round(src.naturalHeight*sc);const ctx=cv.getContext('2d');ctx.drawImage(src,0,0,cv.width,cv.height);const id=ctx.getImageData(0,0,cv.width,cv.height),dat=id.data;const brf=br/255,conf=(con+100)/100;for(let i=0;i<dat.length;i+=4){let r=dat[i]/255,g=dat[i+1]/255,b=dat[i+2]/255;r+=brf;g+=brf;b+=brf;r=(r-.5)*conf+.5;g=(g-.5)*conf+.5;b=(b-.5)*conf+.5;const lum=(Math.max(0,Math.min(1,r))+Math.max(0,Math.min(1,g))+Math.max(0,Math.min(1,b)))/3;if(lum*255>thresh)dat[i+3]=0;else{dat[i]=Math.max(0,Math.min(255,r*255));dat[i+1]=Math.max(0,Math.min(255,g*255));dat[i+2]=Math.max(0,Math.min(255,b*255));}}ctx.putImageData(id,0,0);}
function sgDownload(){if(!sgImg)return;const thresh=parseInt(document.getElementById('sg-th').value),br=parseInt(document.getElementById('sg-br').value),con=parseInt(document.getElementById('sg-con').value);const cv=document.createElement('canvas');cv.width=sgImg.naturalWidth;cv.height=sgImg.naturalHeight;const ctx=cv.getContext('2d');ctx.drawImage(sgImg,0,0);const id=ctx.getImageData(0,0,cv.width,cv.height),dat=id.data;const brf=br/255,conf=(con+100)/100;for(let i=0;i<dat.length;i+=4){let r=dat[i]/255,g=dat[i+1]/255,b=dat[i+2]/255;r+=brf;g+=brf;b+=brf;r=(r-.5)*conf+.5;g=(g-.5)*conf+.5;b=(b-.5)*conf+.5;const lum=(Math.max(0,Math.min(1,r))+Math.max(0,Math.min(1,g))+Math.max(0,Math.min(1,b)))/3;if(lum*255>thresh)dat[i+3]=0;else{dat[i]=Math.max(0,Math.min(255,r*255));dat[i+1]=Math.max(0,Math.min(255,g*255));dat[i+2]=Math.max(0,Math.min(255,b*255));}}ctx.putImageData(id,0,0);const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='signature_transparent.png';a.click();incOp();}

/* ═══════════════════ TOOL 17: EXIF CLEANER (NEW) ════════ */
let exifFile=null,exifBytes=null,exifType=null;
function exifLoad(file){
  exifFile=file;const ext=(file.name||'').split('.').pop().toLowerCase();
  if(['jpg','jpeg','png','webp','gif','bmp'].includes(ext)||file.type.startsWith('image/')){
    exifType='image';const reader=new FileReader();
    reader.onload=e=>{exifBytes=e.target.result;document.getElementById('exif-pname').textContent=file.name;document.getElementById('exif-pmeta').textContent='Image · '+fmtKB(file.size);document.getElementById('exif-pill').classList.add('on');document.getElementById('exif-run').disabled=false;document.getElementById('exif-type-lbl').textContent='Image -- canvas redraw will strip all EXIF, GPS, camera, and thumbnail metadata.';};
    reader.readAsDataURL(file);
  }else if(ext==='pdf'||file.type==='application/pdf'){
    exifType='pdf';const reader=new FileReader();
    reader.onload=async e=>{exifBytes=new Uint8Array(e.target.result);document.getElementById('exif-pname').textContent=file.name;document.getElementById('exif-pmeta').textContent='PDF · '+fmtKB(file.size);document.getElementById('exif-pill').classList.add('on');document.getElementById('exif-run').disabled=false;document.getElementById('exif-type-lbl').textContent='PDF -- all document metadata fields (Author, Creator, Title, dates) will be cleared.';showPDFMeta(exifBytes,'exif-meta');};
    reader.readAsArrayBuffer(file);
  }else alert('Supported: JPEG, PNG, WebP, GIF, PDF');
}
async function exifRun(){
  if(!exifFile||!exifBytes)return;document.getElementById('exif-run').disabled=true;document.getElementById('exif-log').innerHTML='';document.getElementById('exif-proc').style.display='block';
  addLog('exif-log','Stripping metadata…','st');
  try{
    if(exifType==='image'){
      const img=new Image();await new Promise(res=>{img.onload=res;img.src=exifBytes;});
      const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight;cv.getContext('2d').drawImage(img,0,0);
      const fmt=document.getElementById('exif-img-fmt')?document.getElementById('exif-img-fmt').value:'image/jpeg';
      const dataUrl=cv.toDataURL(fmt,fmt==='image/png'?undefined:0.96),ext=fmt.split('/')[1]==='jpeg'?'jpg':fmt.split('/')[1];
      const baseName=exifFile.name.replace(/\.[^.]+$/,'');
      addLog('exif-log','✓ All EXIF/GPS/thumbnail metadata stripped via canvas redraw','ok');
      addLog('exif-log','Output: '+img.naturalWidth+'×'+img.naturalHeight+' px','ok');
      addDLItemImgV2('exif-dlist',baseName+'_clean.'+ext,'Cleaned Image','All metadata removed -- dimensions preserved',dataUrl);
      showDL('exif-dlab','exif-dsect');
    }else{
      const doc=await PDFDocument.load(exifBytes,{ignoreEncryption:true});
      try{doc.setTitle('');}catch(_){}try{doc.setAuthor('');}catch(_){}try{doc.setSubject('');}catch(_){}try{doc.setKeywords([]);}catch(_){}try{doc.setProducer('Student\'s Suite');}catch(_){}try{doc.setCreator('');}catch(_){}try{doc.setCreationDate(new Date(0));}catch(_){}try{doc.setModificationDate(new Date(0));}catch(_){}
      try{const catalog=doc.catalog,mk=PDFLib.PDFName.of('Metadata');if(catalog.get(mk))catalog.delete(mk);}catch(_){}
      const bytes=await doc.save();
      addLog('exif-log','✓ Title, Author, Creator, Producer, Subject, Keywords cleared','ok');
      addLog('exif-log','✓ XMP metadata stream removed','ok');addLog('exif-log','Original: '+fmtKB(exifBytes.length)+' → '+fmtKB(bytes.length),'ok');
      const baseName=exifFile.name.replace(/\.[^.]+$/,'');
      addDLItemV2('exif-dlist',baseName+'_clean.pdf','Cleaned PDF','All metadata fields cleared',bytes);
      setPDFPreview('exif',bytes,doc.getPageCount());showDL('exif-dlab','exif-dsect');
    }
    incOp();
  }catch(e){addLog('exif-log','ERROR: '+e.message,'er');}
  document.getElementById('exif-run').disabled=false;
}

/* ═══════════════════ TOOL 16: CALCULATOR ════════════════ */
const gColors=['#f0a500','#3ecf8e','#5c9cf5','#e05c5c','#b06cf5'];
let gFnCount=0,gLastFns=[],calcExpr='',calcHistory=[],calcIsFS=false;
function gAddFn(){if(gFnCount>=5)return;const c=document.getElementById('g-inputs'),idx=gFnCount;const row=document.createElement('div');row.className='g-row g-fn-row';row.dataset.idx=idx;row.innerHTML='<span class="fn-dot" style="background:'+gColors[idx]+'"></span><span style="font-family:var(--mono);font-size:.78rem;color:var(--muted)">f'+(idx+1)+'(x)=</span><input class="g-inp g-fn-input" placeholder="e.g. sin(x)" value=""/><button class="btn-sm danger" onclick="this.closest(\'.g-fn-row\').remove()">✕</button>';c.appendChild(row);gFnCount++;}
function calcTab(idx,btn){document.querySelectorAll('#tool-calc .tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');[0,1,2].forEach(i=>document.getElementById('cc-t'+i).classList.toggle('active',i===idx));}
function calcFullscreen(){const w=document.getElementById('calc-wrap');calcIsFS=!calcIsFS;w.classList.toggle('fullscreen-calc',calcIsFS);}
function cSafeEval(expr,xVal){if(typeof xVal==='number')expr=expr.replace(/\bx\b/g,'('+xVal+')');expr=expr.replace(/\^/g,'**');const fn={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,atan2:Math.atan2,sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,sqrt:Math.sqrt,cbrt:Math.cbrt,abs:Math.abs,log:Math.log,log10:Math.log10,log2:Math.log2,exp:Math.exp,pow:Math.pow,round:Math.round,floor:Math.floor,ceil:Math.ceil,sign:Math.sign,min:Math.min,max:Math.max,factorial:n=>{if(n<0)return NaN;let r=1;for(let i=2;i<=n;i++)r*=i;return r;}};const ctx=Object.assign({pi:Math.PI,e:Math.E,tau:2*Math.PI,Infinity,NaN},fn);try{return new Function(...Object.keys(ctx),'"use strict";return ('+expr+');')(...Object.values(ctx));}catch(err){throw new Error('Invalid expression: '+err.message);}}
function gPlot(){const inputs=document.querySelectorAll('.g-fn-input'),fns=[...inputs].map(i=>i.value.trim()).filter(Boolean);if(!fns.length){document.getElementById('g-status').textContent='Enter at least one function.';return;}gLastFns=fns;const xMin=parseFloat(document.getElementById('g-xmin').value)||-10,xMax=parseFloat(document.getElementById('g-xmax').value)||10;const cv=document.getElementById('graphCanvas'),ctx=cv.getContext('2d');const W=cv.offsetWidth||500,H=cv.offsetHeight||280;cv.width=W;cv.height=H;const isL=document.body.getAttribute('data-theme')==='light';ctx.fillStyle=isL?'#fff':'#12141a';ctx.fillRect(0,0,W,H);const gc=isL?'#e4e7eb':'#222632',ac=isL?'#52606d':'#5a6180';const xStep=(xMax-xMin)/10;ctx.strokeStyle=gc;ctx.lineWidth=0.5;for(let xi=xMin;xi<=xMax+xStep/2;xi+=xStep){const px=((xi-xMin)/(xMax-xMin))*W;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,H);ctx.stroke();}ctx.strokeStyle=ac;ctx.lineWidth=1.5;const z0=((0-xMin)/(xMax-xMin))*W;if(z0>=0&&z0<=W){ctx.beginPath();ctx.moveTo(z0,0);ctx.lineTo(z0,H);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();ctx.fillStyle=ac;ctx.font='10px monospace';ctx.fillText(xMin.toFixed(1),3,H-3);ctx.fillText(xMax.toFixed(1),W-28,H-3);const pts=W*2;let errs=0;fns.forEach((fn,fi)=>{ctx.strokeStyle=gColors[fi%gColors.length];ctx.lineWidth=2;ctx.beginPath();let started=false;let yMn=Infinity,yMx=-Infinity;for(let s=0;s<=pts;s++){const x=xMin+(s/pts)*(xMax-xMin);try{const y=cSafeEval(fn,x);if(isFinite(y)){yMn=Math.min(yMn,y);yMx=Math.max(yMx,y);}}catch(_){}}if(!isFinite(yMn)||yMn===yMx){yMn=-10;yMx=10;}const yPad=(yMx-yMn)*0.1||1;yMn-=yPad;yMx+=yPad;for(let s=0;s<=pts;s++){const x=xMin+(s/pts)*(xMax-xMin);try{const y=cSafeEval(fn,x);if(!isFinite(y)){started=false;continue;}const px=(s/pts)*W,py=H-((y-yMn)/(yMx-yMn))*H;if(!started){ctx.moveTo(px,py);started=true;}else ctx.lineTo(px,py);}catch(_){errs++;started=false;}}ctx.stroke();});document.getElementById('g-status').textContent=fns.length+' function(s) plotted. x: ['+xMin+', '+xMax+']'+(errs?' · '+errs+' eval errors':'');}
function buildCalcPad(){const grid=document.getElementById('c-grid');grid.innerHTML='';const flat=[['7','8','9','(',')','^'],['4','5','6','*','/','sqrt('],['1','2','3','+','-','log('],['0','.','±','=','C','sin('],['pi','e','%','⌫','factorial(','cos('],['tau','abs(','floor(','ceil(','round(','tan(']];flat.forEach(row=>row.forEach(val=>{const b=document.createElement('button');b.className='cbtn';b.textContent=val;if(['+','-','*','/','^','(',')'].includes(val))b.classList.add('op');if(val==='=')b.classList.add('eq');if(val==='C')b.classList.add('cls');if(val.endsWith('(')||['pi','e','tau','%'].includes(val))b.classList.add('fn');b.onclick=()=>cPress(val);grid.appendChild(b);}));}
function cPress(val){const expr=document.getElementById('c-expr'),res=document.getElementById('c-result');if(val==='C'){calcExpr='';expr.textContent='';res.textContent='0';return;}if(val==='⌫'){calcExpr=calcExpr.slice(0,-1);expr.textContent=calcExpr;return;}if(val==='±'){calcExpr=calcExpr.startsWith('-')?calcExpr.slice(1):'-'+calcExpr;expr.textContent=calcExpr;return;}if(val==='='){try{const r=cSafeEval(calcExpr.replace(/\^/g,'**'));const rv=typeof r==='number'?(Number.isInteger(r)?r:+r.toFixed(10)):r;calcHistory.unshift({expr:calcExpr,result:rv});if(calcHistory.length>100)calcHistory.pop();renderCalcHist();res.textContent=rv;calcExpr=String(rv);expr.textContent=calcExpr;}catch(e){res.textContent='Error';}return;}calcExpr+=val;expr.textContent=calcExpr;try{const r=cSafeEval(calcExpr.replace(/\^/g,'**'));if(typeof r==='number'&&isFinite(r))res.textContent=Number.isInteger(r)?r:+r.toFixed(10);}catch(_){}}
function renderCalcHist(){const box=document.getElementById('c-hist');if(!calcHistory.length){box.innerHTML='<div style="padding:10px;color:var(--muted);font-size:.75rem">No history yet.</div>';return;}box.innerHTML='';calcHistory.slice(0,50).forEach(h=>{const d=document.createElement('div');d.className='hist-item';d.innerHTML='<span class="hist-expr">'+h.expr+'</span><span class="hist-res">= '+h.result+'</span>';d.onclick=()=>{calcExpr=String(h.result);document.getElementById('c-expr').textContent=calcExpr;};box.appendChild(d);});}
function calcClearHist(){calcHistory=[];renderCalcHist();}

/* ═══════════════════ MATRIX CALCULATOR ═════════════════ */
function mxBuildGrid(){mxDrawGrid('mx-grid-a',+document.getElementById('mx-ar').value,+document.getElementById('mx-ac').value,'A');mxDrawGrid('mx-grid-b',+document.getElementById('mx-br').value,+document.getElementById('mx-bc').value,'B');}
function mxDrawGrid(cid,rows,cols,lbl){const c=document.getElementById(cid);if(!c)return;const old={};c.querySelectorAll('input[data-r][data-c]').forEach(i=>{old[i.dataset.r+'_'+i.dataset.c]=i.value;});c.innerHTML='';const t=document.createElement('div');t.style.cssText='display:inline-flex;flex-direction:column;gap:3px';for(let r=0;r<rows;r++){const row=document.createElement('div');row.style.cssText='display:flex;gap:3px';for(let cl=0;cl<cols;cl++){const inp=document.createElement('input');inp.type='number';inp.step='any';inp.dataset.r=r;inp.dataset.c=cl;inp.dataset.mat=lbl;inp.value=old[r+'_'+cl]!==undefined?old[r+'_'+cl]:'0';inp.style.cssText='width:52px;padding:5px 4px;text-align:center;font-family:var(--mono);font-size:.78rem;background:var(--surface);border:1px solid var(--border2);border-radius:5px;color:var(--text);outline:none';inp.addEventListener('focus',function(){this.style.borderColor='var(--gold)';});inp.addEventListener('blur',function(){this.style.borderColor='var(--border2)';});row.appendChild(inp);}t.appendChild(row);}c.appendChild(t);}
function mxFillIdentity(lbl){const rI=lbl==='A'?'mx-ar':'mx-br',cI=lbl==='A'?'mx-ac':'mx-bc';const n=Math.min(+document.getElementById(rI).value,+document.getElementById(cI).value);document.getElementById(rI).value=n;document.getElementById(cI).value=n;mxBuildGrid();document.querySelectorAll('#'+(lbl==='A'?'mx-grid-a':'mx-grid-b')+' input').forEach(inp=>{inp.value=+inp.dataset.r===+inp.dataset.c?'1':'0';});}
function mxFillRandom(lbl){document.querySelectorAll('#'+(lbl==='A'?'mx-grid-a':'mx-grid-b')+' input').forEach(inp=>{inp.value=Math.floor(Math.random()*9)-4||1;});}
function mxClear(lbl){document.querySelectorAll('#'+(lbl==='A'?'mx-grid-a':'mx-grid-b')+' input').forEach(inp=>{inp.value='0';});}
function mxRead(gid){const c=document.getElementById(gid),inputs=c.querySelectorAll('input[data-r][data-c]');const rows=Math.max(...[...inputs].map(i=>+i.dataset.r))+1,cols=Math.max(...[...inputs].map(i=>+i.dataset.c))+1;const M=Array.from({length:rows},()=>Array(cols).fill(0));inputs.forEach(inp=>{M[+inp.dataset.r][+inp.dataset.c]=parseFloat(inp.value)||0;});return M;}
function mxFmt(v){if(!isFinite(v))return'∞';if(Math.abs(v)<1e-10)return'0';if(Number.isInteger(v)||Math.abs(v-Math.round(v))<1e-9)return String(Math.round(v));return String(Math.round(v*10000)/10000);}
function mxDisplay(M,label){let h='<div style="margin-bottom:8px;font-size:.75rem;color:var(--gold);font-family:var(--mono);font-weight:600">'+label+' ('+M.length+'×'+M[0].length+')</div>';h+='<div style="display:inline-flex;flex-direction:column;gap:3px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">';M.forEach(row=>{h+='<div style="display:flex;gap:5px">';row.forEach(v=>{h+='<div style="min-width:64px;padding:4px 6px;background:var(--card);border:1px solid var(--border2);border-radius:4px;font-family:var(--mono);font-size:.76rem;text-align:center;color:var(--text)">'+mxFmt(v)+'</div>';});h+='</div>';});h+='</div>';return h;}
function mxScalar(v,label){return'<div style="margin-bottom:8px;font-size:.75rem;color:var(--gold);font-family:var(--mono);font-weight:600">'+label+'</div><div style="font-family:var(--mono);font-size:1.4rem;color:var(--text);padding:10px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;display:inline-block">'+mxFmt(v)+'</div>';}
function mxError(msg){return'<div style="color:var(--red);font-size:.82rem;font-family:var(--mono);padding:10px 0;white-space:pre-wrap">'+msg+'</div>';}
function mxCopy(M){return M.map(r=>[...r]);}
function mxMul(A,B){const m=A.length,k=A[0].length,n=B[0].length;if(k!==B.length)return null;const C=Array.from({length:m},()=>Array(n).fill(0));for(let i=0;i<m;i++)for(let j=0;j<n;j++)for(let p=0;p<k;p++)C[i][j]+=A[i][p]*B[p][j];return C;}
function mxAdd(A,B,sign){if(A.length!==B.length||A[0].length!==B[0].length)return null;return A.map((row,i)=>row.map((v,j)=>v+sign*B[i][j]));}
function mxTranspose(A){return A[0].map((_,j)=>A.map(row=>row[j]));}
function mxTrace(A){if(A.length!==A[0].length)return NaN;return A.reduce((s,row,i)=>s+row[i],0);}
function mxDet(M){const n=M.length;if(n!==M[0].length)return NaN;if(n===1)return M[0][0];if(n===2)return M[0][0]*M[1][1]-M[0][1]*M[1][0];let det=0;for(let j=0;j<n;j++){const minor=M.slice(1).map(row=>row.filter((_,c)=>c!==j));det+=Math.pow(-1,j)*M[0][j]*mxDet(minor);}return det;}
function mxRREF(M,track){const mat=M.map(r=>r.map(v=>v)),rows=mat.length,cols=mat[0].length,steps=[];let pr=0;for(let col=0;col<cols&&pr<rows;col++){let mx=pr;for(let r=pr+1;r<rows;r++)if(Math.abs(mat[r][col])>Math.abs(mat[mx][col]))mx=r;if(Math.abs(mat[mx][col])<1e-12)continue;if(mx!==pr){[mat[pr],mat[mx]]=[mat[mx],mat[pr]];if(track)steps.push('R'+(pr+1)+' ↔ R'+(mx+1));}const pv=mat[pr][col];if(Math.abs(pv-1)>1e-12){const sc=1/pv;mat[pr]=mat[pr].map(v=>v*sc);if(track)steps.push('R'+(pr+1)+' × '+mxFmt(sc));}for(let r=0;r<rows;r++){if(r===pr||Math.abs(mat[r][col])<1e-12)continue;const f=mat[r][col];mat[r]=mat[r].map((v,c)=>v-f*mat[pr][c]);if(track)steps.push('R'+(r+1)+' − '+mxFmt(f)+'×R'+(pr+1));}pr++;}return{rref:mat,steps};}
function mxRank(M){return mxRREF(M,false).rref.filter(row=>row.some(v=>Math.abs(v)>1e-10)).length;}
function mxInverse(A){const n=A.length;if(n!==A[0].length)return null;if(Math.abs(mxDet(A))<1e-12)return null;const aug=A.map((row,i)=>{const id=Array(n).fill(0);id[i]=1;return[...row,...id];});return mxRREF(aug,false).rref.map(row=>row.slice(n));}
function mxPower(A,n){if(A.length!==A[0].length)return null;if(n===0)return Array.from({length:A.length},(_,i)=>Array.from({length:A.length},(_,j)=>i===j?1:0));let res=mxCopy(A);for(let i=1;i<n;i++){res=mxMul(res,A);if(!res)return null;}return res;}
function mxEigen2x2(A){if(A.length!==2||A[0].length!==2)return null;const tr=mxTrace(A),det=mxDet(A),disc=tr*tr-4*det;const steps=['Characteristic eqn: λ² − '+mxFmt(tr)+'λ + '+mxFmt(det)+' = 0','Discriminant = '+mxFmt(disc)];if(disc<-1e-10){const re=tr/2,im=Math.sqrt(-disc)/2;return{type:'complex',l1:mxFmt(re)+' + '+mxFmt(im)+'i',l2:mxFmt(re)+' − '+mxFmt(im)+'i',steps};}const l1=(tr+Math.sqrt(Math.max(0,disc)))/2,l2=(tr-Math.sqrt(Math.max(0,disc)))/2;steps.push('λ₁ = '+mxFmt(l1));steps.push('λ₂ = '+mxFmt(l2));return{type:'real',l1,l2,steps};}
function mxLU(A){const n=A.length;if(n!==A[0].length)return null;const L=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0)),U=A.map(r=>[...r]),steps=[];for(let k=0;k<n;k++){if(Math.abs(U[k][k])<1e-12)steps.push('Warning: zero pivot at ('+(k+1)+','+(k+1)+')');for(let i=k+1;i<n;i++){if(Math.abs(U[k][k])<1e-12)continue;const f=U[i][k]/U[k][k];L[i][k]=f;for(let j=k;j<n;j++)U[i][j]-=f*U[k][j];steps.push('L['+(i+1)+']['+(k+1)+'] = '+mxFmt(f));}}return{L,U,steps};}
let mxLastSteps=[];
function mxRun(op){
  const ra=document.getElementById('mx-result-area'),sa=document.getElementById('mx-steps-area'),sb=document.getElementById('mx-steps-body');mxLastSteps=[];
  try{const A=mxRead('mx-grid-a');let html='';
    if(op==='det'){if(A.length!==A[0].length){ra.innerHTML=mxError('Determinant requires a square matrix (n×n).');sa.style.display='none';return;}const d=mxDet(A);html=mxScalar(d,'det(A)');mxLastSteps=['Cofactor expansion','Result: '+mxFmt(d),d===0?'→ SINGULAR -- no inverse.':'→ Invertible.'];}
    else if(op==='inv'){if(A.length!==A[0].length){ra.innerHTML=mxError('Inverse requires a square matrix.');sa.style.display='none';return;}const inv=mxInverse(A);if(!inv){ra.innerHTML=mxError('Singular matrix (det=0). Inverse does not exist.');sa.style.display='none';return;}html=mxDisplay(inv,'A⁻¹');mxLastSteps=['Method: RREF on [A|I]','det(A) = '+mxFmt(mxDet(A))];}
    else if(op==='trans'){html=mxDisplay(mxTranspose(A),'Aᵀ');mxLastSteps=['Rows ↔ Columns','Original: '+A.length+'×'+A[0].length+' → Transposed: '+A[0].length+'×'+A.length];}
    else if(op==='trace'){if(A.length!==A[0].length){ra.innerHTML=mxError('Trace requires a square matrix.');sa.style.display='none';return;}const t=mxTrace(A);html=mxScalar(t,'tr(A)');mxLastSteps=['Diagonal: '+A.map((r,i)=>mxFmt(r[i])).join(', '),'Sum = '+mxFmt(t)];}
    else if(op==='rank'){const r=mxRank(A);html=mxScalar(r,'rank(A)');mxLastSteps=['Non-zero rows in RREF = '+r,r===Math.min(A.length,A[0].length)?'→ Full rank':'→ Rank-deficient'];}
    else if(op==='rref'){const{rref,steps}=mxRREF(A,true);html=mxDisplay(rref,'RREF(A)');mxLastSteps=['Row operations:'].concat(steps.length?steps:['Already in RREF.']);}
    else if(op==='scalar'){const k=parseFloat(document.getElementById('mx-scalar').value)||1;html=mxDisplay(A.map(row=>row.map(v=>v*k)),k+'×A');mxLastSteps=['Each element × '+k];}
    else if(op==='power'){const n=Math.max(0,Math.min(20,parseInt(document.getElementById('mx-power-n').value)||2));if(A.length!==A[0].length){ra.innerHTML=mxError('Matrix power requires a square matrix.');sa.style.display='none';return;}const res=mxPower(A,n);if(!res){ra.innerHTML=mxError('Power failed.');sa.style.display='none';return;}html=mxDisplay(res,'A^'+n);mxLastSteps=['A multiplied by itself '+n+' time(s).',n===0?'A^0 = Identity':''];}
    else if(op==='eigen'){if(A.length!==2||A[0].length!==2){ra.innerHTML=mxError('Eigenvalues: 2×2 only.\nFor larger matrices, use matrixcalc.org.');sa.style.display='none';return;}const res=mxEigen2x2(A);const col=res.type==='complex'?'var(--blue)':'var(--green)';html='<div style="font-family:var(--mono);font-size:.82rem;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;line-height:2"><div style="color:var(--gold);font-weight:600;margin-bottom:6px">Eigenvalues ('+(res.type==='complex'?'complex':'real')+')</div>λ₁ = <span style="color:'+col+'">'+res.l1+'</span><br>λ₂ = <span style="color:'+col+'">'+res.l2+'</span></div>';mxLastSteps=res.steps;}
    else if(op==='lu'){if(A.length!==A[0].length){ra.innerHTML=mxError('LU requires a square matrix.');sa.style.display='none';return;}const res=mxLU(A);html='<div style="display:flex;gap:14px;flex-wrap:wrap">'+mxDisplay(res.L,'L (lower triangular)')+mxDisplay(res.U,'U (upper triangular)')+'</div><div style="font-size:.73rem;color:var(--muted);margin-top:8px">Verify: L × U should equal A</div>';mxLastSteps=['Doolittle method'].concat(res.steps);}
    else if(op==='add'||op==='sub'){const B=mxRead('mx-grid-b'),sign=op==='add'?1:-1,res=mxAdd(A,B,sign);if(!res){ra.innerHTML=mxError('A and B must be same dimensions.\nA: '+A.length+'×'+A[0].length+', B: '+B.length+'×'+B[0].length);sa.style.display='none';return;}html=mxDisplay(res,op==='add'?'A + B':'A − B');mxLastSteps=['Element-wise '+(op==='add'?'addition':'subtraction')];}
    else if(op==='mul'){const B=mxRead('mx-grid-b'),res=mxMul(A,B);if(!res){ra.innerHTML=mxError('Columns of A must equal rows of B.\nA: '+A.length+'×'+A[0].length+', B: '+B.length+'×'+B[0].length);sa.style.display='none';return;}html=mxDisplay(res,'A × B');mxLastSteps=['(A×B)[i][j] = Σ A[i][k]×B[k][j]','Output: '+res.length+'×'+res[0].length];}
    else if(op==='atb'){const B=mxRead('mx-grid-b'),At=mxTranspose(A),res=mxMul(At,B);if(!res){ra.innerHTML=mxError('Dimension mismatch. Aᵀ: '+At.length+'×'+At[0].length+', B: '+B.length+'×'+B[0].length);sa.style.display='none';return;}html=mxDisplay(res,'Aᵀ × B');mxLastSteps=['Transposed A then multiplied by B'];}
    else if(op==='abt'){const B=mxRead('mx-grid-b'),Bt=mxTranspose(B),res=mxMul(A,Bt);if(!res){ra.innerHTML=mxError('Dimension mismatch. A: '+A.length+'×'+A[0].length+', Bᵀ: '+Bt.length+'×'+Bt[0].length);sa.style.display='none';return;}html=mxDisplay(res,'A × Bᵀ');mxLastSteps=['Transposed B then multiplied A × Bᵀ'];}
    ra.innerHTML=html;
    if(mxLastSteps.length){sb.textContent=mxLastSteps.filter(Boolean).join('\n');sa.style.display='block';sb.style.display='none';}else sa.style.display='none';
  }catch(e){ra.innerHTML=mxError('Error: '+e.message);document.getElementById('mx-steps-area').style.display='none';}
}
function mxToggleSteps(){const b=document.getElementById('mx-steps-body');b.style.display=b.style.display==='none'?'block':'none';}
(function mxInit(){function t(){if(document.getElementById('mx-grid-a'))mxBuildGrid();else setTimeout(t,200);}t();})();

/* ═══ MERGE DZ ══════════════════════════════════════════ */
(function(){const dz=document.getElementById('mg-dz');if(!dz)return;dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});dz.addEventListener('dragleave',()=>dz.classList.remove('over'));dz.addEventListener('drop',async e=>{e.preventDefault();dz.classList.remove('over');if(e.dataTransfer.files.length)mgHandleFiles(e.dataTransfer.files);});})();

/* ═══ CSS injection ══════════════════════════════════════ */
function injectMetaCSS(){const s=document.createElement('style');s.textContent='.file-meta{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 9px;margin-top:6px;display:none}.meta-row{display:flex;gap:6px;align-items:baseline;padding:2px 0;border-bottom:1px solid var(--border)}.meta-row:last-child{border-bottom:none}.meta-k{font-size:.63rem;color:var(--muted);font-family:var(--mono);min-width:72px;flex-shrink:0}.meta-v{font-size:.72rem;color:var(--text);word-break:break-all}.dl-rename{margin-top:5px!important;width:100%!important;font-size:.7rem!important;padding:4px 7px!important;background:var(--surface)!important;border:1px solid var(--border2)!important;border-radius:4px!important;color:var(--text)!important;font-family:var(--mono)!important;outline:none!important}.dl-rename:focus{border-color:var(--gold)!important}';document.head.appendChild(s);}
/* END */
