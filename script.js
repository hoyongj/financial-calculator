/**
 * BA II Plus financial calculator (no statistics mode)
 * Now with:
 *   • 2ND key back in grid + tiny indicator on display
 *   • Digits / . / ± in lighter grey
 *   • RCL-then-TVM key recall
 */

const displayText = document.getElementById('display-text');
const indicator2nd = document.getElementById('indicator2nd');
const keys = document.getElementById('keys');

/* ---------- state ---------- */
let entry = '0';
const vars = { N:null, I:null, PV:null, PMT:null, FV:null };
let firstOperand = null, operator = null;
let computeMode = false;
let secondMode  = false;
let recallMode  = false;

/* ---------- helpers ---------- */
const fix = v => Number(v.toFixed(10));

function updateDisplay(val = entry) {
  displayText.textContent = val.toString().substring(0, 16);
}

function show2nd(flag) {
  indicator2nd.classList.toggle('hidden', !flag);
}

function appendDigit(d) {
  entry = (entry === '0' && d !== '.') ? d : entry + d;
  updateDisplay();
}

function clearAll() {
  entry = '0';
  firstOperand = operator = null;
  computeMode = secondMode = recallMode = false;
  show2nd(false);
  updateDisplay();
}

function toggleSign() {
  entry = entry.startsWith('-') ? entry.slice(1) : (entry !== '0' ? '-' + entry : entry);
  updateDisplay();
}

function setVar(v) {
  vars[v] = parseFloat(entry);
  entry = '0';
  computeMode = false;
  updateDisplay(`${v}=${vars[v]}`);
  setTimeout(updateDisplay, 800);
}

function recallVar(v) {
  entry = (vars[v] ?? 0).toString();
  updateDisplay();
}

/* ---------- TVM solver (unchanged from previous reply) ---------- */
function computeVar(target) {
  const { N,I,PV,PMT,FV } = vars;
  const pm = PMT ?? 0;
  const need = ns => !ns.some(k => vars[k]==null) ||
                     (alert(`Set ${ns.join(', ')} first.`), computeMode=false);

  switch (target) {
    case 'FV':
      if (!need(['N','I','PV','PMT'])) return;
      vars.FV = -(PV*(1+I/100)**N + pm*(((1+I/100)**N - 1)/(I/100)));
      entry = fix(vars.FV).toString();
      break;
    case 'PV':
      if (!need(['N','I','FV','PMT'])) return;
      vars.PV = -(FV + pm*(((1+I/100)**N - 1)/(I/100)))/((1+I/100)**N);
      entry = fix(vars.PV).toString();
      break;
    case 'PMT':
      if (!need(['N','I','PV','FV'])) return;
      vars.PMT = -(FV + PV*(1+I/100)**N)*(I/100)/((1+I/100)**N - 1);
      entry = fix(vars.PMT).toString();
      break;
    case 'N':
      if (!need(['I','PV','FV'])) return;
      const i = I/100;
      if (pm === 0) {
        const ratio = -FV/PV;
        if (ratio <= 0) return alert('Invalid signs for PV and FV.');
        vars.N = Math.log(ratio)/Math.log(1+i);
      } else {
        const num = -(FV*i + pm), den = PV*i + pm;
        if (den===0||num<=0) return alert('Invalid values for N.');
        vars.N = Math.log(num/den)/Math.log(1+i);
      }
      entry = fix(vars.N).toString();
      break;
    case 'I':
      if (!need(['N','PV','FV'])) return;
      const f  = r => PV*(1+r)**N + pm*(((1+r)**N - 1)/r) + FV;
      const fp = r => PV*N*(1+r)**(N-1) +
                      pm*(((1+r)**N - 1)/r**2 - N*(1+r)**(N-1)/r);
      let r = 0.05;
      for (let k=0;k<50;k++){ const d=f(r)/fp(r); r-=d; if(Math.abs(d)<1e-12)break;}
      vars.I = r*100; entry = fix(vars.I).toString();
      break;
    default: return alert('Unknown compute target.');
  }
  computeMode=false; updateDisplay();
}

/* ---------- arithmetic ---------- */
function handleOperation(op) {
  if (operator && firstOperand!=null) {
    entry = eval(`${firstOperand} ${operator} ${parseFloat(entry)}`).toString();
    firstOperand = parseFloat(entry);
    updateDisplay();
  } else firstOperand = parseFloat(entry);
  operator = op; entry='0';
}

function evaluate() {
  if (!operator||firstOperand==null) return;
  entry = eval(`${firstOperand} ${operator} ${parseFloat(entry)}`).toString();
  firstOperand = operator = null;
  updateDisplay();
}

/* ---------- keypad delegation ---------- */
keys.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  /* 2ND toggle -------------------------------------------------- */
  if (btn.id === 'second') {
    secondMode = !secondMode;
    show2nd(secondMode);
    return;
  }

  /* RCL two-step workflow -------------------------------------- */
  if (btn.id === 'rcl') { recallMode = true; return; }
  if (recallMode) {
    recallMode = false;
    if (btn.dataset.set) recallVar(btn.dataset.set);
    return;
  }

  /* numeric ----------------------------------------------------- */
  if (btn.dataset.num) return (secondMode=false,show2nd(false), appendDigit(btn.dataset.num));
  if (btn.id==='dot')   { if(!entry.includes('.')) appendDigit('.'); secondMode=false; show2nd(false); return;}

  /* math helpers (no 2ND funcs yet) ----------------------------- */
  if (btn.id==='percent'){ entry=(parseFloat(entry)/100).toString(); updateDisplay(); secondMode=false; show2nd(false); return;}
  if (btn.id==='sqrt')   { entry=Math.sqrt(parseFloat(entry)).toString(); updateDisplay(); secondMode=false; show2nd(false); return;}
  if (btn.id==='square') { const v=parseFloat(entry); entry=(v*v).toString(); updateDisplay(); secondMode=false; show2nd(false); return;}
  if (btn.id==='recip')  { const v=parseFloat(entry); if(v!==0){entry=(1/v).toString(); updateDisplay();} secondMode=false; show2nd(false); return;}

  /* arithmetic / sign / clear ---------------------------------- */
  if (btn.dataset.op)   { handleOperation(btn.dataset.op); secondMode=false; show2nd(false); return;}
  if (btn.id==='equals'){ evaluate(); secondMode=false; show2nd(false); return;}
  if (btn.id==='plusminus'){ toggleSign(); secondMode=false; show2nd(false); return;}
  if (btn.id==='ce'||btn.id==='onoff'){ clearAll(); return;}

  /* CPT --------------------------------------------------------- */
  if (btn.id==='cpt') { computeMode=true; updateDisplay('CPT'); secondMode=false; show2nd(false); return;}

  /* TVM store / compute ---------------------------------------- */
  if (btn.dataset.set) {
    secondMode=false; show2nd(false);
    return computeMode ? computeVar(btn.dataset.set) : setVar(btn.dataset.set);
  }
});

/* ---------- start ---------- */
updateDisplay();
