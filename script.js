/*  BA II Plus web  •  2024-07-10
 *  • True ON/OFF power
 *  • Memory STO n / RCL n
 *  • 2ND toggle + indicator
 *  • TVM solver (N I/Y PV PMT FV + CPT)
 *  • Math keys: %, √x, x², 1/x, LN, yˣ (power)            */

const displayText  = document.getElementById('display-text');
const indicator2nd = document.getElementById('indicator2nd');
const keys         = document.getElementById('keys');

/* ---------- state ---------- */
let powerOn   = true;
let entry     = '0';
const vars    = { N:null, I:null, PV:null, PMT:null, FV:null };

let firstOp   = null;   // left operand in pending arithmetic
let operator  = null;   // pending operator (+ − × ÷ **)
let secondFlg = false;  // 2ND pressed
let computeFlg= false;  // CPT pressed
let recallFlg = false;  // RCL awaiting a digit
let storeFlg  = false;  // STO awaiting a digit
const mem     = Array(10).fill(0);   // 10 memories 0-9

/* ---------- helpers ---------- */
const fix     = v => Number(v.toFixed(10));
const show2nd = f => indicator2nd.classList.toggle('hidden', !f);
const refresh = () => displayText.textContent = entry.toString().substring(0, 16);
const blank   = () => (displayText.innerHTML = '&nbsp;'); // keeps line height

function powerToggle() {
  powerOn = !powerOn;
  secondFlg = computeFlg = recallFlg = storeFlg = false;
  show2nd(false);
  powerOn ? (entry = '0', refresh()) : blank();
}

function appendDigit(d) {
  entry = (entry === '0' && d !== '.') ? d : entry + d;
  refresh();
}
function clearAll() {
  entry = '0';
  firstOp = operator = null;
  secondFlg = computeFlg = recallFlg = storeFlg = false;
  show2nd(false);
  refresh();
}
const toggleSign = () => (entry = entry.startsWith('-') ? entry.slice(1) : '-' + entry, refresh());
const setVar     = v => (vars[v] = parseFloat(entry), computeFlg = false, entry = '0', refresh());
const recallVar  = v => (entry = (vars[v] ?? 0).toString(), refresh());

/* ---------- TVM solver (unchanged) ---------- */
function computeVar(t) {
  const { N, I, PV, PMT, FV } = vars;
  const pm = PMT ?? 0;
  const need = lst => !lst.some(k => vars[k] == null) || (alert(`Set ${lst}`), false);
  const pct = r => r / 100;

  switch (t) {
    case 'FV':
      if (!need(['N', 'I', 'PV', 'PMT'])) return;
      vars.FV = -(PV * (1 + pct(I)) ** N + pm * (((1 + pct(I)) ** N - 1) / pct(I)));
      entry = fix(vars.FV);
      break;

    case 'PV':
      if (!need(['N', 'I', 'FV', 'PMT'])) return;
      vars.PV = -(FV + pm * (((1 + pct(I)) ** N - 1) / pct(I))) / ((1 + pct(I)) ** N);
      entry = fix(vars.PV);
      break;

    case 'PMT':
      if (!need(['N', 'I', 'PV', 'FV'])) return;
      vars.PMT = -(FV + PV * (1 + pct(I)) ** N) * pct(I) / ((1 + pct(I)) ** N - 1);
      entry = fix(vars.PMT);
      break;

    case 'N':
      if (!need(['I', 'PV', 'FV'])) return;
      const i = pct(I);
      if (pm === 0) {
        const r = -FV / PV;
        if (r <= 0) return alert('Bad PV/FV signs');
        vars.N = Math.log(r) / Math.log(1 + i);
      } else {
        const num = -(FV * i + pm);
        const den = PV * i + pm;
        if (den === 0 || num <= 0) return alert('Bad data for N');
        vars.N = Math.log(num / den) / Math.log(1 + i);
      }
      entry = fix(vars.N);
      break;

    case 'I':
      if (!need(['N', 'PV', 'FV'])) return;
      const f  = r => PV * (1 + r) ** N + pm * (((1 + r) ** N - 1) / r) + FV;
      const fp = r => PV * N * (1 + r) ** (N - 1) +
                      pm * (((1 + r) ** N - 1) / r ** 2 - N * (1 + r) ** (N - 1) / r);
      let r = 0.05;
      for (let k = 0; k < 50; k++) {
        const d = f(r) / fp(r);
        r -= d;
        if (Math.abs(d) < 1e-12) break;
      }
      vars.I = r * 100;
      entry = fix(vars.I);
      break;
  }
  computeFlg = false;
  refresh();
}

