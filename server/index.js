import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(cors());
app.use(express.json());

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(config);

// In-memory store for access tokens (keyed by item_id)
const accessTokens = new Map();

// ---- Routes ----

// 1. Create a link token to initialize Plaid Link on the frontend
app.post("/api/plaid/create-link-token", async (_req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "amovi-user-1" },
      client_name: "Amovi",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    const plaidError = err.response?.data;
    console.error("Plaid link token error:", JSON.stringify(plaidError, null, 2) || err.message);
    res.status(500).json({
      error: plaidError?.error_message || err.message,
      error_code: plaidError?.error_code,
      error_type: plaidError?.error_type,
      display_message: plaidError?.display_message,
    });
  }
});

// Debug: test credentials and show exact Plaid error
app.get("/api/plaid/debug", async (_req, res) => {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV;
  res.json({
    plaid_env: env,
    client_id_set: !!clientId,
    client_id_prefix: clientId?.slice(0, 6) + "...",
    secret_set: !!secret,
    secret_length: secret?.length,
  });
});

// 2. Exchange a public token for an access token after Plaid Link succeeds
app.post("/api/plaid/exchange-token", async (req, res) => {
  try {
    const { public_token, metadata } = req.body;

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;
    accessTokens.set(item_id, access_token);

    // Get account details
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts.map((a) => ({
      account_id: a.account_id,
      name: a.name,
      official_name: a.official_name,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
      balances: a.balances,
    }));

    const institutionName =
      metadata?.institution?.name || "Linked Bank";

    res.json({
      item_id,
      institution_name: institutionName,
      accounts,
    });
  } catch (err) {
    console.error("Error exchanging token:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// 3. Fetch transactions for a linked item
app.get("/api/plaid/transactions/:item_id", async (req, res) => {
  try {
    const { item_id } = req.params;
    const access_token = accessTokens.get(item_id);

    if (!access_token) {
      return res.status(404).json({ error: "Item not found. Please re-link your account." });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    const response = await plaidClient.transactionsGet({
      access_token,
      start_date: startDate,
      end_date: endDate,
      options: { count: 100, offset: 0 },
    });

    const transactions = response.data.transactions.map((t) => ({
      transaction_id: t.transaction_id,
      account_id: t.account_id,
      amount: t.amount,
      date: t.date,
      name: t.name,
      merchant_name: t.merchant_name,
      category: t.personal_finance_category?.primary || t.category?.[0] || "Other",
      category_detailed: t.personal_finance_category?.detailed || t.category?.join(" > ") || "Other",
      pending: t.pending,
      iso_currency_code: t.iso_currency_code || "CAD",
      logo_url: t.logo_url,
    }));

    res.json({
      transactions,
      total_transactions: response.data.total_transactions,
    });
  } catch (err) {
    console.error("Error fetching transactions:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// 4. Remove a linked item
app.delete("/api/plaid/item/:item_id", async (req, res) => {
  try {
    const { item_id } = req.params;
    const access_token = accessTokens.get(item_id);

    if (access_token) {
      await plaidClient.itemRemove({ access_token });
      accessTokens.delete(item_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error removing item:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ── Sandbox: create a pre-loaded test account ─────────────────────────────────
// Bypasses Plaid Link UI entirely. Only works when PLAID_ENV=sandbox.
const TEST_OVERRIDE_ACCOUNTS = [
  {
    type: "depository",
    subtype: "checking",
    starting_balance: 3200,
    currency: "CAD",
    meta: { name: "Student Chequing" },
    transactions: [
      { date_transacted: "2026-03-15", date_posted: "2026-03-15", amount: 52.34,  description: "MAXI 4821 COTE-ST-LUC",               currency: "CAD" },
      { date_transacted: "2026-03-14", date_posted: "2026-03-14", amount: 5.25,   description: "CAFE DEPOT 142 MCGILL",                currency: "CAD" },
      { date_transacted: "2026-03-13", date_posted: "2026-03-13", amount: 43.99,  description: "AMAZON.CA MARKETPLACE",               currency: "CAD" },
      { date_transacted: "2026-03-12", date_posted: "2026-03-12", amount: 17.99,  description: "NETFLIX.COM",                         currency: "CAD" },
      { date_transacted: "2026-03-12", date_posted: "2026-03-12", amount: 94,     description: "STM OPUS MONTHLY PASS",               currency: "CAD" },
      { date_transacted: "2026-03-11", date_posted: "2026-03-11", amount: 71.45,  description: "IGA EXTRA MONKLAND",                  currency: "CAD" },
      { date_transacted: "2026-03-10", date_posted: "2026-03-10", amount: 38.20,  description: "JEAN COUTU COTE-DES-NEIGES",          currency: "CAD" },
      { date_transacted: "2026-03-09", date_posted: "2026-03-09", amount: 89.99,  description: "SIMONS EATON CENTRE MONTREAL",        currency: "CAD" },
      { date_transacted: "2026-03-08", date_posted: "2026-03-08", amount: 11.99,  description: "SPOTIFY CANADA",                      currency: "CAD" },
      { date_transacted: "2026-03-07", date_posted: "2026-03-07", amount: 3.99,   description: "ICLOUD APPLE.COM/BILL",               currency: "CAD" },
      { date_transacted: "2026-03-06", date_posted: "2026-03-06", amount: 31.45,  description: "UBER EATS CA",                        currency: "CAD" },
      { date_transacted: "2026-03-05", date_posted: "2026-03-05", amount: 9.99,   description: "CRAVE.CA",                            currency: "CAD" },
      { date_transacted: "2026-03-04", date_posted: "2026-03-04", amount: 950,    description: "E-TRANSFER RENT MARCH",               currency: "CAD" },
      { date_transacted: "2026-03-03", date_posted: "2026-03-03", amount: 42.50,  description: "SAQ STORE 421 MONTREAL",              currency: "CAD" },
      { date_transacted: "2026-03-02", date_posted: "2026-03-02", amount: 6.75,   description: "TIM HORTONS #1903",                   currency: "CAD" },
      { date_transacted: "2026-03-01", date_posted: "2026-03-01", amount: 16.99,  description: "XBOX GAME PASS",                      currency: "CAD" },
      { date_transacted: "2026-03-01", date_posted: "2026-03-01", amount: -1500,  description: "PART TIME JOB DEPOSIT",               currency: "CAD" },
      { date_transacted: "2026-03-01", date_posted: "2026-03-01", amount: -750,   description: "GRANT DEPOSIT",                       currency: "CAD" },
      { date_transacted: "2026-02-28", date_posted: "2026-02-28", amount: 64.78,  description: "METRO PLUS COTE-ST-LUC",              currency: "CAD" },
      { date_transacted: "2026-02-27", date_posted: "2026-02-27", amount: 28.50,  description: "CINEPLEX ODEON MONTREAL",             currency: "CAD" },
      { date_transacted: "2026-02-26", date_posted: "2026-02-26", amount: 7.25,   description: "TIM HORTONS #2841",                   currency: "CAD" },
      { date_transacted: "2026-02-25", date_posted: "2026-02-25", amount: 32.99,  description: "CHAPTERS INDIGO MCGILL COLLEGE",      currency: "CAD" },
      { date_transacted: "2026-02-24", date_posted: "2026-02-24", amount: 27.60,  description: "UBER EATS CA",                        currency: "CAD" },
      { date_transacted: "2026-02-23", date_posted: "2026-02-23", amount: 5.50,   description: "CAFE DEPOT 142 MCGILL",               currency: "CAD" },
      { date_transacted: "2026-02-22", date_posted: "2026-02-22", amount: 55.32,  description: "IGA EXTRA MONKLAND",                  currency: "CAD" },
      { date_transacted: "2026-02-21", date_posted: "2026-02-21", amount: 22.45,  description: "PHARMAPRIX 3420 SHERBROOKE",          currency: "CAD" },
      { date_transacted: "2026-02-20", date_posted: "2026-02-20", amount: 67.49,  description: "AMAZON.CA MARKETPLACE",               currency: "CAD" },
      { date_transacted: "2026-02-19", date_posted: "2026-02-19", amount: 48.90,  description: "MAXI 4821 COTE-ST-LUC",               currency: "CAD" },
      { date_transacted: "2026-02-18", date_posted: "2026-02-18", amount: 17.99,  description: "NETFLIX.COM",                         currency: "CAD" },
      { date_transacted: "2026-02-17", date_posted: "2026-02-17", amount: 124.99, description: "SIMONS SAINTE-CATHERINE MONTREAL",    currency: "CAD" },
      { date_transacted: "2026-02-16", date_posted: "2026-02-16", amount: 38,     description: "SAQ STORE 421 MONTREAL",              currency: "CAD" },
      { date_transacted: "2026-02-15", date_posted: "2026-02-15", amount: -750,   description: "PART TIME JOB DEPOSIT",               currency: "CAD" },
      { date_transacted: "2026-02-14", date_posted: "2026-02-14", amount: 18.50,  description: "BOULANGERIE PREMIERE MOISSON",        currency: "CAD" },
      { date_transacted: "2026-02-13", date_posted: "2026-02-13", amount: 11.99,  description: "SPOTIFY CANADA",                      currency: "CAD" },
      { date_transacted: "2026-02-12", date_posted: "2026-02-12", amount: 3.99,   description: "ICLOUD APPLE.COM/BILL",               currency: "CAD" },
      { date_transacted: "2026-02-11", date_posted: "2026-02-11", amount: 35.20,  description: "UBER EATS CA",                        currency: "CAD" },
      { date_transacted: "2026-02-10", date_posted: "2026-02-10", amount: 9.99,   description: "CRAVE.CA",                            currency: "CAD" },
      { date_transacted: "2026-02-09", date_posted: "2026-02-09", amount: 14.75,  description: "STARBUCKS PEEL STREET",               currency: "CAD" },
      { date_transacted: "2026-02-08", date_posted: "2026-02-08", amount: 16.99,  description: "XBOX GAME PASS",                      currency: "CAD" },
      { date_transacted: "2026-02-07", date_posted: "2026-02-07", amount: 94,     description: "STM OPUS MONTHLY PASS",               currency: "CAD" },
      { date_transacted: "2026-02-06", date_posted: "2026-02-06", amount: 15,     description: "BOULANGERIE PREMIERE MOISSON",        currency: "CAD" },
      { date_transacted: "2026-02-05", date_posted: "2026-02-05", amount: 5.25,   description: "TIM HORTONS #4821",                   currency: "CAD" },
      { date_transacted: "2026-02-04", date_posted: "2026-02-04", amount: 950,    description: "E-TRANSFER RENT FEBRUARY",            currency: "CAD" },
      { date_transacted: "2026-02-03", date_posted: "2026-02-03", amount: 29.99,  description: "JEAN COUTU COTE-DES-NEIGES",          currency: "CAD" },
      { date_transacted: "2026-02-02", date_posted: "2026-02-02", amount: 42.15,  description: "METRO PLUS COTE-ST-LUC",              currency: "CAD" },
      { date_transacted: "2026-02-01", date_posted: "2026-02-01", amount: -1500,  description: "PART TIME JOB DEPOSIT",               currency: "CAD" },
      { date_transacted: "2026-01-31", date_posted: "2026-01-31", amount: 78.43,  description: "IGA EXTRA MONKLAND",                  currency: "CAD" },
      { date_transacted: "2026-01-30", date_posted: "2026-01-30", amount: 11.99,  description: "SPOTIFY CANADA",                      currency: "CAD" },
      { date_transacted: "2026-01-29", date_posted: "2026-01-29", amount: 6.25,   description: "CAFE DEPOT MCGILL COLLEGE",           currency: "CAD" },
      { date_transacted: "2026-01-28", date_posted: "2026-01-28", amount: 53.67,  description: "MAXI 4821 COTE-ST-LUC",               currency: "CAD" },
      { date_transacted: "2026-01-27", date_posted: "2026-01-27", amount: 34.99,  description: "AMAZON.CA MARKETPLACE",               currency: "CAD" },
      { date_transacted: "2026-01-26", date_posted: "2026-01-26", amount: 3.99,   description: "ICLOUD APPLE.COM/BILL",               currency: "CAD" },
      { date_transacted: "2026-01-25", date_posted: "2026-01-25", amount: 12.50,  description: "BOULANGERIE PREMIERE MOISSON",        currency: "CAD" },
      { date_transacted: "2026-01-24", date_posted: "2026-01-24", amount: 52,     description: "SAQ STORE 421 MONTREAL",              currency: "CAD" },
      { date_transacted: "2026-01-23", date_posted: "2026-01-23", amount: 41.20,  description: "PHARMAPRIX 3420 SHERBROOKE",          currency: "CAD" },
      { date_transacted: "2026-01-22", date_posted: "2026-01-22", amount: 29.45,  description: "UBER EATS CA",                        currency: "CAD" },
      { date_transacted: "2026-01-21", date_posted: "2026-01-21", amount: 54.99,  description: "CHAPTERS INDIGO MCGILL COLLEGE",      currency: "CAD" },
      { date_transacted: "2026-01-20", date_posted: "2026-01-20", amount: 79.99,  description: "SIMONS EATON CENTRE MONTREAL",        currency: "CAD" },
      { date_transacted: "2026-01-19", date_posted: "2026-01-19", amount: 17.99,  description: "NETFLIX.COM",                         currency: "CAD" },
      { date_transacted: "2026-01-18", date_posted: "2026-01-18", amount: 32,     description: "CINEPLEX ODEON MONTREAL",             currency: "CAD" },
      { date_transacted: "2026-01-17", date_posted: "2026-01-17", amount: 11.25,  description: "STARBUCKS PEEL STREET",               currency: "CAD" },
      { date_transacted: "2026-01-16", date_posted: "2026-01-16", amount: 9.99,   description: "CRAVE.CA",                            currency: "CAD" },
      { date_transacted: "2026-01-15", date_posted: "2026-01-15", amount: -750,   description: "PART TIME JOB DEPOSIT",               currency: "CAD" },
      { date_transacted: "2026-01-14", date_posted: "2026-01-14", amount: 16.99,  description: "XBOX GAME PASS",                      currency: "CAD" },
      { date_transacted: "2026-01-13", date_posted: "2026-01-13", amount: 7.50,   description: "TIM HORTONS #4821",                   currency: "CAD" },
      { date_transacted: "2026-01-12", date_posted: "2026-01-12", amount: 59.21,  description: "METRO PLUS COTE-ST-LUC",              currency: "CAD" },
      { date_transacted: "2026-01-11", date_posted: "2026-01-11", amount: 38.75,  description: "UBER EATS CA",                        currency: "CAD" },
      { date_transacted: "2026-01-10", date_posted: "2026-01-10", amount: 33.60,  description: "JEAN COUTU COTE-DES-NEIGES",          currency: "CAD" },
      { date_transacted: "2026-01-09", date_posted: "2026-01-09", amount: 89.95,  description: "AMAZON.CA MARKETPLACE",               currency: "CAD" },
      { date_transacted: "2026-01-07", date_posted: "2026-01-07", amount: 94,     description: "STM OPUS MONTHLY PASS",               currency: "CAD" },
      { date_transacted: "2026-01-06", date_posted: "2026-01-06", amount: 15,     description: "BOULANGERIE PREMIERE MOISSON",        currency: "CAD" },
      { date_transacted: "2026-01-05", date_posted: "2026-01-05", amount: 44.32,  description: "MAXI 4821 COTE-ST-LUC",               currency: "CAD" },
      { date_transacted: "2026-01-04", date_posted: "2026-01-04", amount: 950,    description: "E-TRANSFER RENT JANUARY",             currency: "CAD" },
      { date_transacted: "2026-01-03", date_posted: "2026-01-03", amount: 5.75,   description: "TIM HORTONS #2105",                   currency: "CAD" },
      { date_transacted: "2026-01-02", date_posted: "2026-01-02", amount: 39.50,  description: "SAQ STORE 421 MONTREAL",              currency: "CAD" },
      { date_transacted: "2026-01-01", date_posted: "2026-01-01", amount: -1500,  description: "PART TIME JOB DEPOSIT",               currency: "CAD" },
    ],
  },
];

app.post("/api/plaid/sandbox/create-test-token", async (_req, res) => {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return res.status(403).json({ error: "Test token endpoint only available in sandbox mode." });
  }
  try {
    const response = await plaidClient.sandboxPublicTokenCreate({
      institution_id: "ins_109508", // First Platypus Bank (Plaid sandbox)
      initial_products: [Products.Transactions],
      options: { override_accounts: TEST_OVERRIDE_ACCOUNTS },
    });
    res.json({ public_token: response.data.public_token });
  } catch (err) {
    console.error("Error creating sandbox test token:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", plaid_env: process.env.PLAID_ENV });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Amovi Plaid server running on http://localhost:${PORT}`);
  console.log(`Plaid environment: ${process.env.PLAID_ENV}`);
});
