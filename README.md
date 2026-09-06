# Shopping Order Website — Cloudflare Workers + D1

Includes customer storefront, product/order flow, UPI amount QR, order tracking, admin login, persistent D1 orders/products/settings, and SPA fallback to avoid normal route 404s.

## Deploy
1. Install Wrangler: `npm install -g wrangler`
2. `wrangler login`
3. Create D1: `wrangler d1 create shopping-orders`
4. Put the returned database_id into `wrangler.toml`.
5. Run migration: `wrangler d1 migrations apply shopping-orders --remote`
6. Set secrets: `wrangler secret put ADMIN_PASSWORD` and `wrangler secret put ADMIN_SESSION_TOKEN` (use a long random value for the token).
7. Deploy: `wrangler deploy`

The customer site is `/`. Admin is `/admin.html`. Order tracking is `/track.html`.
