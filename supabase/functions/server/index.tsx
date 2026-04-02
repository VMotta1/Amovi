import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { detectStudentDiscountOpportunities } from "../../../src/shared/studentDiscountDetector.ts";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b711015c/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/make-server-b711015c/student-discounts/detect", async (c) => {
  const body = await c.req.json();
  const opportunities = detectStudentDiscountOpportunities({
    transactions: Array.isArray(body?.transactions) ? body.transactions : [],
    country: typeof body?.country === "string" ? body.country : "US",
    displayCurrency: typeof body?.displayCurrency === "string" ? body.displayCurrency : "USD",
  });

  return c.json({ opportunities });
});

Deno.serve(app.fetch);
