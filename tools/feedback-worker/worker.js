/* South Paw · tools/feedback-worker/worker.js
   Receives the star ratings and comments players send after a match or training (src/ui/feedback.js) and keeps them
   in a Cloudflare D1 database (SQLite). You read them on a private page: /admin?key=YOUR_ADMIN_KEY
   (or download them all as a spreadsheet: /admin.csv?key=YOUR_ADMIN_KEY).

   Setup (once, from this folder, needs Node):
     1. npx wrangler login
     2. npx wrangler d1 create southpaw-feedback      then paste the database_id it prints into wrangler.toml
     3. npx wrangler deploy                           it prints the address, https://southpaw-feedback.<account>.workers.dev
     4. npx wrangler secret put ADMIN_KEY             type a long password only you know: it opens the /admin page
     5. If the address differs from feedbackUrl in game/data/config.js, put the new one there.
   The table is created on the first request (schema.sql has the same definition).
   ALLOW_ORIGIN (in wrangler.toml) lists the sites allowed to send feedback. */

const CTX = ['training', 'cpu', 'online', 'career'];
const SCHEMA = `CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, created TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5), text TEXT NOT NULL DEFAULT '', ctx TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '', version TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT '')`;
let ready = null;
const setup = env => ready || (ready = env.DB.batch([
  env.DB.prepare(SCHEMA),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS feedback_created ON feedback (created)')
]).catch(e => { ready = null; throw e; }));

