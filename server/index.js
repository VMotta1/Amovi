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
      user: { client_user_id: "bambu-user-1" },
      client_name: "Bambu Budget",
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca, CountryCode.Us],
      language: "en",
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Error creating link token:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", plaid_env: process.env.PLAID_ENV });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Bambu Plaid server running on http://localhost:${PORT}`);
  console.log(`Plaid environment: ${process.env.PLAID_ENV}`);
});
