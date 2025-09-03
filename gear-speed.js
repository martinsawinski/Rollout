// Speed & Rollout mini-app — persist all fields (pinion/spur/tire/internal & checkbox)
const $ = (id) => document.getElementById(id);
const round = (n, p = 3) => Number.isFinite(n) ? Number(n.toFixed(p)) : 0;

const spurPinionRatio = (spur, pinion) => spur / pinion;
const finalDriveRatio = (spur, pinion, internal) => spurPinionRatio(spur, pinion) * internal;
const rolloutMMPerMotorRev = (tireMM, fdr) => (!tireMM || !fdr) ? 0 : (Math.PI * tireMM) / fdr;

// ---------- persistence ----------
const KEYS = {
  internalRatio   : 'fuelcalc.speedrollout.internalRatio',
  noTransmission  : 'fuelcalc.speedrollout.noTransmission',
  curPinion       : 'fuelcalc.speedrollout.curPinion',
  curSpur         : 'fuelcalc.speedrollout.curSpur',
  curTire         : 'fuelcalc.speedrollout.curTire',
  newPinion       : 'fuelcalc.speedrollout.newPinion',
  newSpur         : 'fuelcalc.speedrollout.newSpur',
  newTire         : 'fuelcalc.speedrollout.newTire'
};

function safeSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
function safeGet(key)       { try { return localStorage.getItem(key); } catch (_) { return null; } }

function persistInput(id, key) {
  const el = $(id);
  if (!el) return;
  const v = el.value;
  if (id === 'g_internal' && $('g_no_transmission').checked) return;
  if (v !== '' && v != null) safeSet(key, v);
}

function restoreInput(id, key) {
  const el = $(id);
  if (!el) return;
  const v = safeGet(key);
  if (v !== null && v !== '') el.value = v;
}

/* ==== Theme ==== */
(function themeInit(){
  const toggle = document.getElementById('darkModeToggle');
  if (!toggle) return;
  const PREF_KEYS = ['fuelcalc.theme','darkMode','theme'];
  const getSaved = () => { for (const k of PREF_KEYS){ const v=localStorage.getItem(k); if(v) return v; } return null; };
  const apply = m => { const d = m==='dark'; document.body.classList.toggle('dark-mode',d); toggle.checked=d; };
  const saved = getSaved();
  apply(saved ? saved : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));
  toggle.addEventListener('change', ()=> apply(toggle.checked?'dark':'light'));
})();

/* ==== Flyout ==== */
(function flyoutInit(){
  const openBtn=$('flyoutOpen'), closeBtn=$('flyoutClose'), panel=$('flyoutPanel'), overlay=$('flyoutOverlay');
  if(!openBtn||!panel||!overlay) return;
  let prevFocus=null;
  const getFocusables=()=>Array.from(panel.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )).filter(el=>el.offsetParent!==null);
  function open(){ prevFocus=document.activeElement; panel.classList.add('open'); overlay.hidden=false;
    requestAnimationFrame(()=>overlay.classList.add('show')); openBtn.setAttribute('aria-expanded','true');
    panel.setAttribute('aria-hidden','false'); (getFocusables()[0]||closeBtn||panel).focus();
    overlay.addEventListener('click', close, {once:true}); document.addEventListener('keydown', onKey);
    panel.addEventListener('keydown', trapTab); panel.addEventListener('click', onLink);
  }
  function close(){ panel.classList.remove('open'); overlay.classList.remove('show');
    openBtn.setAttribute('aria-expanded','false'); panel.setAttribute('aria-hidden','true');
    setTimeout(()=>overlay.hidden=true,200); document.removeEventListener('keydown', onKey);
    panel.removeEventListener('keydown', trapTab); panel.removeEventListener('click', onLink);
    (prevFocus||openBtn).focus();
  }
  const onKey=e=>{ if(e.key==='Escape'){ e.preventDefault(); close(); } };
  const trapTab=e=>{ if(e.key!=='Tab') return; const f=getFocusables(); if(!f.length) return;
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  };
  const onLink=e=>{ if(e.target.closest('a.menu-link')) close(); };
  openBtn.addEventListener('click', open); closeBtn?.addEventListener('click', close);
})();

/* ==== Core math/UI ==== */
function effectiveInternalRatio(){ return $('g_no_transmission').checked ? 1 : (+$('g_internal').value || 0); }
function setInternalUIState(){ $('g_internal_label').classList.toggle('dimmed', $('g_no_transmission').checked); }
const hasValid = (p,s,t,i)=> p>0 && s>0 && t>0 && i>0;
const show=(el,flag)=> el.classList.toggle('hidden', !flag);
const clearTexts=ids=> ids.forEach(id=> $(id).textContent='');

