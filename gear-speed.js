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

// write the current value of an input to storage (as string)
function persistInput(id, key) {
  const el = $(id);
  if (!el) return;
  const v = el.value;
  // Don’t persist internal if bypass is checked; keep last “real” value intact
  if (id === 'g_internal' && $('g_no_transmission').checked) return;
  if (v !== '' && v != null) safeSet(key, v);
}

// load from storage into an input if available
function restoreInput(id, key) {
  const el = $(id);
  if (!el) return;
  const v = safeGet(key);
  if (v !== null && v !== '') el.value = v;
}

// ---- Light/Dark mode ----
(function themeInit(){
  const toggle = document.getElementById('darkModeToggle');
  if (!toggle) return;

  const KEYS = ['fuelcalc.theme','darkMode','theme'];  // be compatible with main app if keys differ
  const getSaved = () => {
    for (const k of KEYS) { const v = localStorage.getItem(k); if (v) return v; }
    return null;
  };
  const save = (mode) => { try { localStorage.setItem(KEYS[0], mode); } catch {} };

  const apply = (mode) => {
    const isDark = mode === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    toggle.checked = isDark;
  };

  // initial: use saved → or OS preference → default light
  const saved = getSaved();
  const initial = saved ? saved
                        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  apply(initial);

  toggle.addEventListener('change', () => {
    const mode = toggle.checked ? 'dark' : 'light';
    apply(mode);
    save(mode);
  });

  // keep in sync if OS theme changes and user hasn’t set a preference
  if (!saved && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      apply(e.matches ? 'dark' : 'light');
    });
  }
})();

