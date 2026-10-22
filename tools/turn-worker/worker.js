/* South Paw · tools/turn-worker/worker.js
   A tiny Cloudflare Worker that hands out short-lived relay (TURN) credentials from Cloudflare's own TURN service.
   Relays let two players connect when their networks block a direct connection (common on mobile data and office Wi-Fi).
   Setup (once):
     1. Cloudflare dashboard > Realtime > TURN Server > Create. Copy the Turn Token ID and the API Token.
     2. cd tools/turn-worker && npx wrangler deploy
     3. npx wrangler secret put TURN_KEY_ID        (paste the Token ID)
        npx wrangler secret put TURN_KEY_API_TOKEN (paste the API Token)
     4. In game/data/config.js set  turnUrl:'https://southpaw-turn.<your-account>.workers.dev'
   ALLOW_ORIGIN (in wrangler.toml) limits which site may ask for credentials. */
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOW_ORIGIN || '*').split(',').map(s => s.trim());
    const ok = allowed.includes('*') || allowed.includes(origin);
    const headers = {
      'Access-Control-Allow-Origin': ok ? (allowed.includes('*') ? '*' : origin) : 'null',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers });
    if (!ok || !env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return new Response('{"iceServers":[]}', { headers });
    try {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 86400 })
      });
      const j = await r.json();
      // port 53 times out in browsers, so leave it out
      const iceServers = (j.iceServers || []).map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }));
      return new Response(JSON.stringify({ iceServers }), { headers });
    } catch (e) {
      return new Response('{"iceServers":[]}', { headers });
    }
  }
};
