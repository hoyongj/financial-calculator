/**
 * BA II Plus-style financial calculator (no statistics mode).
 * Adds:  √x, x², 1/x, %, and a sticky “2ND” indicator.
 */

const display = document.getElementById('display');
const keys    = document.getElementById('keys');

/* ---------- state ---------- */
let entry       = '0';                                // current entry
const vars      = { N:null, I:null, PV:null, PMT:null, FV:null };
let firstOperand = null;
let operator     = null;
let computeMode  = false;                             // CPT pressed
let secondMode   = false;                             // 2ND pressed

/* ---------- helpers ---------- */
const fix = v => Number(v.toFixed(10));               // trim float noise

function updateDisplay(val = entry) {
  display.textContent = val.toString().substring(0, 16);
}

function appendDigit(d) {
  entry = (entry === '0' && d !== '.') ? d : entry + d;
  updateDisplay();
}

function clearAll() {
  entry = '0';
  firstOperand = operator = null;
  computeMode = secondMode = false;
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

/* ---------- TVM solver (unchanged) ---------- */
function computeVar(target) {
  const { N, I, PV, PMT, FV } = vars;
  const pm = PMT ?? 0;
  const need = ns => !ns.some(k => vars[k] == null) ||
                    (alert(`Set ${ns.join(', ')} first.`), computeMode=false);

  switch (target) {
    case 'FV':
      if (!need(['N','I','PV','PMT'])) return;
      vars.FV = -(PV*(1+I/100)**N + pm*(((1+I/100)**N - 1)/(I/100)));
      entry = fix(vars.FV).toString();
      break;

    case 'PV':
      if (!need(['N','I','FV','PMT'])) return;
      vars.PV = -(FV + pm*(((1+I/100)**N - 1)/(I/100))) / ((1+I/100)**N);
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
        if (den === 0 || num <= 0) return alert('Invalid values for N.');
        vars.N = Math.log(num/den)/Math.log(1+i);
      }
      entry = fix(vars.N).toString(); break;

    case 'I':
      if (!need(['N','PV','FV'])) return;
      const f  = r => PV*(1+r)**N + pm*(((1+r)**N - 1)/r) + FV;
      const fp = r => PV*N*(1+r)**(N-1) +
                      pm*(((1+r)**N - 1)/r**2 - N*(1+r)**(N-1)/r);
      let r = 0.05;
      for (let k = 0; k < 50; k++) { const d = f(r)/fp(r); r -= d; if (Math.abs(d)<1e-12) break; }
      vars.I = r*100; entry = fix(vars.I).toString(); break;

    default: return alert('Unknown compute target.');
  }
  computeMode = false; updateDisplay();
}

/* ---------- arithmetic helpers ---------- */
function handleOperation(op) {
  if (operator && firstOperand != null) {
    entry = eval(`${firstOperand} ${operator} ${parseFloat(entry)}`).toString();
    firstOperand = parseFloat(entry);
    updateDisplay();
  } else {
    firstOperand = parseFloat(entry);
  }
  operator = op; entry = '0';
}

function evaluate() {
  if (!operator || firstOperand == null) return;
  entry = eval(`${firstOperand} ${operator} ${parseFloat(entry)}`).toString();
  firstOperand = operator = null; updateDisplay();
}

/* ---------- keypad delegation ---------- */
keys.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  /* ---- 2ND key ------------------------------------------------- */
  if (btn.id === 'second') {
    secondMode = true;
    return updateDisplay('2ND');
  }

  /* ---- any other key after 2ND -------------------------------- */
  if (secondMode) {
    secondMode = false;
    updateDisplay();  // restore the number;  real “second-functions” can go here later
  }

  /* ---- numeric & decimal -------------------------------------- */
  if (btn.dataset.num) return appendDigit(btn.dataset.num);
  if (btn.id === 'dot')  { if (!entry.includes('.')) appendDigit('.'); return; }

  /* ---- quick math helpers ------------------------------------- */
  if (btn.id === 'percent') { entry = (parseFloat(entry)/100).toString(); return updateDisplay(); }
  if (btn.id === 'sqrt')    { entry = Math.sqrt(parseFloat(entry)).toString(); return updateDisplay(); }
  if (btn.id === 'square')  { const v=parseFloat(entry); entry=(v*v).toString(); return updateDisplay(); }
  if (btn.id === 'recip')   { const v=parseFloat(entry); if (v!==0){ entry=(1/v).toString(); updateDisplay(); } return; }

  /* ---- arithmetic & sign -------------------------------------- */
  if (btn.dataset.op)   return handleOperation(btn.dataset.op);
  if (btn.id === 'equals')    return evaluate();
  if (btn.id === 'plusminus') return toggleSign();

  /* ---- clears & power ----------------------------------------- */
  if (btn.id === 'ce' || btn.id === 'onoff') return clearAll();

  /* ---- CPT ----------------------------------------------------- */
  if (btn.id === 'cpt')  { computeMode = true; return updateDisplay('CPT'); }

  /* ---- TVM store / recall ------------------------------------- */
  if (btn.dataset.set)  { return computeMode ? computeVar(btn.dataset.set) : setVar(btn.dataset.set); }
  if (btn.dataset.rcl)  { return recallVar(btn.dataset.rcl); }

  /* ---- everything else (arrows, INV, etc.) is placeholder ---- */
});

/* ---------- startup ---------- */
updateDisplay();
