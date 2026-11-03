# Flipcast (Depop Sales Insights)

Capstone project for the CU Boulder AI Club Applied AI program. Live demo: **Nov 3, 2026**.

Flipcast is the app's name in the UI. A Depop seller uploads their sales CSV, sees sales metrics on a dashboard, and gets an AI report with:

- trends in what sells and when
- a 30-day sales forecast
- sourcing and pricing recommendations
- a "discernment" check where the Trend Analyst reviews the Forecaster's numbers

Users must log in. They can save their Depop handle for a one-click link to their shop, add their own market research to a report, and do a 30-day check-in that compares actual sales with the forecast.

## Stack

- **Frontend:** React + Vite + Tailwind CSS v4, TypeScript, `react-router` for the three pages
- **Backend:** Netlify Functions in TypeScript
- **Storage:** Netlify Blobs (`@netlify/blobs`) for everything: uploaded CSVs, computed metrics, agent results
- **AI:** Claude through Netlify AI Gateway, model `claude-opus-5-5`, using `@anthropic-ai/sdk`
- **Login:** Netlify Identity (`@netlify/identity`), email/password and Google, no confirmation email. Configured only in the Netlify dashboard (Identity page)
- **Hosting:** Netlify

Not used, and should not be added back: Supabase, n8n, email services, `.env` files.

## Folder layout

```
src/                     React app
  pages/                 LoginPage, UploadPage, DashboardPage, ReportPage
  components/            Layout (nav + account menu), DepopShopCard, HumanResearchCard, CheckInCard, charts
  lib/                   api.ts (fetch helpers), auth.tsx (login state), profile.tsx (profile state)
netlify/
  functions/             HTTP endpoints only; every file here is deployed as a function
  lib/auth.ts            requireUser() for every API function
  lib/automation/        csv.ts (cleanup), metrics.ts (calculations), storage.ts (uploads + profiles in Blobs),
                         report.ts (runs the agents in order, saves progress), feedback.ts (seller's research
                         and 30-day check-in, stored apart from the report); (planned) scheduled refresh
  lib/agents/            claude.ts (client + JSON helper), trendAnalyst.ts (+ reviewForecast),
                         marketResearcher.ts (web search), forecaster.ts
raw-data/                Local sales exports; gitignored except demo.csv
```

Shared code goes in `netlify/lib/`, never in `netlify/functions/`, so helpers are not deployed as endpoints.

## How the pieces fit

1. Upload page POSTs the CSV text to `/api/upload` (or sends `raw-data/demo.csv` via "Try the demo data").
2. **Automation** cleans the CSV, calculates metrics in code, and saves raw CSV, clean sales, and metrics to the `uploads` Blobs store under `<id>/`. Dashboard loads them from `/api/uploads/<id>`.
3. Report page POSTs `/api/reports/<id>`, which starts the `run-report-background` function. **Automation** runs Trend Analyst → Market Researcher (with the seller's own notes, if any) → Forecaster → Trend Analyst review, and saves progress after each step to the `reports` Blobs store.
4. Report page polls `GET /api/reports/<id>` every 3 seconds and shows each section as it finishes. `PATCH /api/reports/<id>` saves the seller's research or check-in to the `feedback` store.
5. Every `/api/*` function calls `requireUser()`; uploads store their `owner` and only that user can read them or their reports. `/api/profile` holds the Depop handle and latest upload id.

Login does not work under `netlify dev`; test it on a deploy preview.

AI Gateway rejects calls from `netlify dev` on this machine ("Mismatched source IP"), so test the agents on a deploy preview (open a PR) rather than locally.

## Rules

- **No secrets anywhere.** No API keys in code, config, commits, or `.env` files.
- **AI Gateway handles Claude credentials.** Create the client as `new Anthropic()` with no arguments, only inside Netlify Functions code. Never set `ANTHROPIC_API_KEY` or `ANTHROPIC_BASE_URL` yourself; a value you set overrides the gateway's.
- **Claude is never called from the browser.**
- **Keep automation and agents separate.** Agents receive prepared inputs and return results; they never read or write Blobs. Automation owns data cleanup, storage, and running the agents. Automation calls agents' exported functions; agents import only types from automation.
- **Keep code simple and readable.** Small files, plain functions, clear names, no clever abstractions.
- **raw-data/ is gitignored except `raw-data/demo.csv`.** Never commit a real seller export.

## Commands

```bash
npm install            # install dependencies
npx netlify dev        # run locally with Functions, Blobs, and AI Gateway (use this, not just `npm run dev`)
npm run build          # production build into dist/
npm run typecheck      # TypeScript check
npx netlify deploy --prod --build   # production deploy
```

AI Gateway only works after the site is linked (`npx netlify link` or `npx netlify init`) and has had at least one production deploy.
