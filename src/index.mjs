// TMDB_TOKEN is a Cloudflare runtime secret, never a repository value.
const ORIGINS = new Set(['https://recaprush.me', 'https://www.recaprush.me']);
const IGNORED = new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','timestamp','cacheBust','_','api_key']);
const FRESH_MS = 6 * 3600_000;
const RETAIN_SECONDS = 7 * 86400;
const pending = new Map();
function decorate(response, origin, state) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin || 'https://recaprush.me');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Expose-Headers', 'X-Worker-Cache');
  headers.set('Vary', 'Origin');
  headers.set('Cache-Control', response.ok ? 'public, max-age=300' : 'no-store');
  headers.set('X-Worker-Cache', state);
  return new Response(response.body, {status:response.status, headers});
}
function failure(message, status, origin) {
  return decorate(new Response(JSON.stringify({error:message}), {
    status, headers:{'Content-Type':'application/json; charset=utf-8'}
  }), origin, 'ERROR');
}
function refresh(url, key, cache, env) {
  const name = key.url;
  if (!pending.has(name)) {
    const work = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const upstream = await fetch(url, {
          headers:{Authorization:`Bearer ${env.TMDB_TOKEN}`, Accept:'application/json'},
          signal:controller.signal
        });
        const body = await upstream.text();
        if (upstream.ok) JSON.parse(body);
        const headers = new Headers({'Content-Type':'application/json; charset=utf-8',
          'Cache-Control':upstream.ok ? `public, max-age=${RETAIN_SECONDS}` : 'no-store'});
        if (upstream.ok) headers.set('X-RR-Cached-At', String(Date.now()));
        const result = new Response(body, {status:upstream.status, headers});
        if (result.ok && cache) {
          try { await cache.put(key, result.clone()); } catch { /* Serve success even if cache fails. */ }
        }
        return result;
      } finally { clearTimeout(timer); }
    })();
    pending.set(name, work);
    work.then(() => pending.delete(name), () => pending.delete(name));
  }
  return pending.get(name).then(response => response.clone());
}
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    if (origin && !ORIGINS.has(origin)) return new Response('Origin not allowed', {status:403, headers:{'Cache-Control':'no-store'}});
    if (request.method === 'OPTIONS') return decorate(new Response(null,{status:204}),origin,'PREFLIGHT');
    if (request.method !== 'GET') return failure('Method not allowed',405,origin);
    const incoming = new URL(request.url);
    const path = incoming.pathname === '/' ? '/3/movie/popular' : incoming.pathname;
    if (!path.startsWith('/3/')) return failure('Invalid TMDB API path',400,origin);
    if (!/^\/3\/(movie|tv|person|search|discover|trending|genre|configuration|find)(\/|$)/.test(path)) return failure('Unsupported public TMDB path',400,origin);
    const upstream = new URL(path, 'https://api.themoviedb.org');
    const pairs = [...incoming.searchParams].filter(([name]) => !IGNORED.has(name));
    pairs.sort(([a,av],[b,bv]) => a.localeCompare(b) || av.localeCompare(bv));
    for (const [name,value] of pairs) upstream.searchParams.append(name,value);
    const cacheUrl = new URL(incoming.origin + path);
    cacheUrl.search = upstream.search;
    const key = new Request(cacheUrl, {method:'GET'});
    const cache = typeof caches !== 'undefined' ? caches.default : undefined;
    let stored;
    try { stored = await cache?.match(key); } catch { /* Continue on cache outage. */ }
    if (stored?.ok) {
      const age = Date.now() - Number(stored.headers.get('X-RR-Cached-At'));
      if (age >= 0 && age < FRESH_MS) return decorate(stored,origin,'HIT');
      if (env.TMDB_TOKEN) ctx.waitUntil(refresh(upstream,key,cache,env).then(() => undefined).catch(() => undefined));
      return decorate(stored,origin,'STALE');
    }
    if (!env.TMDB_TOKEN) return failure('TMDB configuration missing',503,origin);
    try { return decorate(await refresh(upstream,key,cache,env),origin,'MISS'); }
    catch (error) { return failure(error?.name === 'AbortError' ? 'TMDB request timed out' : 'TMDB request failed',502,origin); }
  }
};
