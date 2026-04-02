<div align="center">

<img src="public/amovi-icon.svg" width="72" alt="Amovi" />

# AMOVI

**The student finance app that pays you back.**

Amovi connects to your real bank account, tracks every transaction, and automatically finds every student discount you're missing — using Claude AI and live web search.

[http://localhost:5301](http://localhost:5301) · Built for students · Powered by Anthropic Claude

</div>

---

## Why Amovi

Most finance apps are built for people with stable salaries, fixed budgets, and no student debt. That's not most students.

Amovi is built around how students actually live — part-time jobs with variable hours, biweekly paycheques, scholarships and grants, recurring subscriptions, and a constant question: *am I overpaying for something I could get cheaper?*

The core insight: students leave hundreds of dollars on the table every year by paying full price for services that have student plans. Amovi finds those automatically.

---

## What Amovi does

| Feature | Description |
|---|---|
| **Bank connection** | Connect your real bank via Plaid — transactions import automatically |
| **Spending dashboard** | Monthly income vs. expenses, top categories, savings goal progress |
| **Transaction history** | Full searchable, filterable, sortable transaction log with category labels |
| **Subscriptions** | Track every recurring payment in one place |
| **Student Discount Detector** | AI scans every transaction and flags services with cheaper student pricing |
| **AI Discount Scanner** | Upload a CSV for a one-off deep scan with Claude + live web search |
| **Investments** | Track holdings, learn concepts, and get tips |
| **Settings** | Profile, currency, language, dark/light mode, Plaid reconnect |
| **Bilingual** | Full English and French support |

---

## The discount detection pipeline

When you open the Subscriptions page, Amovi runs three passes on your Plaid data:

```
Your real bank transactions (via Plaid)
            │
            ▼
    1. Claude AI (claude-sonnet-4-5)
       Scans every merchant — not just subscriptions —
       for anything that could have a student price.
            │
            ▼
    2. discounts.csv + rapidfuzz
       Fuzzy-matches against 24 verified student deals:
       Spotify, Adobe, Amazon, GitHub, DoorDash, Nike,
       Grammarly, Canva, JetBrains, Microsoft, and more.
            │
            ▼
    3. Claude Web Search (claude-opus-4-5)
       For anything not in the CSV, searches the live
       web for a current student price and claim URL.
            │
            ▼
       Results shown in Subscriptions with monthly
       and yearly savings, a direct claim link, and
       a "Web search" badge for live-sourced deals.
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Charts | Recharts |
| Auth & DB | Supabase (Postgres + Row Level Security) |
| Bank data | Plaid Link |
| AI backend | Python, FastAPI, Anthropic Claude API |
| Fuzzy matching | `rapidfuzz` — partial ratio ≥ 70 threshold |
| Discount data | `discounts.csv` — 24 verified student deals |

---

## Running locally

You need three services running at the same time:

| Service | Port | Purpose |
|---|---|---|
| Frontend (Vite) | 5301 | The React app |
| Plaid server | 3001 | Proxies Plaid API calls securely |
| AI backend | 8000 | Claude + discount matching |

### Prerequisites

- Node.js 18+
- Python 3.12+
- A [Supabase](https://supabase.com) project
- A [Plaid](https://dashboard.plaid.com) account (Sandbox is free)
- An [Anthropic API key](https://console.anthropic.com/)

---

### 1. Clone and install

```bash
git clone https://github.com/VMotta1/Amovi.git
cd Amovi
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret
PLAID_ENV=sandbox
```

### 3. Start the Plaid server

```bash
cd server
npm install
node index.js
# → Amovi Plaid server running on http://localhost:3001
```

### 4. Start the AI backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your ANTHROPIC_API_KEY
/Library/Frameworks/Python.framework/Versions/3.12/bin/uvicorn main:app --reload --port 8000
# → Uvicorn running on http://127.0.0.1:8000
```

### 5. Start the frontend

```bash
npm run dev -- --port 5301
```

Open [http://localhost:5301](http://localhost:5301).

---

## Linking a test bank account

When the Plaid Link modal opens, use:

- **Username:** `user_good`
- **Password:** `pass_good`

For a realistic student dataset (Spotify, Netflix, Xbox, iCloud, Uber Eats, Amazon, Montreal groceries, rent, part-time job deposits), see the sample data in `discounts.csv` and the Plaid override JSON in `server/index.js`.

---

## Supabase setup

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL editor
3. Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into `.env`

---

## Discount database

The file `backend/discounts.csv` drives the fuzzy matcher. Each row has a brand, pipe-separated aliases, discount type, student price, eligibility, and a source URL. Adding a new deal requires only a new CSV row — no code changes needed.

**Current brands:** Adobe, Microsoft, Notion, Figma, Miro, GitHub, JetBrains, Grammarly, Autodesk, Spotify, YouTube, Hulu, Apple Music, Paramount+, Amazon, DoorDash, Samsung, Dell, Nike, Levi's, ChatGPT, Canva, Uber, Apple

---

## GitHub Pages deployment

The repo includes a deploy workflow at `.github/workflows/deploy-pages.yml`. Set these repository secrets before deploying:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_BASE_URL   ← optional, Plaid is disabled if not set
```

---

## What's next

- Mobile app (React Native) for iOS and Android
- Push notifications for bill due dates and budget alerts
- Location-aware deals near university campuses
- Peer savings challenges and shared financial goals
- Expense splitting for roommates and group subscriptions
- Expanded discount database with automated weekly verification

---

## Project structure

```
Amovi/
├── src/
│   ├── app/
│   │   ├── pages/        # Home, Transactions, Subscriptions, Settings,
│   │   │                 # Auth, Investments, Upload, Results
│   │   ├── components/   # Layout, Navigation, StudentDiscountDetectorCard
│   │   ├── hooks/        # usePlaidData, useUserCurrency, ...
│   │   ├── lib/          # Supabase, Plaid, finance, studentDiscounts
│   │   └── i18n/         # English + French translations
│   └── shared/
│       ├── studentDiscountCatalog.ts   # 51-entry frontend fallback catalog
│       └── studentDiscountDetector.ts  # Local fuzzy detector (no backend)
├── backend/
│   ├── main.py           # FastAPI — 3-pass detection pipeline
│   ├── matcher.py        # rapidfuzz CSV matcher
│   └── discounts.csv     # 24-brand student discount database
├── server/
│   └── index.js          # Plaid Link token + exchange proxy
└── public/
    └── amovi-icon.svg
```