function update(){
  setInternalUIState();

  // persist
  persistInput('g_cur_pinion', KEYS.curPinion);
  persistInput('g_cur_spur',   KEYS.curSpur);
  persistInput('g_cur_tire',   KEYS.curTire);
  persistInput('g_new_pinion', KEYS.newPinion);
  persistInput('g_new_spur',   KEYS.newSpur);
  persistInput('g_new_tire',   KEYS.newTire);
  persistInput('g_internal',   KEYS.internalRatio);
  safeSet(KEYS.noTransmission, String($('g_no_transmission').checked));

  const internal = effectiveInternalRatio();
  const cur = { pinion:+$('g_cur_pinion').value, spur:+$('g_cur_spur').value, tire:+$('g_cur_tire').value };
  const neu = { pinion:+$('g_new_pinion').value, spur:+$('g_new_spur').value, tire:+($('g_new_tire').value||cur.tire) };

  const vCur = hasValid(cur.pinion,cur.spur,cur.tire,internal);
  const vNew = hasValid(neu.pinion,neu.spur,neu.tire,internal);

  if (vCur){
    $('g_cur_sp').textContent   = round(spurPinionRatio(cur.spur,cur.pinion),3);
    const fdr = finalDriveRatio(cur.spur,cur.pinion,internal);
    $('g_cur_fdr').textContent  = round(fdr,3);
    $('g_cur_roll').textContent = round(rolloutMMPerMotorRev(cur.tire,fdr),3);
  } else clearTexts(['g_cur_sp','g_cur_fdr','g_cur_roll']);
  show($('block_current'), vCur);

  if (vNew){
    $('g_new_sp').textContent   = round(spurPinionRatio(neu.spur,neu.pinion),3);
    const fdr = finalDriveRatio(neu.spur,neu.pinion,internal);
    $('g_new_fdr').textContent  = round(fdr,3);
    $('g_new_roll').textContent = round(rolloutMMPerMotorRev(neu.tire,fdr),3);
  } else clearTexts(['g_new_sp','g_new_fdr','g_new_roll']);
  show($('block_new'), vNew);

  if (vCur && vNew){
    const dFDR  = (+$('g_new_fdr').textContent / +$('g_cur_fdr').textContent - 1) * 100;
    const dRoll = (+$('g_new_roll').textContent / +$('g_cur_roll').textContent - 1) * 100;
    const setΔ=(el,val)=>{ el.textContent = isFinite(val) ? `${round(val,2)}%` : '—';
      el.className = 'delta-value ' + (!isFinite(val) ? 'delta-neutral' : (val>0?'delta-positive':val<0?'delta-negative':'delta-neutral'));
    };
    setΔ($('g_delta_fdr'), dFDR);
    setΔ($('g_delta_roll'), dRoll);
    show($('block_delta'), true);
  } else {
    clearTexts(['g_delta_fdr','g_delta_roll']);
    $('g_delta_fdr').className='delta-value delta-neutral';
    $('g_delta_roll').className='delta-value delta-neutral';
    show($('block_delta'), false);
  }
}

// init restore
[
  'g_cur_pinion','g_cur_spur','g_cur_tire',
  'g_new_pinion','g_new_spur','g_new_tire',
  'g_internal','g_no_transmission'
].forEach(id => $(id).addEventListener('input', update));

document.addEventListener('DOMContentLoaded', ()=>{
  restoreInput('g_cur_pinion', KEYS.curPinion);
  restoreInput('g_cur_spur',   KEYS.curSpur);
  restoreInput('g_cur_tire',   KEYS.curTire);
  restoreInput('g_new_pinion', KEYS.newPinion);
  restoreInput('g_new_spur',   KEYS.newSpur);
  restoreInput('g_new_tire',   KEYS.newTire);
  restoreInput('g_internal',   KEYS.internalRatio);
  const savedBypass = safeGet(KEYS.noTransmission);
  if (savedBypass !== null) $('g_no_transmission').checked = savedBypass === 'true';
  update();

  // initialize overlay remembered selections from inputs/storage
  chooser.state.pinion.selected.cur = +($('g_cur_pinion')?.value) || +(safeGet(KEYS.curPinion) || 0) || null;
  chooser.state.pinion.selected.new = +($('g_new_pinion')?.value) || +(safeGet(KEYS.newPinion) || 0) || null;
  chooser.state.spur.selected.cur   = +($('g_cur_spur')?.value)   || +(safeGet(KEYS.curSpur)   || 0) || null;
  chooser.state.spur.selected.new   = +($('g_new_spur')?.value)   || +(safeGet(KEYS.newSpur)   || 0) || null;
});

/* ============================================================
   REUSABLE CHOOSER (Pinion + Spur)
   ============================================================ */

const chooser = {
  // DOM refs for both overlays
  el: {
    pinion: { root: $('pinionOverlay'), rows: $('ppRows'), back: $('ppBack'), title: $('ppTitle') },
    spur:   { root: $('spurOverlay'),   rows: $('spRows'), back: $('spBack'), title: $('spTitle') }
  },
  state: {
    context: 'cur',         // 'cur' | 'new'
    type: 'pinion',         // 'pinion' | 'spur'
    pinion: { min:5,  max:70, selected:{ cur:null, new:null } },
    spur:   { min:20, max:160, selected:{ cur:null, new:null } } // adjust range as you like
  }
};

