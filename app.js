const PROGRAM=[
{name:'LOWER 1',subtitle:'Deadlift & Quadriceps Focus',ex:[
['Conventional Deadlift','Sima Felhúzás','2 × 5–7'],['Hack Squat','Hack Guggolás Gépen','2 × 6–8'],['Leg Extension','Láb Extenzió','2 × 8–10'],['Machine Hip Adduction','Csípő Addukció Gépen','2 × 10–12'],['Standing Calf Raise','Álló Vádli Gépen','2 × 8–10'],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15'],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15']]},
{name:'UPPER 1',subtitle:'Chest & Back Thickness',ex:[
['Bench Press','Fekvenyomás','2 × 6–8'],['Chest-Supported Row','Mellkassal támasztott Evezés','2 × 6–8'],['Straight-Arm Lat Pulldown','Egyeneskaros Lehúzás','2 × 8–10'],['Lateral Raise','Oldalemelés','2 × 10–12'],['Rear Delt Fly','Hátsó Váll Tárogatás','2 × 10–12'],['Scott Bench Preacher Curl','Scott Pados Bicepsz','2 × 8–10'],['Cable Rope Triceps Pushdown','Csigás Kötél Tricepsz','2 × 8–10']]},
{name:'LOWER 2',subtitle:'Quadriceps, Hamstring & Soleus Focus',ex:[
['Smith Machine Bulgarian Split Squat','Smith Bolgár Guggolás','2 × 8–10 / láb'],['Seated Hamstring Curl','Ülő Combhajlítás','2 × 8–10'],['Leg Extension','Láb Extenzió','2 × 10–12'],['Seated Calf Raise','Ülő Vádli Gépen','2 × 10–12'],['Hanging Leg Raise','Függeszkedős Has','2 × 10–12'],['Dumbbell Wrist Curl','Csuklóhajlítás','2 × 12–15'],['Dumbbell Reverse Wrist Curl','Csuklófeszítés','2 × 12–15']]},
{name:'UPPER 2',subtitle:'Shoulders & Lat Width Focus',ex:[
['Smith Machine Overhead Shoulder Press','Smith Vállból Nyomás','2 × 6–8'],['Wide-Grip Lat Pulldown','Széles Lehúzás Csigán','2 × 8–10'],['Chest Fly','Mell Tárogatás / Pec Deck','2 × 8–10'],['High Row Machine','Gépes magas evezés / High Row','2 × 8–10'],['Alternating Dumbbell Biceps Curl','Váltott Karú Bicepsz','2 × 8–10'],['Single-Arm Overhead Cable Triceps Extension','1 Kezes Fejfeletti Tricepsz','2 × 8–10']]}
];

const DBNAME='IRONLOG_DB',STORE='state',KEY='main';
let db=null,timer=null,seconds=150;
let state={version:4,week:1,day:0,exercises:{}};

const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const exId=name=>norm(name);
const occKey=(w,d)=>`${w}-${d}`;
const pos=(w,d)=>w*4+d;
const findExercise=(d,e)=>PROGRAM[d]?.ex[e];
function ensureExercise(id){if(!state.exercises[id])state.exercises[id]={occurrences:{}};return state.exercises[id]}
function currentRecord(w,d,e){const x=findExercise(d,e);if(!x)return null;const id=exId(x[0]);const obj=ensureExercise(id);return obj.occurrences[occKey(w,d)]||null}
function latestBefore(w,d,e){const x=findExercise(d,e);if(!x)return null;const id=exId(x[0]),obj=state.exercises[id];if(!obj)return null;let best=null,bestPos=-1;for(const [k,v] of Object.entries(obj.occurrences||{})){const [ww,dd]=k.split('-').map(Number);const p=pos(ww,dd);if(p<pos(w,d)&&p>bestPos){bestPos=p;best={...v,w:ww,d:dd}}}return best}
function latestAny(eid){const obj=state.exercises[eid];if(!obj)return null;let best=null,bp=-1;for(const [k,v] of Object.entries(obj.occurrences||{})){const [w,d]=k.split('-').map(Number);if(pos(w,d)>bp){bp=pos(w,d);best={...v,w,d}}}return best}
function recordFor(w,d,e){const x=findExercise(d,e);if(!x)return null;return state.exercises[exId(x[0])]?.occurrences?.[occKey(w,d)]||null}
function ensureRecord(w,d,e){const x=findExercise(d,e),id=exId(x[0]),obj=ensureExercise(id),k=occKey(w,d);if(!obj.occurrences[k])obj.occurrences[k]={sets:[{weight:'',reps:'',done:false},{weight:'',reps:'',done:false}],ts:Date.now()};return obj.occurrences[k]}

