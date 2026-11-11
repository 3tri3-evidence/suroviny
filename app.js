const DB_NAME = "evidence-surovin-db";
const DB_VERSION = 1;
let db;
let jobs = [];
let activeJobId = "";

const $ = id => document.getElementById(id);
const today = new Date();
$("newJobDate").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains("jobs")) d.createObjectStore("jobs",{keyPath:"id"});
      if(!d.objectStoreNames.contains("photos")) {
        const s=d.createObjectStore("photos",{keyPath:"id"});
        s.createIndex("jobId","jobId",{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function request(store,mode,action){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode), req=action(tx.objectStore(store));
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
const allJobs=()=>request("jobs","readonly",s=>s.getAll());
const allPhotosFor=id=>request("photos","readonly",s=>s.index("jobId").getAll(id));
const saveJob=job=>request("jobs","readwrite",s=>s.put(job));
const savePhoto=photo=>request("photos","readwrite",s=>s.put(photo));

function safeName(s){return s.replace(/[\\/:*?"<>|]/g,"-").replace(/\s+/g," ").trim();}
function displayDate(s){const [y,m,d]=s.split("-");return `${d}.${m}.${y}`;}

async function refreshJobs(preferred){
  jobs=(await allJobs()).sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name));
  const select=$("jobSelect");
  select.innerHTML="";
  if(!jobs.length){
    select.add(new Option("Nejdříve vytvoř zakázku",""));
    activeJobId="";
  } else {
    for(const j of jobs) select.add(new Option(`${j.name} · ${displayDate(j.date)}`,j.id));
    activeJobId=(preferred&&jobs.some(j=>j.id===preferred))?preferred:(jobs.some(j=>j.id===activeJobId)?activeJobId:jobs[0].id);
    select.value=activeJobId;
  }
  await refreshPhotos();
}
async function refreshPhotos(){
  const grid=$("photoGrid"); grid.innerHTML="";
  const photos=activeJobId?await allPhotosFor(activeJobId):[];
  $("photoCount").textContent=`${photos.length} fotografií`;
  $("emptyPhotos").classList.toggle("hidden",photos.length>0);
  for(const p of photos.sort((a,b)=>a.createdAt-b.createdAt)){
    const card=document.createElement("div"); card.className="photo";
    const img=document.createElement("img"); img.src=URL.createObjectURL(p.blob); img.alt=p.name;
    const cap=document.createElement("div"); cap.textContent=p.name;
    card.append(img,cap); grid.append(card);
  }
}
$("jobSelect").addEventListener("change",async e=>{activeJobId=e.target.value;await refreshPhotos();});
$("createJob").addEventListener("click",async()=>{
  const name=safeName($("newJobName").value);
  const date=$("newJobDate").value;
  if(!name||!date){alert("Vyplň název zakázky a datum.");return;}
  const id=crypto.randomUUID();
  await saveJob({id,name,date,createdAt:Date.now()});
  $("newJobName").value="";
  await refreshJobs(id);
});
$("takePhoto").addEventListener("click",()=>{
  if(!activeJobId){alert("Nejdříve vytvoř nebo vyber zakázku.");return;}
  $("cameraInput").click();
});
$("cameraInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0]; if(!file)return;
  const existing=await allPhotosFor(activeJobId);
  const number=existing.length+1;
  const photo={id:crypto.randomUUID(),jobId:activeJobId,name:`${String(number).padStart(3,"0")}.jpg`,blob:file,createdAt:Date.now()};
  await savePhoto(photo);
  e.target.value="";
  await refreshPhotos();
});
$("deleteJob").addEventListener("click",async()=>{
  if(!activeJobId)return;
  const job=jobs.find(j=>j.id===activeJobId);
  if(!confirm(`Opravdu smazat zakázku „${job.name}“ a všechny její fotografie?`))return;
  const photos=await allPhotosFor(activeJobId);
  const tx=db.transaction(["jobs","photos"],"readwrite");
  tx.objectStore("jobs").delete(activeJobId);
  photos.forEach(p=>tx.objectStore("photos").delete(p.id));
  tx.oncomplete=()=>refreshJobs();
});
$("exportJob").addEventListener("click",async()=>{
  if(!activeJobId){alert("Vyber zakázku.");return;}
  const job=jobs.find(j=>j.id===activeJobId);
  const photos=await allPhotosFor(activeJobId);
  if(!photos.length){alert("Tato zakázka zatím nemá žádné fotografie.");return;}
  const folder=`${job.date} ${safeName(job.name)}`;
  const entries=photos.sort((a,b)=>a.createdAt-b.createdAt).map(p=>({name:`${folder}/${p.name}`,data:p.blob}));
  const zip=await makeZip(entries);
  const file=new File([zip],`${folder}.zip`,{type:"application/zip"});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:`Export: ${job.name}`});}
    catch(err){if(err.name!=="AbortError") downloadBlob(zip,file.name);}
  } else downloadBlob(zip,file.name);
});

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

// Minimal ZIP writer (STORE method; no external libraries required).
const crcTable=(()=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u16(n){return [n&255,(n>>>8)&255];}
function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];}
async function makeZip(entries){
  const chunks=[],central=[];let offset=0;
  for(const entry of entries){
    const name=new TextEncoder().encode(entry.name), data=new Uint8Array(await entry.data.arrayBuffer());
    const crc=crc32(data),local=[0x50,0x4b,0x03,0x04,...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name];
    chunks.push(new Uint8Array(local),data);
    const cent=[0x50,0x4b,0x01,0x02,...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name];
    central.push(new Uint8Array(cent));offset+=local.length+data.length;
  }
  const centralSize=central.reduce((s,a)=>s+a.length,0),count=entries.length;
  const end=new Uint8Array([0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(count),...u16(count),...u32(centralSize),...u32(offset),...u16(0)]);
  return new Blob([...chunks,...central,end],{type:"application/zip"});
}

(async()=>{
  if("serviceWorker" in navigator && location.protocol!=="file:"){
    try{await navigator.serviceWorker.register("./sw.js");}catch(e){console.warn("Offline cache registration failed",e);}
  }
  db=await openDB();
  await refreshJobs();
})().catch(e=>{console.error(e);alert("Aplikaci se nepodařilo spustit. Zkus obnovit stránku.");});
