"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Account, Strategy } from "@/lib/types/database";
import { FIELD_OPTIONS, type FieldKey } from "@/lib/import/fields";
import { parseCsv, autoMap } from "@/lib/import/parse";
import {
  buildTrades,
  type BuildResult,
  type ImportTimezone,
} from "@/lib/import/transform";
import {
  isTradingViewExport,
  symbolFromFilename,
  inferRiskFromStops,
  buildTradingViewTrades,
} from "@/lib/import/sources/tradingview";
import { resolveStrategies, insertTrades, type InsertResult } from "@/lib/import/import";
import { formatPnL } from "@/lib/utils/format";

type ImportStep = "upload" | "mapping" | "preview" | "complete";

type Market = "crypto" | "forex" | "stocks" | "futures" | "options";

/**
 * Each source needs its own shaping before the generic preview. Adding a
 * broker later means a new entry here plus a module under import/sources.
 */
type ImportSource = "generic" | "tradingview";

const SOURCE_OPTIONS = [
  { value: "generic", label: "Generic CSV (Notion, Excel, custom)" },
  { value: "tradingview", label: "TradingView (Strategy Tester / Replay)" },
];

const MARKET_OPTIONS = [
  { value: "crypto", label: "Crypto" },
  { value: "forex", label: "Forex" },
  { value: "stocks", label: "Stocks" },
  { value: "futures", label: "Futures" },
  { value: "options", label: "Options" },
];

const NEW_STRATEGY = "__new__";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "funded", label: "Funded" },
  { value: "demo", label: "Demo" },
  { value: "backtest", label: "Backtest" },
];

const REQUIRED_FIELDS: FieldKey[] = ["security", "entry_date"];

