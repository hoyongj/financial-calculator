/**
 *  Simple BA II Plus-style financial calculator (no statistics mode).
 *  Supports: numeric input, basic arithmetic (+ − × ÷), sign toggle,
 *  CLR, variable store/recall (N, I/Y, PV, PMT, FV),
 *  and CPT of PV / FV / PMT / N / I when the other variables are set.
 */

const display = document.getElementById('display');
const keys    = document.getElementById('keys');

// current numeric entry as string
let entry = '0';

// financial variables
const vars = { N: null, I: null, PV: null, PMT: null, FV: null };

// state for arithmetic operations
let firstOperand = null;
let operator     = null;

// CPT mode flag
let computeMode  = false;

/* ----------  UI helpers ---------- */
function updateDisplay(val = entry) {
  display.textContent = val.toString().substring(0, 16);
}

function appendDigit(d) {
  if (entry === '0' && d !== '.') {
    entry = d;
  } else {
    entry += d;
  }
  updateDisplay();
}

function clearAll() {
  entry = '0';
  firstOperand = null;
  operator = null;
  computeMode = false;
  updateDisplay();
}

function toggleSign() {
  if (entry.startsWith('-')) {
    entry = entry.slice(1);
  } else if (entry !== '0') {
    entry = '-' + entry;
  }
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
  const value = vars[v] == null ? 0 : vars[v];
  entry = value.toString();
  updateDisplay();
}

/* ----------  TVM solver ---------- */
function computeVar(target) {
  const { N, I, PV, PMT, FV } = vars;
  const pm  = PMT ?? 0;                 // treat undefined PMT as 0
  const fix = v => Number(v.toFixed(10));

  /**
   *  Helper: guard clause to ensure required inputs exist.
   *  `needs` → array of variable names that must be non-null.
   */
  const require = needs => {
    const missing = needs.find(k => vars[k] == null);
    if (missing) {
      alert(`Set ${needs.join(', ')} first.`);
      computeMode = false;
      return false;
    }
    return true;
  };

  /* ---------- FV ---------- */
  if (target === 'FV') {
    if (!require(['N', 'I', 'PV', 'PMT'])) return;
    const i = I / 100;
    const res = -(PV * (1 + i) ** N + pm * (((1 + i) ** N - 1) / i));
    vars.FV = res; entry = fix(res).toString();
  }

  /* ---------- PV ---------- */
  else if (target === 'PV') {
    if (!require(['N', 'I', 'FV', 'PMT'])) return;
    const i = I / 100;
    const res = -(FV + pm * (((1 + i) ** N - 1) / i)) / ((1 + i) ** N);
    vars.PV = res; entry = fix(res).toString();
  }

  /* ---------- PMT ---------- */
  else if (target === 'PMT') {
    if (!require(['N', 'I', 'PV', 'FV'])) return;
    const i = I / 100;
    const res = -(FV + PV * (1 + i) ** N) * i / ((1 + i) ** N - 1);
    vars.PMT = res; entry = fix(res).toString();
  }

  /* ---------- N ---------- */
  else if (target === 'N') {
    if (!require(['I', 'PV', 'FV'])) return;
    const i = I / 100;

    if (pm === 0) {                 // single-sum
      const ratio = -FV / PV;
      if (ratio <= 0) return alert('Invalid signs for PV and FV.');
      const res = Math.log(ratio) / Math.log(1 + i);
      vars.N = res; entry = fix(res).toString();
    } else {                        // annuity
      const num = -(FV * i + pm);
      const den =  (PV * i + pm);
      if (den === 0 || num <= 0) return alert('Invalid values for N.');
      const res = Math.log(num / den) / Math.log(1 + i);
      vars.N = res; entry = fix(res).toString();
    }
  }

  /* ---------- I (I/Y) ---------- */
  else if (target === 'I') {
    if (!require(['N', 'PV', 'FV'])) return;

    // Newton–Raphson on f(r) = PV(1+r)^N + PMT[(1+r)^N − 1]/r + FV
    const f  = r => PV * (1 + r) ** N + pm * (((1 + r) ** N - 1) / r) + FV;
    const fp = r => PV * N * (1 + r) ** (N - 1) +
                    pm * ((((1 + r) ** N - 1) / (r ** 2)) -
                           (N * (1 + r) ** (N - 1) / r) );

    let r = 0.05;                   // 5 % initial guess
    for (let k = 0; k < 50; k++) {
      const delta = f(r) / fp(r);
      r -= delta;
      if (Math.abs(delta) < 1e-12) break;
    }
    const res = r * 100;
    vars.I = res; entry = fix(res).toString();
  }

  else {
    alert('Unknown compute target.');
    computeMode = false;
    return;
  }

  computeMode = false;
  updateDisplay();
}

/* ----------  Basic arithmetic ---------- */
function handleOperation(op) {
  if (operator && firstOperand != null) {
    const res = eval(`${firstOperand} ${operator} ${parseFloat(entry)}`);
    entry = res.toString();
    updateDisplay();
    firstOperand = res;
  } else {
    firstOperand = parseFloat(entry);
  }
  operator = op;
  entry = '0';
}

function evaluate() {
  if (!operator || firstOperand == null) return;
  const res = eval(`${firstOperand} ${operator} ${parseFloat(entry)}`);
  entry = res.toString();
  updateDisplay();
  firstOperand = null;
  operator = null;
}

/* ----------  Keypad delegation ---------- */
keys.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  if (btn.dataset.num)       return appendDigit(btn.dataset.num);
  if (btn.id === 'dot')      return !entry.includes('.') && appendDigit('.');

  if (btn.dataset.op)        return handleOperation(btn.dataset.op);
  if (btn.id === 'equals')   return evaluate();
  if (btn.id === 'plusminus')return toggleSign();
  if (btn.id === 'clr')      return clearAll();

  if (btn.id === 'cpt') {
    computeMode = true;
    return updateDisplay('CPT');
  }

  if (btn.dataset.set) {
    return computeMode ? computeVar(btn.dataset.set) : setVar(btn.dataset.set);
  }

  if (btn.dataset.rcl) return recallVar(btn.dataset.rcl);
});

/* ----------  Startup ---------- */
updateDisplay();
