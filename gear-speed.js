<!-- Spur inputs must be readonly and have .spur-picker + data-context -->
<label>Spur
  <input id="g_cur_spur" type="number" value="48"
         class="spur-picker" data-context="cur" readonly>
</label>

<label>Spur
  <input id="g_new_spur" type="number" value="48"
         class="spur-picker" data-context="new" readonly>
</label>

<!-- Pinion Picker Overlay (unchanged) ... -->

<!-- Spur Picker Overlay (new) -->
<div id="spurOverlay" aria-hidden="true">
  <div class="pp-backdrop"></div>
  <div class="pp-sheet" role="dialog" aria-modal="true" aria-labelledby="spTitle">
    <header class="pp-header">
      <button id="spBack" aria-label="Close">←</button>
      <h2 id="spTitle">Choose Spur</h2>
      <div style="width:40px"></div>
    </header>
    <div class="pp-table-wrap">
      <table class="pp-table" aria-describedby="spTitle">
        <thead>
          <tr><th>SPUR</th><th>RATIO</th><th>FDR</th><th>ROLLOUT</th></tr>
        </thead>
        <tbody id="spRows"><!-- rows injected --></tbody>
      </table>
    </div>
  </div>
</div>