const short = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n) : '';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/admin' || url.pathname === '/admin.csv') return admin(env, url);

    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOW_ORIGIN || '*').split(',').map(s => s.trim());
    const ok = allowed.includes('*') || allowed.includes(origin);
    const headers = {
      'Access-Control-Allow-Origin': ok ? (allowed.includes('*') ? '*' : origin) : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (req.method === 'OPTIONS') return new Response(null, { headers });
    if (req.method !== 'POST') return reply(200, { service: 'South Paw feedback' });
    if (!ok) return reply(403, { error: 'origin' });

    const raw = await req.text();
    if (raw.length > 4000) return reply(400, { error: 'too long' });
    let f;
    try { f = JSON.parse(raw); } catch (e) { return reply(400, { error: 'json' }); }
    const stars = Number(f && f.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return reply(400, { error: 'stars' });
    const ctx = CTX.includes(f.ctx) ? f.ctx : 'cpu';
    const row = [
      new Date().toISOString(), stars, short(f.text, 600), ctx,
      f.res === 'win' || f.res === 'loss' ? f.res : '',
      short(f.diff || f.opp, 24), short(f.ver, 12), f.dev === 'touch' ? 'touch' : f.dev === 'keys' ? 'keys' : '',
      short((req.cf && req.cf.country) || '', 2)
    ];
    try {
      await setup(env);
      await env.DB.prepare('INSERT INTO feedback (created, stars, text, ctx, result, detail, version, device, country) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(...row).run();
    } catch (e) {
      return reply(500, { error: 'store' });
    }
    return reply(200, { ok: true });
  }
};

/* ---------- the private page ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CTX_NAME = { training: 'Training', cpu: 'CPU fight', online: 'Online', career: 'Career' };

async function admin(env, url) {
  const key = url.searchParams.get('key') || '';
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response('Not found', { status: 404 });
  await setup(env);
  if (url.pathname === '/admin.csv') {
    const { results } = await env.DB.prepare('SELECT * FROM feedback ORDER BY id').all();
    const cols = ['id', 'created', 'stars', 'text', 'ctx', 'result', 'detail', 'version', 'device', 'country'];
    const cell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""') + '"' : s; };
    const csv = [cols.join(','), ...results.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="southpaw-feedback.csv"', 'Cache-Control': 'no-store' } });
  }
  const [sum, dist, byCtx, byVer, latest] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n, ROUND(AVG(stars), 2) AS avg, SUM(text <> \'\') AS comments FROM feedback'),
    env.DB.prepare('SELECT stars, COUNT(*) AS n FROM feedback GROUP BY stars ORDER BY stars DESC'),
    env.DB.prepare('SELECT ctx, COUNT(*) AS n, ROUND(AVG(stars), 2) AS avg FROM feedback GROUP BY ctx ORDER BY n DESC'),
    env.DB.prepare('SELECT version, COUNT(*) AS n, ROUND(AVG(stars), 2) AS avg FROM feedback GROUP BY version ORDER BY version DESC LIMIT 8'),
    env.DB.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 300')
  ]);
  const s = sum.results[0] || { n: 0, avg: null, comments: 0 };
  const n = s.n || 0;
  const bars = [5, 4, 3, 2, 1].map(k => {
    const c = (dist.results.find(r => r.stars === k) || { n: 0 }).n;
    const w = n ? Math.round(c / n * 100) : 0;
    return `<div class="bar"><span>${k} ★</span><i><b style="width:${w}%"></b></i><span>${c}</span></div>`;
  }).join('');
  const small = (rows, label) => rows.results.map(r => `<tr><td>${esc(label(r))}</td><td>${r.n}</td><td>${r.avg}</td></tr>`).join('');
  const rows = latest.results.map(r => `<tr><td class="d">${esc(r.created.slice(0, 16).replace('T', ' '))}</td><td class="st">${'★'.repeat(r.stars)}<span>${'★'.repeat(5 - r.stars)}</span></td>
    <td>${esc(r.text) || '<span class="mu">no comment</span>'}</td><td>${esc(CTX_NAME[r.ctx] || r.ctx)}${r.result ? ' · ' + esc(r.result) : ''}${r.detail ? ' · ' + esc(r.detail) : ''}</td>
    <td>${esc(r.version)}</td><td>${esc(r.device)}</td><td>${esc(r.country)}</td></tr>`).join('');
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>South Paw feedback</title><style>
:root{--bg:#0b0c10;--ink:#f4efe4;--mu:#9ea2ad;--line:#262833;--gold:#ffc83a}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,'Segoe UI',sans-serif;padding:20px 16px 40px}
main{max-width:1100px;margin:0 auto}h1{font-size:26px;margin:0 0 4px}p.sub{color:var(--mu);margin:0 0 20px}
.top{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:22px}
.box{border:1px solid var(--line);padding:14px 16px}.big{font-size:40px;font-weight:800;line-height:1}.big small{font-size:15px;color:var(--mu);font-weight:500}
.bar{display:grid;grid-template-columns:34px 1fr 34px;gap:8px;align-items:center;font-size:13px}.bar i{height:8px;background:#1b1d25;display:block}.bar b{display:block;height:100%;background:var(--gold)}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mu);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.st{color:var(--gold);white-space:nowrap}.st span{color:#3a3c46}.d{white-space:nowrap;color:var(--mu)}.mu{color:var(--mu)}
.wrap{overflow-x:auto}a{color:var(--gold)}</style></head><body><main>
<h1>South Paw feedback</h1><p class="sub">${n} rating${n === 1 ? '' : 's'} · <a href="/admin.csv?key=${encodeURIComponent(key)}">Download all as CSV</a></p>
<div class="top"><div class="box"><div class="big">${s.avg == null ? '-' : s.avg} <small>average of 5</small></div><p class="mu">${s.comments || 0} with a comment</p></div>
<div class="box">${bars}</div>
<div class="box"><table><tr><th>Where</th><th>Ratings</th><th>Avg</th></tr>${small(byCtx, r => CTX_NAME[r.ctx] || r.ctx)}</table></div>
<div class="box"><table><tr><th>Version</th><th>Ratings</th><th>Avg</th></tr>${small(byVer, r => r.version || '?')}</table></div></div>
<div class="wrap"><table><tr><th>When (UTC)</th><th>Stars</th><th>Comment</th><th>Where</th><th>Version</th><th>Device</th><th>Country</th></tr>${rows || '<tr><td colspan="7" class="mu">Nothing yet.</td></tr>'}</table></div>
</main></body></html>`;
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