function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(new Error('no indexeddb'));const r=indexedDB.open(DBNAME,2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>{db=r.result;resolve()};r.onerror=()=>reject(r.error)})}
function readDB(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
function writeDB(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(state,KEY);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
async function save(){try{if(db)await writeDB()}catch(e){}try{localStorage.setItem('ironlog-v4-backup',JSON.stringify(state))}catch(e){}}

function migrate(old){
 if(old&&old.version===4&&old.exercises)return old;
 const fresh={version:4,week:old?.week||1,day:old?.day||0,exercises:{}};
 const logs=old?.logs||{};
 for(const [k,v] of Object.entries(logs)){
   const [w,d,e,s]=k.split('-').map(Number);const x=findExercise(d,e);if(!x)continue;
   // Face Pull from older versions is intentionally not mapped to High Row.
   if(x[0]==='Cable Face Pull')continue;
   const id=exId(x[0]),o=fresh.exercises[id]||(fresh.exercises[id]={occurrences:{}}),ok=occKey(w,d);
   if(!o.occurrences[ok])o.occurrences[ok]={sets:[{weight:'',reps:'',done:false},{weight:'',reps:'',done:false}],ts:v.ts||Date.now()};
   const si=s===1?1:0;o.occurrences[ok].sets[si]={weight:v.weight||'',reps:v.reps||'',done:!!v.done,ts:v.ts||Date.now()};
 }
 return fresh;
}
async function load(){
 let loaded=null;
 try{await openDB();loaded=await readDB()}catch(e){}
 if(!loaded){try{const raw=localStorage.getItem('ironlog-v4-backup')||localStorage.getItem('ironlog-v3-backup')||localStorage.getItem('ironlog-v2')||localStorage.getItem('ironlog-v1');if(raw)loaded=JSON.parse(raw)}catch(e){}}
 if(loaded){state=migrate(loaded);await save()}else{state=migrate(state);await save()}
}

function weekHasData(w){return Object.values(state.exercises).some(x=>Object.keys(x.occurrences||{}).some(k=>Number(k.split('-')[0])===w))}
function renderWeeks(){weekGrid.innerHTML='';for(let w=1;w<=6;w++){const b=document.createElement('button');b.className='week'+(w===state.week?' active':'')+(weekHasData(w)?' done':'');b.textContent=w;b.onclick=()=>{state.week=w;save();render()};weekGrid.appendChild(b)}weekTitle.textContent=`WEEK ${state.week}`}
function renderTabs(){dayTabs.innerHTML='';PROGRAM.forEach((d,i)=>{const b=document.createElement('button');b.className='tab'+(i===state.day?' active':'');b.textContent=d.name;b.onclick=()=>{state.day=i;save();render()};dayTabs.appendChild(b)})}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function renderWorkout(){
 const day=PROGRAM[state.day];let h=`<div class="eyebrow">DAY ${state.day+1} · 2 WORKING SETS / EXERCISE</div><div class="day-name">${day.name}</div><div class="day-meta">${day.subtitle} · Failure / RIR 0–1</div>`;
 day.ex.forEach((x,e)=>{
   const rec=recordFor(state.week,state.day,e),last=latestBefore(state.week,state.day,e),sets=rec?.sets||[{weight:'',reps:'',done:false},{weight:'',reps:'',done:false}];
   h+=`<article class="exercise"><div class="exercise-head"><div><div class="exercise-title">${x[0]}</div><div class="exercise-hu">${x[1]}</div><div class="prescribed">${x[2]}</div></div><div class="eyebrow">#${e+1}</div></div>`;
   if(last){h+=`<div class="history"><div>LEGUTÓBBI ALKALOM · ${last.w}. HÉT · ${PROGRAM[last.d].name}</div><strong>SET 1: ${esc(last.sets?.[0]?.weight)||'—'} kg × ${esc(last.sets?.[0]?.reps)||'—'} · SET 2: ${esc(last.sets?.[1]?.weight)||'—'} kg × ${esc(last.sets?.[1]?.reps)||'—'}</strong></div>`}
   h+='<div class="sets"><div class="set-labels"><span>SET</span><span>KG</span><span>REPS</span><span></span></div>';
   for(let s=0;s<2;s++){const v=sets[s]||{},p=last?.sets?.[s]||{};const weight=v.weight!==''?v.weight:(rec?'' :(p.weight||''));const reps=v.reps!==''?v.reps:(rec?'':(p.reps||''));h+=`<div class="set-row"><div class="set-num">${s+1}</div><input inputmode="decimal" data-type="weight" data-e="${e}" data-s="${s}" value="${esc(weight)}" placeholder="kg"><input inputmode="numeric" data-type="reps" data-e="${e}" data-s="${s}" value="${esc(reps)}" placeholder="reps"><button class="complete ${v.done?'checked':''}" data-done data-e="${e}" data-s="${s}">${v.done?'✓':'○'}</button></div>`}
   h+='</div><div class="last">Pihenő minden lezárt set után: <strong>2:30</strong> · Az adat a gyakorlat saját előzményeibe kerül.</div></article>';
 });
 h+='<div class="note">Az ismétlődő gyakorlatok közös előzményt használnak. Például az alkar Lower 2-ben is a legutóbbi alkaros alkalmat mutatja.</div>';workout.innerHTML=h;bindInputs();
}
function bindInputs(){
 workout.querySelectorAll('input').forEach(inp=>inp.oninput=()=>{const e=+inp.dataset.e,s=+inp.dataset.s,r=ensureRecord(state.week,state.day,e),v=r.sets[s];v[inp.dataset.type]=inp.value;v.ts=Date.now();r.ts=Date.now();save()});
 workout.querySelectorAll('[data-done]').forEach(btn=>btn.onclick=()=>{const e=+btn.dataset.e,s=+btn.dataset.s,r=ensureRecord(state.week,state.day,e),row=btn.closest('.set-row'),ins=row.querySelectorAll('input');r.sets[s].weight=ins[0].value;r.sets[s].reps=ins[1].value;r.sets[s].done=!r.sets[s].done;r.sets[s].ts=Date.now();r.ts=Date.now();save();renderWorkout();if(r.sets[s].done)startTimer(PROGRAM[state.day].ex[e][0])});
}
function renderHistory(){
 let h='<div class="eyebrow">EXERCISE HISTORY</div><div class="day-name">FEJLŐDÉS</div><div class="day-meta">Gyakorlatonként, minden előfordulás időrendben.</div>';
 const seen=new Set();PROGRAM.forEach(day=>day.ex.forEach(x=>seen.add(exId(x[0]))));
 for(const id of seen){const x=PROGRAM.flatMap(d=>d.ex).find(e=>exId(e[0])===id);const obj=state.exercises[id];h+=`<details class="history-group"><summary>${x[0]}</summary><div class="progress-ex"><div class="exercise-hu">${x[1]}</div>`;const rows=Object.entries(obj?.occurrences||{}).sort((a,b)=>{const [aw,ad]=a[0].split('-').map(Number),[bw,bd]=b[0].split('-').map(Number);return pos(aw,ad)-pos(bw,bd)});if(!rows.length)h+='<div class="empty">Még nincs adat.</div>';rows.forEach(([k,r])=>{const [w,d]=k.split('-').map(Number);h+=`<div class="progress-row"><b>W${w} ${PROGRAM[d].name.replace('UPPER ','U').replace('LOWER ','L')}</b><span>S1: ${esc(r.sets?.[0]?.weight)||'—'} kg × ${esc(r.sets?.[0]?.reps)||'—'}</span><span>S2: ${esc(r.sets?.[1]?.weight)||'—'} kg × ${esc(r.sets?.[1]?.reps)||'—'}</span></div>`});h+='</div></details>'}
 h+='<div class="history-actions"><button id="exportBtn" class="secondary">MENTÉS FÁJLBA</button><label class="secondary import-label">BETÖLTÉS FÁJLBÓL<input id="importInput" type="file" accept=".json,application/json" hidden></label></div><div class="note">Régi v1/v2/v3 mentés importálható. A régi Face Pull adatot nem keverjük össze az új High Row-val.</div>';workout.innerHTML=h;exportBtn.onclick=exportData;importInput.onchange=e=>importData(e.target.files[0]);
}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ironlog-backup.json';a.click();URL.revokeObjectURL(url);toast('Biztonsági mentés elkészült.')}
function importData(file){if(!file)return;const r=new FileReader();r.onload=async()=>{try{const x=JSON.parse(r.result);if(!x.logs&&!x.exercises)throw 0;state=migrate(x);await save();render();toast('Adatok sikeresen importálva.')}catch(e){toast('Érvénytelen mentési fájl.')}};r.readAsText(file)}
function addHistoryButton(){let b=document.getElementById('historyBtn');if(!b){b=document.createElement('button');b.id='historyBtn';b.className='ghost';b.textContent='📈 FEJLŐDÉS';dayTabs.after(b)}b.onclick=()=>{renderHistory();b.textContent='← EDZÉS';b.onclick=()=>{render();}}}
function startTimer(ex){seconds=150;timerExercise.textContent=`${ex} · következő set`;timerOverlay.classList.remove('hidden');updateTimer();clearInterval(timer);timer=setInterval(()=>{seconds--;updateTimer();if(seconds<=0){clearInterval(timer);navigator.vibrate?.([300,150,300]);toast('Pihenő vége — mehet a következő set!');timerOverlay.classList.add('hidden')}},1000)}
function updateTimer(){timerValue.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
skipTimer.onclick=()=>{clearInterval(timer);timerOverlay.classList.add('hidden')};add30.onclick=()=>{seconds+=30;updateTimer()};
function toast(t){const x=document.getElementById('toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2200)}
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installBtn.classList.remove('hidden')});installBtn.onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.classList.add('hidden')}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
(async()=>{await load();render();addHistoryButton()})();
