/*
  hero-calculator-widget.js
  Builtsy Platform Asset — v1.0

  Reads from window.BUILTSY_CALC_DATA (set by blueprint before this script runs).
  Renders an animated "Build your visit" card into #builtsy-hero-calc-widget.

  Data shape expected:
    window.BUILTSY_CALC_DATA = {
      baseLabel: 'Babysitting · 3 hrs',   // first row label (required)
      basePrice: 75,                        // base price number (required)
      addons: [                             // up to 4 add-ons (required, min 1)
        { name: 'Kitchen Tidy', price: 15 },
        { name: 'Laundry Fold', price: 12 }
      ],
      ctaText: 'Customize your visit',      // optional, default shown
      bundleNote: 'Bundle 3+ add-ons and save 10%',  // optional
      accentColor: '#e05a80',              // optional, default pink
      position: 'overlay' | 'split'        // optional, controls layout class
    };

  Placement in blueprint HTML:
    Full-spread hero:  <div id="builtsy-hero-calc-widget" data-position="overlay"></div>
    Split-screen hero: <div id="builtsy-hero-calc-widget" data-position="split"></div>

  The script self-styles. No external CSS needed.
*/

(function () {

  var MOUNT_ID = 'builtsy-hero-calc-widget';
  var LOOP_DELAY_START = 1200;
  var STEP_GAP = 1600;
  var PAUSE_AFTER = 2000;

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    var data = window.BUILTSY_CALC_DATA;
    if (!data || !data.addons || !data.addons.length) {
      console.warn('[Builtsy] hero-calculator-widget: window.BUILTSY_CALC_DATA not set or missing addons.');
      return;
    }

    var accent     = data.accentColor  || '#e05a80';
    var accentBg   = data.accentBg     || '#fbeaf0';
    var baseLabel  = data.baseLabel    || 'Session';
    var basePrice  = Number(data.basePrice) || 0;
    var addons     = data.addons.slice(0, 4);
    var ctaText    = data.ctaText      || 'Customize your visit';
    var bundleNote = data.bundleNote   || '';
    var position   = mount.dataset.position || data.position || 'split';

    var uid = 'bhcw_' + Math.random().toString(36).slice(2, 7);

    /* ── STYLES ── */
    var css = [
      '#' + uid + '{',
        'font-family:inherit;',
        'background:#fff;',
        'border-radius:20px;',
        'border:0.5px solid rgba(0,0,0,0.1);',
        'padding:1.5rem 1.25rem;',
        'width:300px;',
        'box-sizing:border-box;',
        'user-select:none;',
      '}',
      '.bhcw-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;}',
      '.bhcw-eyebrow{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#888;}',
      '.bhcw-total{font-size:26px;font-weight:600;color:' + accent + ';transition:transform 0.25s,color 0.25s;}',
      '.bhcw-total.bhcw-bump{transform:scale(1.13);}',
      '.bhcw-row{',
        'border:1.5px solid #e8e8e8;',
        'border-radius:12px;',
        'padding:0.7rem 0.9rem;',
        'margin-bottom:0.55rem;',
        'display:flex;',
        'align-items:center;',
        'gap:10px;',
        'transition:border-color 0.25s,background 0.25s;',
      '}',
      '.bhcw-row.bhcw-on{border-color:' + accent + ';background:' + accentBg + ';}',
      '.bhcw-box{',
        'width:20px;height:20px;',
        'border:1.5px solid #ccc;',
        'border-radius:5px;',
        'flex-shrink:0;',
        'display:flex;align-items:center;justify-content:center;',
        'transition:background 0.2s,border-color 0.2s;',
      '}',
      '.bhcw-row.bhcw-on .bhcw-box{background:' + accent + ';border-color:' + accent + ';}',
      '.bhcw-tick{width:9px;height:9px;opacity:0;transition:opacity 0.15s;}',
      '.bhcw-row.bhcw-on .bhcw-tick{opacity:1;}',
      '.bhcw-name{font-size:13px;color:#1a1a1a;flex:1;}',
      '.bhcw-price{font-size:13px;font-weight:500;color:#888;transition:color 0.25s;}',
      '.bhcw-row.bhcw-on .bhcw-price{color:' + accent + ';}',
      '.bhcw-cta{',
        'width:100%;margin-top:0.9rem;',
        'background:#1a1a1a;color:#fff;',
        'border:none;border-radius:40px;',
        'padding:0.85rem 1rem;',
        'font-size:13px;font-weight:500;',
        'cursor:default;letter-spacing:0.01em;',
        'font-family:inherit;',
      '}',
      '.bhcw-note{text-align:center;font-size:11px;color:#aaa;margin-top:0.55rem;}',

      /* overlay positioning */
      '.bhcw-wrap-overlay{',
        'position:absolute;',
        'bottom:2.5rem;right:2.5rem;',
        'z-index:10;',
        'filter:drop-shadow(0 8px 24px rgba(0,0,0,0.18));',
      '}',

      /* split positioning — centered in column */
      '.bhcw-wrap-split{',
        'display:flex;',
        'justify-content:center;',
        'align-items:center;',
      '}'
    ].join('');

    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ── BUILD HTML ── */
    var checkSVG = '<svg width="9" height="9" viewBox="0 0 9 9" fill="none" class="bhcw-tick"><polyline points="1,4.5 3.5,7 8,1.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var rows = '';
    /* base row — always on */
    rows += '<div class="bhcw-row bhcw-on" id="' + uid + '_base">';
    rows +=   '<div class="bhcw-box">' + checkSVG + '</div>';
    rows +=   '<span class="bhcw-name">' + baseLabel + '</span>';
    rows +=   '<span class="bhcw-price" id="' + uid + '_p_base">$' + basePrice + '</span>';
    rows += '</div>';

    for (var i = 0; i < addons.length; i++) {
      rows += '<div class="bhcw-row" id="' + uid + '_addon_' + i + '">';
      rows +=   '<div class="bhcw-box">' + checkSVG + '</div>';
      rows +=   '<span class="bhcw-name">' + addons[i].name + '</span>';
      rows +=   '<span class="bhcw-price">+$' + addons[i].price + '</span>';
      rows += '</div>';
    }

    var noteHTML = bundleNote ? '<div class="bhcw-note">' + bundleNote + '</div>' : '';

    var card = '<div id="' + uid + '">';
    card +=   '<div class="bhcw-header">';
    card +=     '<span class="bhcw-eyebrow">Build your visit</span>';
    card +=     '<span class="bhcw-total" id="' + uid + '_total">$' + basePrice + '</span>';
    card +=   '</div>';
    card +=   rows;
    card +=   '<button class="bhcw-cta">' + ctaText + ' \u2192</button>';
    card +=   noteHTML;
    card += '</div>';

    var wrapClass = position === 'overlay' ? 'bhcw-wrap-overlay' : 'bhcw-wrap-split';
    mount.innerHTML = '<div class="' + wrapClass + '">' + card + '</div>';

    /* ── ANIMATION LOOP ── */
    var active = [];

    function setAddon(idx, on) {
      var row = document.getElementById(uid + '_addon_' + idx);
      if (!row) return;
      if (on) {
        row.classList.add('bhcw-on');
        active.push(idx);
      } else {
        row.classList.remove('bhcw-on');
        var pos = active.indexOf(idx);
        if (pos > -1) active.splice(pos, 1);
      }
      updateTotal();
    }

    function updateTotal() {
      var t = basePrice;
      for (var i = 0; i < active.length; i++) {
        t += addons[active[i]].price;
      }
      var el = document.getElementById(uid + '_total');
      if (!el) return;
      el.textContent = '$' + t;
      el.classList.add('bhcw-bump');
      setTimeout(function () { el.classList.remove('bhcw-bump'); }, 280);
    }

    function clearAll() {
      for (var i = 0; i < addons.length; i++) {
        var row = document.getElementById(uid + '_addon_' + i);
        if (row) row.classList.remove('bhcw-on');
      }
      active = [];
      updateTotal();
    }

    function runLoop() {
      var steps = [];
      var t = LOOP_DELAY_START;

      /* check addons one by one */
      for (var i = 0; i < addons.length; i++) {
        (function (idx, delay) {
          steps.push({ delay: delay, fn: function () { setAddon(idx, true); } });
        })(i, t);
        t += STEP_GAP;
      }

      /* pause at full total */
      t += PAUSE_AFTER;

      /* uncheck in reverse */
      for (var j = addons.length - 1; j >= 0; j--) {
        (function (idx, delay) {
          steps.push({ delay: delay, fn: function () { setAddon(idx, false); } });
        })(j, t);
        t += STEP_GAP * 0.7;
      }

      /* restart */
      var totalDuration = t + PAUSE_AFTER;

      for (var s = 0; s < steps.length; s++) {
        (function (step) {
          setTimeout(step.fn, step.delay);
        })(steps[s]);
      }

      setTimeout(function () {
        clearAll();
        runLoop();
      }, totalDuration);
    }

    /* respect prefers-reduced-motion */
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      runLoop();
    } else {
      /* static state — show first addon checked */
      if (addons.length) setAddon(0, true);
    }
  }

  /* run after DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
