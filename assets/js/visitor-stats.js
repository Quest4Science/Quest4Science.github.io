/* Shared analytics for Jekyll pages and standalone project pages. */
(() => {
  'use strict';
  if (window.haitianVisitorStats) return;
  window.haitianVisitorStats = true;

  const endpoint = 'https://marvin.goatcounter.com';
  const production = ['lihaitian.com', 'www.lihaitian.com', 'quest4science.github.io']
    .includes(location.hostname.toLowerCase());
  const canonical = document.querySelector('link[rel="canonical"]');
  const path = new URL(canonical ? canonical.href : location.href).pathname
    .replace(/\/index\.html$/, '/');
  // Keep query strings and fragments out of the page totals. Preview visits are excluded.
  if (production) {
    window.goatcounter = Object.assign(window.goatcounter || {}, { path });
    const tracker = document.createElement('script');
    tracker.src = 'https://gc.zgo.at/count.js';
    tracker.async = true;
    tracker.dataset.goatcounter = endpoint + '/count';
    document.head.appendChild(tracker);
  }

  const mount = document.querySelector('[data-visitor-stats]');
  if (!mount) return;
  const overview = mount.dataset.visitorStats === 'overview';
  const panel = document.createElement('details');
  panel.className = 'visitor-stats';
  panel.innerHTML = `
    <summary><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 16V9m7 7V4m7 12v-6"/></svg><span>Visitor stats</span><span class="vs-chevron" aria-hidden="true">⌄</span></summary>
    <div class="vs-panel">
      <div class="vs-heading"><strong>${overview ? 'Across this website' : 'Visits to this website'}</strong><span>All time</span></div>
      <div class="vs-metrics">
        <div><span>All pages</span><strong data-vs-path="TOTAL">—</strong></div>
        <div><span>${overview ? 'Homepage' : 'This page'}</span><strong data-vs-current>—</strong></div>
      </div>
      ${overview ? `<div class="vs-pages"><div class="vs-row vs-table-heading"><span>Project &amp; page</span><span>Visits</span></div>
        <div class="vs-row"><a href="/Elastic-WAM/">Elastic-WAM <span aria-hidden="true">↗</span></a><span data-vs-path="/Elastic-WAM/">—</span></div>
        <div class="vs-row"><a href="/MonoArt/">MonoArt <span aria-hidden="true">↗</span></a><span data-vs-path="/MonoArt/">—</span></div>
        <div class="vs-row"><a href="/publications/">Publications <span aria-hidden="true">↗</span></a><span data-vs-path="/publications/">—</span></div>
      </div>` : ''}
      <p class="vs-status" role="status" aria-live="polite"></p>
      <button class="vs-retry" type="button" hidden>Try again</button>
      <a class="vs-dashboard" href="https://marvin.goatcounter.com/" target="_blank" rel="noopener noreferrer">Countries, regions &amp; all pages <span aria-hidden="true">↗</span></a>
      <p class="vs-note">Detailed analytics require the owner's sign-in. Visits to the same page are grouped within an 8-hour session. Counts may take up to 4 hours to update.</p>
      <p class="vs-note">Powered by GoatCounter · Country/region statistics use IP-derived location; full IP addresses are not stored.</p>
    </div>`;
  panel.querySelector('[data-vs-current]').dataset.vsPath = path;
  mount.appendChild(panel);
  // AcademicPages absolutely positions its footer. Reserve its changing height
  // when the disclosure opens, closes, or receives counts so it cannot cover content.
  const pageFooter = mount.closest('.page__footer');
  const fitFooter = () => {
    if (!pageFooter) return;
    const style = getComputedStyle(pageFooter);
    document.body.style.marginBottom = (pageFooter.offsetHeight +
      (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)) + 'px';
  };
  if (pageFooter && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(fitFooter).observe(pageFooter);
  }
  fitFooter();
  const status = panel.querySelector('.vs-status');
  const retry = panel.querySelector('.vs-retry');
  let loading = false;
  let loaded = false;

  async function loadCounts() {
    if (loading || loaded) return;
    loading = true;
    retry.hidden = true;
    status.textContent = 'Loading visitor statistics…';
    const fields = Array.from(panel.querySelectorAll('[data-vs-path]'));
    const paths = [...new Set(fields.map(field => field.dataset.vsPath))];
    let failures = 0;
    await Promise.all(paths.map(async countedPath => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let value = 'Unavailable';
      try {
        const response = await fetch(endpoint + '/counter/' + encodeURIComponent(countedPath) + '.json', {
          signal: controller.signal, credentials: 'omit'
        });
        const data = await response.json();
        // GoatCounter returns 404 with {count:"0"} for a path with no visits yet.
        if ((!response.ok && !(response.status === 404 && data.count === '0')) ||
            typeof data.count !== 'string' || !/^\d[\d, .]*$/.test(data.count)) {
          throw new Error('Visitor count unavailable');
        }
        value = data.count;
      } catch (_) {
        failures += 1;
      } finally {
        clearTimeout(timer);
      }
      fields.filter(field => field.dataset.vsPath === countedPath)
        .forEach(field => { field.textContent = value; });
    }));
    fitFooter();
    loaded = failures === 0;
    loading = false;
    retry.hidden = loaded;
    status.textContent = failures
      ? 'Some statistics are unavailable. Please try again later or open the analytics dashboard.'
      : production ? 'Recorded visits · all pages includes the homepage and tracked subpages.'
        : 'Live counts · this preview is not included in the statistics.';
  }
  panel.addEventListener('toggle', () => { fitFooter(); if (panel.open) loadCounts(); });
  retry.addEventListener('click', loadCounts);
})();
