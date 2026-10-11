# movieinfo-api

Cloudflare Worker deployment from this repository's main branch.

Cloudflare build settings: root `/`, build command none, deploy command `npx wrangler deploy`.
Runtime secret: `TMDB_TOKEN` in Cloudflare Settings > Variables and Secrets. Never commit secret values.

The source preserves the supplied Worker behavior: six-hour freshness, seven-day stale retention, normalized query keys, browser CORS for recaprush.me and www.recaprush.me, and per-isolate concurrent request coalescing. Markdown formatting in the supplied code was removed.

Cache API is per data center. A cache HIT still invokes the Worker. CORS does not authenticate non-browser callers.

Verify deployment and make repeated requests to the same movie URL: `X-Worker-Cache` should move from MISS to HIT. Invalid JSON and upstream failures are not cached.

Legacy Blogger assets are retained.
