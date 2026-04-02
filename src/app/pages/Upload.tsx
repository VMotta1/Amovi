import { useState, useRef } from "react";
import { useNavigate } from "react-router";

interface Transaction {
  date: string;
  description: string;
  amount: number;
}

const SAMPLE_CSV = `date,description,amount
2024-03-01,SPOTIFY AB,12.69
2024-03-03,NETFLIX.COM,20.99
2024-03-05,ADOBE SYSTEMS,89.99
2024-03-07,AMAZON PRIME,9.99
2024-03-10,NORDVPN,15.99
2024-03-15,YOUTUBE PREMIUM,13.99`;

const EMPTY_ROW: Transaction = { date: "", description: "", amount: 0 };

function parseCSV(text: string): Transaction[] {
  const lines = text.trim().split("\n");
  const header = lines[0].toLowerCase().split(",");
  const dateIdx = header.findIndex((h) => h.trim() === "date");
  const descIdx = header.findIndex((h) => h.trim() === "description");
  const amtIdx = header.findIndex((h) => h.trim() === "amount");

  return lines.slice(1).reduce<Transaction[]>((acc, line) => {
    const cols = line.split(",");
    const amount = parseFloat(cols[amtIdx]?.trim() ?? "0");
    if (!isNaN(amount)) {
      acc.push({
        date: cols[dateIdx]?.trim() ?? "",
        description: cols[descIdx]?.trim() ?? "",
        amount,
      });
    }
    return acc;
  }, []);
}

export default function Upload() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"csv" | "manual">("csv");
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");
  const [rows, setRows] = useState<Transaction[]>([
    { ...EMPTY_ROW },
    { ...EMPTY_ROW },
    { ...EMPTY_ROW },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setCsvError("");
    };
    reader.readAsText(file);
  }

  function loadSample() {
    setCsvText(SAMPLE_CSV);
    setCsvError("");
  }

  function updateRow(idx: number, field: keyof Transaction, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        [field]: field === "amount" ? parseFloat(value) || 0 : value,
      };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function analyze() {
    setError("");
    let transactions: Transaction[] = [];

    if (tab === "csv") {
      if (!csvText.trim()) {
        setCsvError("Please upload a CSV file or paste CSV data.");
        return;
      }
      try {
        transactions = parseCSV(csvText);
        if (transactions.length === 0) {
          setCsvError("No valid transactions found. Check the CSV format.");
          return;
        }
      } catch {
        setCsvError("Failed to parse CSV. Make sure columns are: date, description, amount.");
        return;
      }
    } else {
      transactions = rows.filter((r) => r.description.trim() && r.amount > 0);
      if (transactions.length === 0) {
        setError("Add at least one transaction with a description and amount.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      navigate("/results", { state: { results: data } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10.5 6H14L10.5 9.5L12 14L8 11.5L4 14L5.5 9.5L2 6H5.5L8 1Z" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">Amovi</span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Student discount finder
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
          Stop overpaying for{" "}
          <span className="text-primary">subscriptions</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Upload your bank transactions and we'll instantly find every subscription
          where a student discount could save you money.
        </p>
      </section>

      {/* Card */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-primary/5">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("csv")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                tab === "csv"
                  ? "text-foreground border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              CSV Upload
            </button>
            <button
              onClick={() => setTab("manual")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                tab === "manual"
                  ? "text-foreground border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual Entry
            </button>
          </div>

          <div className="p-6">
            {tab === "csv" ? (
              <div className="space-y-4">
                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <svg className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {csvText ? "CSV loaded ✓" : "Click to upload CSV"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Columns: <code className="bg-secondary px-1 rounded">date, description, amount</code>
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Or paste */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
                    Or paste CSV directly
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => { setCsvText(e.target.value); setCsvError(""); }}
                    placeholder={`date,description,amount\n2024-03-01,SPOTIFY AB,12.69`}
                    rows={5}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                <button
                  onClick={loadSample}
                  className="text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  Load sample data
                </button>

                {csvError && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {csvError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">
                  <span>Date</span>
                  <span>Description</span>
                  <span>Amount (CAD)</span>
                  <span />
                </div>
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-center">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(i, "date", e.target.value)}
                      className="bg-secondary border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(i, "description", e.target.value)}
                      placeholder="e.g. SPOTIFY AB"
                      className="bg-secondary border border-border rounded-lg px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <input
                      type="number"
                      value={row.amount || ""}
                      onChange={(e) => updateRow(i, "amount", e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="bg-secondary border border-border rounded-lg px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => removeRow(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={addRow}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 mt-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add row
                </button>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={analyze}
              disabled={loading}
              className="mt-6 w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing transactions…
                </>
              ) : (
                <>
                  Analyze My Transactions
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "📤", title: "Upload", desc: "Import a CSV or type transactions manually" },
            { icon: "🤖", title: "AI Analysis", desc: "Claude detects subscription patterns automatically" },
            { icon: "💰", title: "Save", desc: "See exactly how to claim each student deal" },
          ].map((step) => (
            <div key={step.title} className="p-4">
              <div className="text-2xl mb-2">{step.icon}</div>
              <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