// open helper
function openChooser(type, context){
  chooser.state.type = type;            // 'pinion' | 'spur'
  chooser.state.context = context;      // 'cur' | 'new'
  const el = chooser.el[type];
  if (!el?.root) return;

  el.title.textContent = type === 'pinion' ? 'Choose Pinion' : 'Choose Spur';
  renderChooser();
  el.root.setAttribute('aria-hidden','false');
}

// close helper
function closeChooser(){
  const {type} = chooser.state;
  chooser.el[type].root.setAttribute('aria-hidden','true');
}

// rollout in cm per motor rev (clean numbers)
function rolloutCMPerMotorRev(tireMM, fdr){
  if (!tireMM || !fdr) return null;
  return (Math.PI * tireMM) / fdr / 10;
}

function renderChooser(){
  const { type, context } = chooser.state;
  const els = chooser.el[type];
  const internal = effectiveInternalRatio();
  const tire = +( $(`g_${context}_tire`)?.value || $('g_cur_tire')?.value );

  // fixed partner gear from inputs
  const pinionFixed = +$(`g_${context}_pinion`)?.value || 0;
  const spurFixed   = +$(`g_${context}_spur`)?.value   || 0;

  // selected value (from input → memory → storage)
  const selected = (() => {
    const fromInput = +( type === 'pinion' ? $(`g_${context}_pinion`)?.value : $(`g_${context}_spur`)?.value );
    if (fromInput > 0) return fromInput;
    const fromState = chooser.state[type].selected[context];
    if (fromState > 0) return fromState;
    const fromStore = +( safeGet( context==='cur'
      ? (type==='pinion'?KEYS.curPinion:KEYS.curSpur)
      : (type==='pinion'?KEYS.newPinion:KEYS.newSpur)) || 0);
    return fromStore > 0 ? fromStore : null;
  })();

  const rows=[];
  if (type === 'pinion'){
    for (let pin=chooser.state.pinion.min; pin<=chooser.state.pinion.max; pin++){
      const ratio = spurFixed / pin;
      const fdr   = ratio * internal;
      rows.push({ value:pin, ratio, fdr, rollout: rolloutCMPerMotorRev(tire,fdr) });
    }
  } else { // spur
    for (let spur=chooser.state.spur.min; spur<=chooser.state.spur.max; spur++){
      const ratio = spur / pinionFixed;
      const fdr   = ratio * internal;
      rows.push({ value:spur, ratio, fdr, rollout: rolloutCMPerMotorRev(tire,fdr) });
    }
  }

  els.rows.innerHTML = rows.map(r => `
    <tr class="pp-row ${r.value === selected ? 'selected' : ''}" data-v="${r.value}">
      <td><b>${r.value}</b></td>
      <td>${round(r.ratio,2)}</td>
      <td>${round(r.fdr,2)}</td>
      <td>${r.rollout==null ? '—' : round(r.rollout,2)}</td>
    </tr>
  `).join('');

  // click-to-select
  els.rows.querySelectorAll('.pp-row').forEach(tr=>{
    tr.addEventListener('click', ()=>{
      const chosen = +tr.getAttribute('data-v');
      if (type === 'pinion') $(`g_${context}_pinion`).value = chosen;
      else                   $(`g_${context}_spur`).value   = chosen;

      // remember selection for next time
      chooser.state[type].selected[context] = chosen;

      update();
      closeChooser();
    });
  });
}

// bind openers (pinion & spur)
document.querySelectorAll('.pinion-picker').forEach(inp=>{
  inp.addEventListener('click', ()=> openChooser('pinion', inp.dataset.context || 'cur'));
  inp.addEventListener('focus', ()=> inp.blur());
});
document.querySelectorAll('.spur-picker').forEach(inp=>{
  inp.addEventListener('click', ()=> openChooser('spur', inp.dataset.context || 'cur'));
  inp.addEventListener('focus', ()=> inp.blur());
});

// bind closers for both overlays
chooser.el.pinion.back?.addEventListener('click', closeChooser);
chooser.el.pinion.root?.querySelector('.pp-backdrop')?.addEventListener('click', closeChooser);
chooser.el.spur.back?.addEventListener('click', closeChooser);
chooser.el.spur.root?.querySelector('.pp-backdrop')?.addEventListener('click', closeChooser);

// live re-render while open if related inputs change
['g_cur_spur','g_cur_pinion','g_cur_tire','g_internal','g_new_spur','g_new_pinion','g_new_tire']
  .forEach(id => $(id)?.addEventListener('input', ()=>{
    const {type} = chooser.state;
    if (chooser.el[type].root?.getAttribute('aria-hidden')==='false') renderChooser();
  }));
