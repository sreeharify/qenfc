# qeNFC

A mobile-first web app for printed QR codes. Each QR code links to
`https://your-site/?code=XXXXX`. Scan an unclaimed code, sign in with Google,
enter the key printed under the code, and fill in a simple one-page portfolio
(business name, Google review link, contact info, social links). From then on
that QR code shows the portfolio page to anyone who scans it, and the owner
can edit it anytime from their dashboard.

**→ See `setup.txt` for the full, step-by-step setup guide (written for
someone who has never deployed anything before).**

## Stack

- **Frontend:** React + Vite, plain CSS (no framework), mobile-first light theme
- **Hosting:** Cloudflare Workers with static assets (the modern, actively
  developed successor to Cloudflare Pages — see the note at the top of
  `setup.txt` for why this project uses Workers instead of Pages)
- **Database:** Neon (serverless Postgres, accessed over HTTP — no server to run or maintain)
- **Auth:** Google OAuth (sign-in only, no passwords)
- **Hosting cost:** $0 on free tiers for a small/medium volume of QR codes

## Project layout

```
qenfc/
├── src/            React frontend (Vite)
├── worker/         Cloudflare Worker backend (the API, under /api/*)
├── db/schema.sql   Run this once in Neon to create the tables
├── wrangler.jsonc  Cloudflare Worker configuration
└── setup.txt       Full setup walkthrough — start here
```

## Local development

```
npm install
npm run dev          # frontend only, at http://localhost:5173
npm run worker:dev    # backend only, at http://localhost:8787 (needs .dev.vars — see .dev.vars.example)
```

Running `npm run dev` proxies `/api/*` requests to `http://localhost:8787`, so
run `worker:dev` in a second terminal if you want to test the full app locally.
This is optional — the setup guide's main path is pushing to GitHub and letting
Cloudflare build and deploy automatically.

## Deploying

Deployment happens automatically when you push to GitHub, once you've
connected the repo in the Cloudflare dashboard (see setup.txt). You can also
deploy manually with:

```
npm run deploy
```