export default function ImportPage() {
  const supabase = createClient();

  const [step, setStep] = useState<ImportStep>("upload");
  const [source, setSource] = useState<ImportSource>("generic");

  // TradingView exports carry no instrument, timeframe or risk, so those are
  // collected on the details step instead of mapped from columns.
  const [tvSecurity, setTvSecurity] = useState("");
  const [tvTimeframe, setTvTimeframe] = useState("");
  // Picked from existing strategies, NEW_STRATEGY, or "" for none. Free text
  // would fork a backtest in two on any spelling variation between sessions.
  const [tvStrategyChoice, setTvStrategyChoice] = useState("");
  const [tvStrategy, setTvStrategy] = useState("");
  const [tvRisk, setTvRisk] = useState("");
  const [tvInferredRisk, setTvInferredRisk] = useState<number | null>(null);

  // Inline account creation
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCapital, setNewAccountCapital] = useState("");
  const [newAccountType, setNewAccountType] = useState("backtest");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Upload
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [targetAccountId, setTargetAccountId] = useState("");
  const [defaultMarket, setDefaultMarket] = useState<Market>("crypto");
  const [timezone, setTimezone] = useState<ImportTimezone>("local");

  // Parsed CSV
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "">>({});

  // Preview
  const [build, setBuild] = useState<BuildResult | null>(null);

  // Import
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<InsertResult | null>(null);

  // Read after mount: the server's offset is not the browser's, and rendering
  // it during SSR would mismatch on hydration.
  const [localOffset, setLocalOffset] = useState("");
  useEffect(() => {
    const mins = -new Date().getTimezoneOffset();
    const sign = mins >= 0 ? "+" : "-";
    const h = Math.floor(Math.abs(mins) / 60);
    const m = Math.abs(mins) % 60;
    setLocalOffset(`UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`);
  }, []);

  // Fetch active accounts for the target-account selector.
  useEffect(() => {
    async function fetchAccounts() {
      const { data } = (await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("name")) as { data: Account[] | null };
      if (data) {
        setAccounts(data);
        const def = data.find((a) => a.is_default) ?? data[0];
        if (def) setTargetAccountId(def.id);
      }
    }
    fetchAccounts();
  }, [supabase]);

  // Existing strategies, so a repeat import lands on the same one.
  useEffect(() => {
    async function fetchStrategies() {
      const { data } = await supabase
        .from("strategies")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (data) setStrategies(data);
    }
    fetchStrategies();
  }, [supabase]);

  const selectedAccount = accounts.find((a) => a.id === targetAccountId) ?? null;

  const steps: { id: ImportStep; label: string }[] = [
    { id: "upload", label: "Upload" },
    {
      id: "mapping",
      label: source === "tradingview" ? "Trade Details" : "Map Columns",
    },
    { id: "preview", label: "Preview" },
    { id: "complete", label: "Complete" },
  ];

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      setAccountError("Give the account a name.");
      return;
    }
    setAccountSaving(true);
    setAccountError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAccountError("You must be signed in to create an account.");
        return;
      }

      const capital = parseFloat(newAccountCapital) || 0;
      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: newAccountName.trim(),
          initial_capital: capital,
          current_balance: capital,
          account_type: newAccountType as Account["account_type"],
        })
        .select("*")
        .single();

      if (error) throw error;

      setAccounts((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setTargetAccountId(data.id);
      setCreatingAccount(false);
      setNewAccountName("");
      setNewAccountCapital("");
    } catch (err) {
      setAccountError(
        err instanceof Error ? err.message : "Failed to create account."
      );
    } finally {
      setAccountSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParseError(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const { headers: hdrs, rows: parsedRows } = await parseCsv(file);
      if (hdrs.length === 0 || parsedRows.length === 0) {
        setParseError("No data found in this CSV. Make sure it has a header row and at least one trade.");
        return;
      }
      setHeaders(hdrs);
      setRows(parsedRows);

      // Trust the file's own shape over the dropdown — a TradingView export
      // cannot be column-mapped, so detection wins either way.
      const looksLikeTradingView = isTradingViewExport(hdrs);
      if (looksLikeTradingView) {
        setSource("tradingview");
        setTvSecurity((prev) => prev || symbolFromFilename(file.name) || "");
        const risk = inferRiskFromStops(parsedRows, hdrs);
        setTvInferredRisk(risk);
        setTvRisk((prev) => prev || (risk != null ? String(risk) : ""));
      } else {
        if (source === "tradingview") setSource("generic");
        setMapping(autoMap(hdrs));
      }

      setStep("mapping");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse CSV file.");
    } finally {
      setParsing(false);
    }
  };

  const mappedFields = Object.values(mapping);
  const missingRequired = REQUIRED_FIELDS.filter((k) => !mappedFields.includes(k));

  /**
   * resolveStrategies matches on name, so handing back an existing strategy's
   * exact name reuses it rather than creating a near-duplicate.
   */
  const tvStrategyName =
    tvStrategyChoice === NEW_STRATEGY
      ? tvStrategy.trim() || null
      : tvStrategyChoice
        ? (strategies.find((s) => s.id === tvStrategyChoice)?.name ?? null)
        : null;

  const tvDetailsIncomplete =
    !tvSecurity.trim() ||
    (tvStrategyChoice === NEW_STRATEGY && !tvStrategy.trim());

  const handlePreview = () => {
    const balance = selectedAccount?.current_balance ?? 0;

    if (source === "tradingview") {
      setBuild(
        buildTradingViewTrades(rows, headers, {
          security: tvSecurity.trim(),
          market: defaultMarket,
          timeframe: tvTimeframe.trim() || null,
          strategyName: tvStrategyName,
          riskAmount: tvRisk ? parseFloat(tvRisk) : null,
          timezone,
          accountBalance: balance,
        })
      );
    } else {
      setBuild(
        buildTrades(rows, mapping, {
          accountBalance: balance,
          defaultMarket,
          timezone,
        })
      );
    }

    setStep("preview");
  };

  const handleImport = async () => {
    if (!build || !targetAccountId) return;
    setImporting(true);
    setResult(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setResult({ inserted: 0, failed: build.valid.length, error: "You must be signed in to import." });
        setStep("complete");
        return;
      }

      const strategyMap = await resolveStrategies(supabase, user.id, build.strategyNames);
      const res = await insertTrades(supabase, user.id, targetAccountId, build.valid, strategyMap);
      setResult(res);
      setStep("complete");

      // A strategy created by this import should be pickable on the next one.
      const { data: refreshed } = await supabase
        .from("strategies")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (refreshed) setStrategies(refreshed);
    } catch (err) {
      setResult({
        inserted: 0,
        failed: build.valid.length,
        error: err instanceof Error ? err.message : "Import failed.",
      });
      setStep("complete");
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setBuild(null);
    setResult(null);
    setParseError(null);
    setTvSecurity("");
    setTvTimeframe("");
    setTvStrategy("");
    setTvStrategyChoice("");
    setTvRisk("");
    setTvInferredRisk(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Import Trades" description="Import trades from CSV files (Notion, Excel, etc.)" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {steps.map((s, index) => {
              const currentIndex = steps.findIndex((x) => x.id === step);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === s.id
                        ? "bg-primary text-primary-foreground"
                        : currentIndex > index
                        ? "bg-green text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentIndex > index ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      step === s.id ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Upload */}
          {step === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Upload a CSV file exported from Notion, Excel, or any other source
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="source">Data source</Label>
                  <Select
                    id="source"
                    options={SOURCE_OPTIONS}
                    value={source}
                    onChange={(e) => setSource(e.target.value as ImportSource)}
                  />
                  <p className="text-xs text-muted-foreground">
                    TradingView exports one row per fill; they are paired into
                    single trades automatically. Detected from the file too.
                  </p>
                </div>

                <div
                  className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">
                    {file ? file.name : "Drop your CSV file here"}
                  </p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {parseError && (
                  <div className="flex items-center gap-3 p-4 bg-red/10 border border-red/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red shrink-0" />
                    <p className="text-sm text-red">{parseError}</p>
                  </div>
                )}

                {file && (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <FileText className="h-8 w-8 text-blue" />
                      <div className="flex-1">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    {/* Target account + default market */}
                    {creatingAccount ? (
                      <div className="space-y-4 p-4 border rounded-lg">
                        <p className="font-medium text-sm">New account</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-account-name">Name *</Label>
                            <Input
                              id="new-account-name"
                              placeholder="EMA Ribbon Backtest"
                              value={newAccountName}
                              onChange={(e) => setNewAccountName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-account-capital">Starting capital</Label>
                            <Input
                              id="new-account-capital"
                              type="number"
                              step="0.01"
                              placeholder="100.00"
                              value={newAccountCapital}
                              onChange={(e) => setNewAccountCapital(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-account-type">Type</Label>
                            <Select
                              id="new-account-type"
                              options={ACCOUNT_TYPE_OPTIONS}
                              value={newAccountType}
                              onChange={(e) => setNewAccountType(e.target.value)}
                            />
                          </div>
                        </div>
                        {accountError && (
                          <p className="text-sm text-red">{accountError}</p>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCreatingAccount(false);
                              setAccountError(null);
                            }}
                            disabled={accountSaving}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleCreateAccount} disabled={accountSaving}>
                            {accountSaving && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Create account
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="account">Import into account *</Label>
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={() => setCreatingAccount(true)}
                            >
                              + New account
                            </button>
                          </div>
                          {accounts.length === 0 ? (
                            <div className="flex items-center gap-2 p-3 bg-yellow/10 border border-yellow/30 rounded-lg">
                              <AlertTriangle className="h-4 w-4 text-yellow shrink-0" />
                              <p className="text-xs">
                                No accounts yet — create one above to continue.
                              </p>
                            </div>
                          ) : (
                            <Select
                              id="account"
                              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                              value={targetAccountId}
                              onChange={(e) => setTargetAccountId(e.target.value)}
                            />
                          )}
                          {selectedAccount && (
                            <p className="text-xs text-muted-foreground">
                              Balance ${selectedAccount.current_balance.toFixed(2)} — used to derive
                              missing P&amp;L % / Risk %.
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="market">Default market</Label>
                          <Select
                            id="market"
                            options={MARKET_OPTIONS}
                            value={defaultMarket}
                            onChange={(e) => setDefaultMarket(e.target.value as Market)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Applied when a row has no market column.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timezone">Timestamps are in</Label>
                          <Select
                            id="timezone"
                            options={[
                              {
                                value: "local",
                                label: localOffset
                                  ? `My local time (${localOffset})`
                                  : "My local time",
                              },
                              { value: "utc", label: "UTC" },
                            ]}
                            value={timezone}
                            onChange={(e) =>
                              setTimezone(e.target.value as ImportTimezone)
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Times without a zone are read this way. Affects the
                            session each trade lands in.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleParse}
                        disabled={parsing || !targetAccountId || accounts.length === 0}
                      >
                        {parsing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2a: TradingView details — these are not in the export */}
          {step === "mapping" && source === "tradingview" && (
            <Card>
              <CardHeader>
                <CardTitle>Trade Details</CardTitle>
                <CardDescription>
                  Paired {rows.length} rows into {Math.ceil(rows.length / 2)} trades.
                  TradingView does not export the instrument, timeframe or risk, so
                  add them here — they apply to every trade in this file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tv-security">Security / symbol *</Label>
                    <Input
                      id="tv-security"
                      placeholder="NEARUSDT.P"
                      value={tvSecurity}
                      onChange={(e) => setTvSecurity(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Read from the filename — edit if it guessed wrong.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tv-timeframe">Timeframe</Label>
                    <Input
                      id="tv-timeframe"
                      placeholder="5m"
                      value={tvTimeframe}
                      onChange={(e) => setTvTimeframe(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tv-strategy">Strategy</Label>
                    <Select
                      id="tv-strategy"
                      options={[
                        { value: "", label: "— No Strategy —" },
                        ...strategies.map((s) => ({ value: s.id, label: s.name })),
                        { value: NEW_STRATEGY, label: "+ Create new strategy…" },
                      ]}
                      value={tvStrategyChoice}
                      onChange={(e) => setTvStrategyChoice(e.target.value)}
                    />
                    {tvStrategyChoice === NEW_STRATEGY ? (
                      <>
                        <Input
                          placeholder="50+200 EMA Ribbon Pullback"
                          value={tvStrategy}
                          onChange={(e) => setTvStrategy(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Created on import, then available to pick next time.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Pick the existing strategy so repeat imports build up on
                        the same one.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tv-risk">Risk per trade (USD)</Label>
                    <Input
                      id="tv-risk"
                      type="number"
                      step="0.01"
                      placeholder="1.00"
                      value={tvRisk}
                      onChange={(e) => setTvRisk(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {tvInferredRisk != null
                        ? `Suggested ${tvInferredRisk} — the median loss on stop-loss exits, which is what you risked.`
                        : "Not in the export. Without it these trades have no RRx."}
                    </p>
                  </div>
                </div>

                {!tvRisk && (
                  <div className="flex items-center gap-3 p-4 bg-yellow/10 border border-yellow/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow shrink-0" />
                    <p className="text-sm">
                      Without a risk figure these trades import with no RRx, so they
                      will not contribute to risk-adjusted analysis.
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Back
                  </Button>
                  <Button onClick={handlePreview} disabled={tvDetailsIncomplete}>
                    Preview Import
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2b: Column Mapping */}
          {step === "mapping" && source === "generic" && (
            <Card>
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
                <CardDescription>
                  Match your CSV columns to the trading journal fields. We&apos;ve auto-detected{" "}
                  {headers.length} columns across {rows.length} rows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
                  <div>CSV Column</div>
                  <div>Journal Field</div>
                </div>

                {headers.map((header) => (
                  <div key={header} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm truncate" title={header}>
                      {header}
                    </div>
                    <Select
                      options={FIELD_OPTIONS}
                      value={mapping[header] ?? ""}
                      onChange={(e) =>
                        setMapping((prev) => ({ ...prev, [header]: e.target.value as FieldKey | "" }))
                      }
                    />
                  </div>
                ))}

                {missingRequired.length > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-yellow/10 border border-yellow/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow shrink-0" />
                    <p className="text-sm">
                      Map a column to{" "}
                      <span className="font-medium">
                        {missingRequired
                          .map((k) => FIELD_OPTIONS.find((o) => o.value === k)?.label)
                          .join(" and ")}
                      </span>{" "}
                      — these are required for every trade.
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Back
                  </Button>
                  <Button onClick={handlePreview} disabled={missingRequired.length > 0}>
                    Preview Import
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && build && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Import</CardTitle>
                <CardDescription>Review the data before importing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-green/10 border border-green/30 rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green shrink-0" />
                    <div>
                      <p className="font-medium text-green">{build.valid.length} ready</p>
                      <p className="text-xs text-muted-foreground">to import</p>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow/10 border border-yellow/30 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow shrink-0" />
                    <div>
                      <p className="font-medium">{build.warnings.length} warnings</p>
                      <p className="text-xs text-muted-foreground">imported with defaults</p>
                    </div>
                  </div>
                  <div className="p-4 bg-red/10 border border-red/30 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red shrink-0" />
                    <div>
                      <p className="font-medium">{build.errors.length} errors</p>
                      <p className="text-xs text-muted-foreground">rows skipped</p>
                    </div>
                  </div>
                </div>

                {build.strategyNames.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Strategies detected: {build.strategyNames.join(", ")} (existing ones are reused,
                    new ones are created).
                  </p>
                )}

                {(build.errors.length > 0 || build.warnings.length > 0) && (
                  <div className="max-h-40 overflow-auto border rounded-lg divide-y text-sm">
                    {build.errors.slice(0, 50).map((e, i) => (
                      <div key={`e${i}`} className="p-2 flex gap-2">
                        <span className="text-red shrink-0">Row {e.row}:</span>
                        <span>{e.message}</span>
                      </div>
                    ))}
                    {build.warnings.slice(0, 50).map((w, i) => (
                      <div key={`w${i}`} className="p-2 flex gap-2">
                        <span className="text-yellow shrink-0">Row {w.row}:</span>
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {build.valid.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Title</th>
                          <th className="p-3 text-left">Security</th>
                          <th className="p-3 text-left">Direction</th>
                          <th className="p-3 text-right">P&amp;L</th>
                          <th className="p-3 text-right">RRx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {build.valid.slice(0, 10).map((t, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3 truncate max-w-[200px]" title={t.title}>
                              {t.title}
                            </td>
                            <td className="p-3">{t.security}</td>
                            <td className="p-3">{t.direction}</td>
                            <td
                              className={`p-3 text-right ${
                                (t.pnl ?? 0) >= 0 ? "text-green" : "text-red"
                              }`}
                            >
                              {t.pnl != null ? formatPnL(t.pnl) : "-"}
                            </td>
                            <td className="p-3 text-right">
                              {t.risk_reward_actual != null ? `${t.risk_reward_actual.toFixed(2)}R` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {build.valid.length > 10 && (
                      <div className="p-3 bg-muted text-center text-sm text-muted-foreground">
                        Showing 10 of {build.valid.length} trades
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep("mapping")} disabled={importing}>
                    Back
                  </Button>
                  <Button onClick={handleImport} disabled={importing || build.valid.length === 0}>
                    {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Import {build.valid.length} {build.valid.length === 1 ? "Trade" : "Trades"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && result && (
            <Card>
              <CardContent className="py-12 text-center">
                {result.error ? (
                  <>
                    <div className="w-16 h-16 bg-red rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Import Failed</h2>
                    <p className="text-muted-foreground mb-2">
                      {result.inserted > 0
                        ? `${result.inserted} trades were imported before the error.`
                        : "No trades were imported."}
                    </p>
                    <p className="text-sm text-red mb-6 max-w-md mx-auto">{result.error}</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-green rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Import Complete!</h2>
                    <p className="text-muted-foreground mb-6">
                      Successfully imported {result.inserted}{" "}
                      {result.inserted === 1 ? "trade" : "trades"} to your journal
                    </p>
                  </>
                )}
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={resetWizard}>
                    Import More
                  </Button>
                  <Button onClick={() => (window.location.href = "/trades")}>View Trades</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
