// Sidebar on every page (dashboard, events, insights, reports): Home, common issues, and every event.
// Works from the local server and from the published static site; the script's own URL tells it where the site root is.
(function () {
  'use strict';
  const me = document.currentScript;
  if (!me || document.getElementById('nav-side')) return;
  const ROOT = new URL('.', me.src).href;
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const R = LOCAL ? {
    sessions: ROOT + 'api/sessions', home: ROOT, insights: ROOT + 'insights',
    event: id => ROOT + 'event/' + encodeURIComponent(id), report: b => ROOT + 'report/' + encodeURIComponent(b),
  } : {
    sessions: ROOT + 'data/sessions.json', home: ROOT + 'index.html', insights: ROOT + 'insights.html',
    event: id => ROOT + 'event.html?id=' + encodeURIComponent(id), report: b => ROOT + 'reports/' + encodeURIComponent(b) + '.html',
  };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pretty = s => String(s || '').replace(/_/g, ' ').trim();
  const day = d => d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };

  // which event / session this page is about, to highlight it
  const here = decodeURIComponent((location.pathname.match(/\/(?:report|event)\/([^/]+)$/) || location.pathname.match(/\/reports\/([^/]+)\.html$/) || [])[1] || new URLSearchParams(location.search).get('id') || '');
  const page = /insights/.test(location.pathname) ? 'insights' : here ? 'other' : 'home';

  const st = document.createElement('style');
  st.textContent = `
body{padding-top:40px}
#nav-bar{position:fixed;top:10px;left:10px;z-index:1001;display:flex;gap:6px}
#nav-bar button,#nav-bar a{font:600 13px system-ui,sans-serif;background:var(--panel,#fff);color:var(--ink,#16181d);border:1px solid var(--line,#e2e5ea);border-radius:8px;padding:6px 10px;cursor:pointer;text-decoration:none;box-shadow:0 1px 3px rgba(0,0,0,.12)}
#nav-side{position:fixed;top:0;left:0;bottom:0;width:270px;z-index:1000;background:var(--panel,#fff);color:var(--ink,#16181d);border-right:1px solid var(--line,#e2e5ea);
  overflow-y:auto;padding:56px 12px 20px;box-sizing:border-box;font:14px system-ui,sans-serif;transform:translateX(-100%);transition:transform .18s ease}
body.nav-open #nav-side{transform:none}
@media (min-width:1100px){body.nav-open{padding-left:270px}}
@media (max-width:1099px){body.nav-open::after{content:"";position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:999}}
#nav-side a{color:inherit;text-decoration:none;display:block;border-radius:8px;padding:7px 9px}
#nav-side a:hover{background:var(--chip,#eef1f5)}
#nav-side a.on{background:var(--chip,#eef1f5);box-shadow:inset 3px 0 0 var(--a,#2563eb)}
#nav-side .nav-h{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#5d6573);margin:16px 9px 6px}
#nav-side .nav-s{font-size:12px;color:var(--muted,#5d6573)}
#nav-side .nav-sess a{padding:4px 9px 4px 22px;font-size:13px}
#nav-side .nav-best{float:right;font-variant-numeric:tabular-nums;font-weight:600}`;
  document.head.appendChild(st);

  const bar = document.createElement('div');
  bar.id = 'nav-bar';
  bar.innerHTML = `<button type="button" aria-label="Show or hide the sidebar" title="Races (sidebar)">☰ Races</button>${page === 'home' ? '' : `<a href="${R.home}">⌂ Home</a>`}`;
  const side = document.createElement('nav');
  side.id = 'nav-side';
  side.innerHTML = `<a href="${R.home}" class="${page === 'home' ? 'on' : ''}"><b>⌂ Home</b></a>
    <a href="${R.insights}" class="${page === 'insights' ? 'on' : ''}">My common issues</a>
    <div class="nav-h">Events</div><div id="nav-events" class="nav-s" style="padding:0 9px">Loading…</div>`;
  document.body.append(side, bar);

  const open = (v, remember) => { document.body.classList.toggle('nav-open', v); if (remember) store.set('ams2-nav-open', v ? '1' : '0'); };
  // open by default on wide screens, closed on phones; remembers your choice
  const saved = store.get('ams2-nav-open');
  open(saved === null ? innerWidth >= 1100 : saved === '1');
  bar.querySelector('button').onclick = () => open(!document.body.classList.contains('nav-open'), true);
  document.addEventListener('click', e => { if (innerWidth < 1100 && document.body.classList.contains('nav-open') && !side.contains(e.target) && !bar.contains(e.target)) open(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && innerWidth < 1100) open(false); });

  fetch(R.sessions, { cache: 'no-store' }).then(r => r.json()).then(d => {
    const evs = d.events || [];
    const fmt = t => { if (!(t > 0)) return ''; const m = Math.floor(t / 60); return m + ':' + (t - m * 60).toFixed(3).padStart(6, '0'); };
    $events().innerHTML = evs.length ? evs.map(e => {
      const cur = here && (e.id === here || e.sessions.some(s => s.base === here));
      const seen = {};
      const sess = cur ? `<div class="nav-sess">${e.sessions.map(s => {
        const n = (seen[s.type] = (seen[s.type] || 0) + 1);
        return `<a href="${R.report(s.base)}" class="${s.base === here ? 'on' : ''}">${esc(s.type || 'Session')} ${n > 1 || e.sessions.filter(x => x.type === s.type).length > 1 ? n : ''} <span class="nav-s">${esc(day(s.date).split(', ').pop())}</span><span class="nav-best">${esc(fmt(s.best && s.best.time))}</span></a>`;
      }).join('')}</div>` : '';
      return `<a href="${R.event(e.id)}" class="${cur ? 'on' : ''}" style="color:var(--ink,#16181d)"><span class="nav-best">${esc(e.best ? e.best.fmt : '')}</span><b>${esc(pretty(e.track))}</b><br><span class="nav-s">${esc(e.car)} · ${esc(day(e.date))} · ${e.laps} laps</span></a>${sess}`;
    }).join('') : 'No events yet.';
    $events().style.padding = '0';
    const on = side.querySelector('#nav-events a.on');
    if (on) on.scrollIntoView({ block: 'center' });
  }).catch(() => { $events().textContent = 'Could not load your events.'; });
  function $events() { return document.getElementById('nav-events'); }
})();