/* === Flyout menu with focus trap === */
(function flyoutInit(){
  const openBtn   = $('flyoutOpen');
  const closeBtn  = $('flyoutClose');
  const panel     = $('flyoutPanel');
  const overlay   = $('flyoutOverlay');
  const versionEl = $('flyoutVersion');

  if (!openBtn || !panel || !overlay) return;

  // optional: mirror app version into panel footer
  try {
    const mainVer = $('appVersion')?.textContent?.trim();
    if (mainVer && versionEl) versionEl.textContent = mainVer;
  } catch {}

  let prevFocus = null;

  // return all focusable elements inside the panel (live each time)
  const getFocusables = () => {
    const list = panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(list).filter(el => el.offsetParent !== null);
  };

  function openFlyout(){
    prevFocus = document.activeElement;
    panel.classList.add('open');
    overlay.hidden = false;
    requestAnimationFrame(()=> overlay.classList.add('show'));

    openBtn.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');

    // focus first focusable or close button/panel
    const f = getFocusables()[0] || closeBtn || panel;
    f.focus();

    overlay.addEventListener('click', closeFlyout, { once: true });
    document.addEventListener('keydown', onKeydown);
    panel.addEventListener('keydown', trapTab);
    // close on link click inside the panel
    panel.addEventListener('click', onLinkClick);
  }

  function closeFlyout(){
    panel.classList.remove('open');
    overlay.classList.remove('show');
    openBtn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');

    setTimeout(()=> overlay.hidden = true, 200);

    document.removeEventListener('keydown', onKeydown);
    panel.removeEventListener('keydown', trapTab);
    panel.removeEventListener('click', onLinkClick);

    // restore focus
    (prevFocus || openBtn).focus();
  }

  function onKeydown(e){
    if (e.key === 'Escape') {
      e.preventDefault();
      closeFlyout();
    }
  }

  // Keep tab focus inside panel when open
  function trapTab(e){
    if (e.key !== 'Tab') return;
    const focusables = getFocusables();
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onLinkClick(e){
    const link = e.target.closest('a.menu-link');
    if (!link) return;
    // close panel; navigation will proceed
    panel.classList.remove('open');
    overlay.classList.remove('show');
    setTimeout(()=> overlay.hidden = true, 200);
  }

  openBtn.addEventListener('click', openFlyout);
  closeBtn?.addEventListener('click', closeFlyout);
})();

// ---------- UI / math ----------
function effectiveInternalRatio() {
  return $('g_no_transmission').checked ? 1 : (+$('g_internal').value || 0);
}

function setInternalUIState() {
  const bypass = $('g_no_transmission').checked;
  const input = $('g_internal');
  const label = $('g_internal_label');

  if (bypass) {
    label.classList.add('dimmed');
    input.disabled = true;
    input.value = '1.0'; // display 1.0 while bypassed
  } else {
    label.classList.remove('dimmed');
    input.disabled = false;
    // restore persisted internal ratio (if any)
    const saved = safeGet(KEYS.internalRatio);
    if (saved && !isNaN(+saved) && +saved > 0) input.value = saved;
  }
}

function hasValidInputs(pinion, spur, tire, internalEff) {
  return pinion > 0 && spur > 0 && tire > 0 && internalEff > 0;
}

function show(el, flag) { el.classList.toggle('hidden', !flag); }
function clearTexts(ids) { ids.forEach(id => $(id).textContent = ''); }

function update() {
  setInternalUIState();

  // persist current values (numbers as strings)
  persistInput('g_cur_pinion', KEYS.curPinion);
  persistInput('g_cur_spur',   KEYS.curSpur);
  persistInput('g_cur_tire',   KEYS.curTire);
  persistInput('g_new_pinion', KEYS.newPinion);
  persistInput('g_new_spur',   KEYS.newSpur);
  persistInput('g_new_tire',   KEYS.newTire);
  persistInput('g_internal',   KEYS.internalRatio);
  safeSet(KEYS.noTransmission, String($('g_no_transmission').checked));

  const internal = effectiveInternalRatio();

  const cur = {
    pinion: +$('g_cur_pinion').value,
    spur:   +$('g_cur_spur').value,
    tire:   +$('g_cur_tire').value
  };
  const neu = {
    pinion: +$('g_new_pinion').value,
    spur:   +$('g_new_spur').value,
    tire:   +($('g_new_tire').value || cur.tire)
  };

  const validCur = hasValidInputs(cur.pinion, cur.spur, cur.tire, internal);
  const validNew = hasValidInputs(neu.pinion, neu.spur, neu.tire, internal);

  if (validCur) {
    const curSP = spurPinionRatio(cur.spur, cur.pinion);
    const curFDR = finalDriveRatio(cur.spur, cur.pinion, internal);
    const curRoll = rolloutMMPerMotorRev(cur.tire, curFDR);
    $('g_cur_sp').textContent   = round(curSP, 3);
    $('g_cur_fdr').textContent  = round(curFDR, 3);
    $('g_cur_roll').textContent = round(curRoll, 3);
  } else {
    clearTexts(['g_cur_sp','g_cur_fdr','g_cur_roll']);
  }
  show($('block_current'), validCur);

  if (validNew) {
    const newSP = spurPinionRatio(neu.spur, neu.pinion);
    const newFDR = finalDriveRatio(neu.spur, neu.pinion, internal);
    const newRoll = rolloutMMPerMotorRev(neu.tire, newFDR);
    $('g_new_sp').textContent   = round(newSP, 3);
    $('g_new_fdr').textContent  = round(newFDR, 3);
    $('g_new_roll').textContent = round(newRoll, 3);
  } else {
    clearTexts(['g_new_sp','g_new_fdr','g_new_roll']);
  }
  show($('block_new'), validNew);

  if (validCur && validNew) {
    const dFDR  = (+( $('g_new_fdr').textContent ) / +( $('g_cur_fdr').textContent ) - 1) * 100;
    const dRoll = (+( $('g_new_roll').textContent ) / +( $('g_cur_roll').textContent ) - 1) * 100;

    function setDelta(el, val) {
      el.textContent = isFinite(val) ? `${round(val,2)}%` : '—';
      el.classList.remove('delta-positive','delta-negative','delta-neutral');
      if (!isFinite(val)) {
        el.classList.add('delta-neutral');
      } else if (val > 0) {
        el.classList.add('delta-positive');
      } else if (val < 0) {
        el.classList.add('delta-negative');
      } else {
        el.classList.add('delta-neutral');
      }
    }

    setDelta($('g_delta_fdr'), dFDR);
    setDelta($('g_delta_roll'), dRoll);
    show($('block_delta'), true);
  } else {
    clearTexts(['g_delta_fdr','g_delta_roll']);
    $('g_delta_fdr').className = 'delta-value delta-neutral';
    $('g_delta_roll').className = 'delta-value delta-neutral';
    show($('block_delta'), false);
  }
}

// ---------- init ----------
[
  'g_cur_pinion','g_cur_spur','g_cur_tire',
  'g_new_pinion','g_new_spur','g_new_tire',
  'g_internal','g_no_transmission'
].forEach(id => $(id).addEventListener('input', update));

document.addEventListener('DOMContentLoaded', () => {
  // restore all persisted values (order matters a bit for UX)
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
});

/* ---------------- Pinion Picker ---------------- */

const pp = {
  el: {
    root: document.getElementById('pinionOverlay'),
    rows: document.getElementById('ppRows'),
    back: document.getElementById('ppBack'),
    title: document.getElementById('ppTitle'),
  },
  state: {
    context: 'cur',   // 'cur' or 'new' – which input launched the picker
    pinionMin: 5,
    pinionMax: 70
  }
};

// open the overlay
function openPinionPicker(context) {
  pp.state.context = context;
  pp.el.title.textContent = 'Choose Pinion';
  renderPinionRows();
  pp.el.root.setAttribute('aria-hidden', 'false');
}

// close the overlay
function closePinionPicker() {
  pp.el.root.setAttribute('aria-hidden', 'true');
}

// compute rollout units (we’ll show cm by default for a tidy number)
function rolloutCMPerMotorRev(tireMM, fdr) {
  if (!tireMM || !fdr) return null;
  return (Math.PI * tireMM) / fdr / 10; // cm
}

function renderPinionRows() {
  const ctx = pp.state.context === 'cur' ? 'cur' : 'new';

  const spur = +document.getElementById(`g_${ctx}_spur`).value;
  // FIX: single shared Internal Ratio field
  const internal = effectiveInternalRatio();
  // prefer “new” tire if present when context is new; else fall back to current
  const tire = +(document.getElementById(`g_${ctx}_tire`).value ||
                 document.getElementById('g_cur_tire').value);

  const selectedPinion = +document.getElementById(`g_${ctx}_pinion`).value;

  const rows = [];
  for (let pin = pp.state.pinionMin; pin <= pp.state.pinionMax; pin++) {
    const ratio = spur / pin;
    const fdr = ratio * internal;
    const rollCm = rolloutCMPerMotorRev(tire, fdr); // may be null if tire not set

    rows.push({
      pinion: pin,
      ratio: isFinite(ratio) ? ratio : 0,
      fdr: isFinite(fdr) ? fdr : 0,
      rollout: rollCm
    });
  }

  pp.el.rows.innerHTML = rows.map(r => `
    <tr class="pp-row ${r.pinion === selectedPinion ? 'selected' : ''}"
        data-pinion="${r.pinion}">
      <td><b>${r.pinion}</b></td>
      <td>${round(r.ratio, 2)}</td>
      <td>${round(r.fdr, 2)}</td>
      <td>${r.rollout == null ? '—' : round(r.rollout, 2)}</td>
    </tr>
  `).join('');

  // click-to-select
  Array.from(pp.el.rows.querySelectorAll('.pp-row')).forEach(tr => {
    tr.addEventListener('click', e => {
      const chosen = +tr.getAttribute('data-pinion');
      document.getElementById(`g_${ctx}_pinion`).value = chosen;
      // reflect selection & recompute main results
      update();
      closePinionPicker();
    });
  });
}

// open from either input
Array.from(document.querySelectorAll('.pinion-picker')).forEach(input => {
  // visually still looks like an input; treat as button
  input.addEventListener('click', e => {
    const ctx = input.getAttribute('data-context'); // 'cur' or 'new'
    openPinionPicker(ctx);
  });
  // prevent keyboard from showing on mobile
  input.addEventListener('focus', e => { input.blur(); });
});

// close actions
pp.el.back.addEventListener('click', closePinionPicker);
pp.el.root.querySelector('.pp-backdrop').addEventListener('click', closePinionPicker);

// re-render list if upstream numbers change (spur/internal/tire)
['g_cur_spur','g_internal','g_cur_tire','g_new_spur','g_new_tire']
  .forEach(id=>{
    const n = document.getElementById(id);
    if (n) n.addEventListener('input', () => {
      if (pp.el.root.getAttribute('aria-hidden') === 'false') renderPinionRows();
    });
  });
