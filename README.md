<p align="center">
  <img src="public/logo.svg" alt="Bambuu logo" width="160" />
</p> 

## Bambuu 🎍

Bambuu is a student-focused personal finance app built for users with irregular income, recurring subscriptions, and short-term savings goals.

Unlike traditional budgeting tools built around fixed monthly salaries, Bambuu is designed for part-time jobs, scholarships, allowances, and real student spending behaviour.

Check it out here: https://bambuu.me/

##  🍀 Key features 

- Transaction tracking for income and expenses
- Recurring transactions, including `biweekly` income
- Let users set specific savings goals and track progress (Our panda climbs each time you save!) with pinned priorities
- Budget category tracking
- Subscription management
- Advanced Data Visualisation and Spending Tips
- Student discount opportunity detection
- Investment insights: Tracking, Learning, and Tips
- Supports Different Currencies
- Bilingual Support (English/French)
- Transaction management and categorisation
- Dark Mode
- Clean and intuitive UI

## Why It Matters

Bambuu helps users answer the questions that matter most:

- How much money is actually coming in?
- What recurring payments are draining cash?
- Am I staying within budget?
- What am I saving toward?
- Where can I reduce costs?

This makes Bambuu more than an expense tracker. It is a practical money management product for a segment that is often underserved by traditional finance apps.

## 🛠️ Stack

- `React`
- `TypeScript`
- `Vite`
- `Supabase`
- `Tailwind CSS`
- `Recharts`

## Run Locally

### Prerequisites

- Node.js 18+
- A [Plaid](https://dashboard.plaid.com) account (Sandbox is free)
- A [Supabase](https://supabase.com) project

### 1. Clone and install frontend dependencies

```bash
git clone https://github.com/Zineb2a/Bambuu.git
cd Bambuu
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Start the Plaid backend

The backend is a small Express server that handles Plaid API calls securely.

```bash
cd server
npm install
```

Create a `.env` file inside the `server/` folder (or the root `.env` is loaded automatically):

```env
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox
```

Then start the server:

```bash
npm start
```

The backend will run at `http://localhost:3001`. You should see:

```
Bambu Plaid server running on http://localhost:3001
Plaid environment: sandbox
```

### 4. Start the frontend

In a separate terminal, from the project root:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### Linking a test bank account

In Plaid Sandbox, use these credentials when the Plaid Link modal opens:

- **Username:** `user_good`
- **Password:** `pass_good`

Or use a custom Plaid test user for more realistic transaction data. See the [Plaid Sandbox docs](https://plaid.com/docs/sandbox/) for details.

## GitHub Pages

This repo can be deployed to GitHub Pages as a static frontend. The included workflow is at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

Set these repository secrets before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (optional, only if you host the Plaid backend elsewhere)

If `VITE_API_BASE_URL` is not set, the app still deploys, but Plaid bank-linking features are disabled on GitHub Pages.

## Supabase Setup

1. Create or open a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql).
3. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Product Scope

Bambuu currently includes:

- authentication
- transactions
- recurring income and expenses
- savings goals and contributions
- budget categories
- subscriptions
- notifications
- analytics
- settings

## Future Developments? 
- Mobile app version using React Native for iOS and Android
- Banking API integration for automatic transaction import
- Enhanced discount detection with location-based offers near campuses
- Peer savings challenges to make financial goals social and motivating
- Financial literacy content tailored to student life stages
- Expense splitting features for group living situations and shared subscriptions

## Summary

Bambuu is a cleaner, more relevant finance experience for students and early-career users managing inconsistent income, recurring costs, and savings goals.
