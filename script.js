/*  BA II Plus web – v2024-07-10
 *  Adds: true ON/OFF power, memory (STO n / RCL n),
 *        yellow only on 2ND, white TVM keys, LN label fix  */
const displayText  = document.getElementById('display-text');
const indicator2nd = document.getElementById('indicator2nd');
const keys         = document.getElementById('keys');

/* ---------- calculator state ---------- */
let powerOn   = true;
let entry     = '0';
const vars    = { N:null,I:null,PV:null,PMT:null,FV:null };
let firstOp   = null, operator = null;
let secondFlg = false, computeFlg = false;
let recallFlg = false, storeFlg  = false;
const mem     = Array(10).fill(0);   // 10 memories 0-9

/* ---------- helpers ---------- */
const fix = v => Number(v.toFixed(10));
const show2nd = f => indicator2nd.classList.toggle('hidden',!f);
const refresh = () => displayText.textContent = entry.toString().substring(0,16);
const blank    = () => (displayText.innerHTML = '&nbsp;');   // 👈 keeps line box

function powerToggle(){
  powerOn = !powerOn;
  secondFlg = computeFlg = recallFlg = storeFlg = false;
  show2nd(false);
  if(powerOn){ entry='0'; refresh(); }
  else       { blank();  }
}

function appendDigit(d){
  entry = (entry==='0' && d!=='.') ? d : entry + d;
  refresh();
}
function clearAll(){
  entry='0';firstOp=operator=null;
  secondFlg=computeFlg=recallFlg=storeFlg=false;show2nd(false);refresh();
}
function toggleSign(){ entry=entry.startsWith('-')?entry.slice(1):('-'+entry); refresh(); }
function setVar(v){ vars[v]=parseFloat(entry); computeFlg=false; entry='0'; refresh(); }
function recallVar(v){ entry=(vars[v]??0).toString(); refresh(); }

/* ---------- TVM solver (unchanged core) ---------- */
function computeVar(t){
  const {N,I,PV,PMT,FV} = vars, pm=PMT??0, need=l=>!l.some(k=>vars[k]==null)||alert(`Set ${l}`)&&false;
  const pct=r=>r/100;
  switch(t){
    case'FV':if(!need(['N','I','PV','PMT']))return;
      vars.FV=-(PV*(1+pct(I))**N+pm*(((1+pct(I))**N-1)/pct(I)));entry=fix(vars.FV).toString();break;
    case'PV':if(!need(['N','I','FV','PMT']))return;
      vars.PV=-(FV+pm*(((1+pct(I))**N-1)/pct(I)))/((1+pct(I))**N);entry=fix(vars.PV).toString();break;
    case'PMT':if(!need(['N','I','PV','FV']))return;
      vars.PMT=-(FV+PV*(1+pct(I))**N)*pct(I)/((1+pct(I))**N-1);entry=fix(vars.PMT).toString();break;
    case'N':if(!need(['I','PV','FV']))return;
      const i=pct(I);
      if(pm===0){const r=-FV/PV;if(r<=0)return alert('Bad PV/FV');vars.N=Math.log(r)/Math.log(1+i);}
      else{const num=-(FV*i+pm),den=PV*i+pm;if(den===0||num<=0)return alert('Bad N');
        vars.N=Math.log(num/den)/Math.log(1+i);}
      entry=fix(vars.N).toString();break;
    case'I':if(!need(['N','PV','FV']))return;
      const f=r=>PV*(1+r)**N+pm*(((1+r)**N-1)/r)+FV,
            fp=r=>PV*N*(1+r)**(N-1)+pm*(((1+r)**N-1)/r**2-N*(1+r)**(N-1)/r);
      let r=0.05;for(let k=0;k<50;k++){const d=f(r)/fp(r);r-=d;if(Math.abs(d)<1e-12)break;}
      vars.I=r*100;entry=fix(vars.I).toString();break;
  }
  computeFlg=false;refresh();
}

/* ---------- arithmetic ---------- */
function op(opr){ if(operator&&firstOp!=null){entry=eval(`${firstOp}${operator}${parseFloat(entry)}`);firstOp=parseFloat(entry);refresh();}
  else firstOp=parseFloat(entry); operator=opr; entry='0';}
function equal(){ if(!operator||firstOp==null)return;
  entry=eval(`${firstOp}${operator}${parseFloat(entry)}`); firstOp=operator=null; refresh();}

/* ---------- keypad handler ---------- */
keys.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;

  /* always let ON/OFF work */
  if(b.id==='onoff'){ powerToggle(); return; }
  if(!powerOn) return;                        // ignore all else if off

  /* 2ND toggle */
  if(b.id==='second'){ secondFlg=!secondFlg; show2nd(secondFlg); return; }

  /* STO / RCL workflow */
  if(b.id==='sto'){ storeFlg=true; return; }
  if(b.id==='rcl'){ recallFlg=true; return; }

  /* numeric key possibly for STO/RCL memory */
  if(b.dataset.num){
    const d=b.dataset.num|0;
    if(storeFlg){ mem[d]=parseFloat(entry); storeFlg=false; return; }
    if(recallFlg){ entry=mem[d].toString(); refresh(); recallFlg=false; return; }
    appendDigit(b.dataset.num); secondFlg=false; show2nd(false); return;
  }

  /* dot */
  if(b.id==='dot'){ if(!entry.includes('.')) appendDigit('.'); secondFlg=false; show2nd(false); return; }

  /* percent / √x / x² / 1/x */
  if(b.id==='percent'){ entry=(parseFloat(entry)/100).toString(); refresh(); secondFlg=false;show2nd(false);return;}
  if(b.id==='sqrt'   ){ entry=Math.sqrt(parseFloat(entry)).toString(); refresh(); secondFlg=false;show2nd(false);return;}
  if(b.id==='square' ){ const v=parseFloat(entry); entry=(v*v).toString(); refresh(); secondFlg=false;show2nd(false);return;}
  if(b.id==='recip'  ){ const v=parseFloat(entry); if(v!==0){entry=(1/v).toString();refresh();} secondFlg=false;show2nd(false);return;}


  /* >>> NEW LN handler <<< */
  if(b.id==='ln'){
    const v=parseFloat(entry);
    if(v<=0) { alert('LN domain error'); return; }
    entry=Math.log(v).toString();    // natural log
    refresh(); secondFlg=false; show2nd(false); return;
  }

  /* arithmetic & misc */
  if(b.dataset.op ){ op(b.dataset.op); secondFlg=false;show2nd(false);return;}
  if(b.id==='equals'){ equal(); secondFlg=false;show2nd(false);return;}
  if(b.id==='plusminus'){ toggleSign(); secondFlg=false;show2nd(false);return;}
  if(b.id==='ce'){ clearAll(); return; }

  /* CPT */
  if(b.id==='cpt'){ computeFlg=true; entry='CPT'; refresh(); secondFlg=false;show2nd(false); return;}

  /* TVM keys */
  if(b.dataset.set){
    secondFlg=false;show2nd(false);
    return computeFlg ? computeVar(b.dataset.set) : setVar(b.dataset.set);
  }
});
/* ---------- boot ---------- */
refresh();