/* ---------- arithmetic ---------- */
function op(token) {
  // map our "pow" token to JS exponentiation **
  const js = token === 'pow' ? '**' : token;

  if (operator && firstOp != null) {
    entry = eval(`${firstOp} ${operator} ${parseFloat(entry)}`);
    firstOp = parseFloat(entry);
    refresh();
  } else {
    firstOp = parseFloat(entry);
  }
  operator = js;
  entry = '0';
}
function equal() {
  if (!operator || firstOp == null) return;
  entry = eval(`${firstOp} ${operator} ${parseFloat(entry)}`);
  firstOp = operator = null;
  refresh();
}

/* ---------- keypad delegation ---------- */
keys.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;

  /* ON/OFF always works --------------------------------------- */
  if (b.id === 'onoff') { powerToggle(); return; }
  if (!powerOn) return;                       // ignore everything else when off

  /* 2ND toggle ------------------------------------------------- */
  if (b.id === 'second') { secondFlg = !secondFlg; show2nd(secondFlg); return; }

  /* STO / RCL first strokes ----------------------------------- */
  if (b.id === 'sto') { storeFlg = true; return; }
  if (b.id === 'rcl') { recallFlg = true; return; }

  /* digits (handle STO / RCL mem) ------------------------------ */
  if (b.dataset.num) {
    const d = b.dataset.num | 0;
    if (storeFlg) { mem[d] = parseFloat(entry); storeFlg = false; return; }
    if (recallFlg) { entry = mem[d].toString(); refresh(); recallFlg = false; return; }
    appendDigit(b.dataset.num);
    secondFlg = false; show2nd(false);
    return;
  }

  /* dot -------------------------------------------------------- */
  if (b.id === 'dot') {
    if (!entry.includes('.')) appendDigit('.');
    secondFlg = false; show2nd(false);
    return;
  }

  /* math helpers ---------------------------------------------- */
  if (b.id === 'percent') { entry = (parseFloat(entry) / 100).toString(); refresh(); secondFlg=false;show2nd(false); return; }
  if (b.id === 'sqrt')    { entry = Math.sqrt(parseFloat(entry)).toString(); refresh(); secondFlg=false;show2nd(false); return; }
  if (b.id === 'square')  { const v = parseFloat(entry); entry = (v * v).toString(); refresh(); secondFlg=false;show2nd(false); return; }
  if (b.id === 'recip')   { const v = parseFloat(entry); if (v !== 0) { entry = (1 / v).toString(); refresh(); } secondFlg=false;show2nd(false); return; }

  /* LN --------------------------------------------------------- */
  if (b.id === 'ln') {
    const v = parseFloat(entry);
    if (v <= 0) { alert('LN domain error'); return; }
    entry = Math.log(v).toString();
    refresh(); secondFlg=false; show2nd(false); return;
  }

  /* arithmetic operators (+ − × ÷ ** via pow) ---------------- */
  if (b.dataset.op) {
    op(b.dataset.op);
    secondFlg = false; show2nd(false);
    return;
  }
  if (b.id === 'equals') { equal(); secondFlg=false;show2nd(false); return; }
  if (b.id === 'plusminus') { toggleSign(); secondFlg=false;show2nd(false); return; }
  if (b.id === 'ce') { clearAll(); return; }

  /* CPT -------------------------------------------------------- */
  if (b.id === 'cpt') {
    computeFlg = true;
    entry = 'CPT';
    refresh();
    secondFlg = false; show2nd(false);
    return;
  }

  /* TVM store / compute --------------------------------------- */
  if (b.dataset.set) {
    secondFlg = false; show2nd(false);
    return computeFlg ? computeVar(b.dataset.set) : setVar(b.dataset.set);
  }
});
/* ---------- boot ---------- */
refresh();
