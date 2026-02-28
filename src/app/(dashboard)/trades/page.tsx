"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { SessionBadge } from "@/components/shared/session-badge";
import { DirectionBadge } from "@/components/shared/direction-badge";
import { ResultBadge } from "@/components/shared/result-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Trade, Account, Strategy } from "@/lib/types/database";

interface TradeWithRelations extends Trade {
  accounts?: { name: string } | null;
  strategies?: { name: string } | null;
}

const SESSION_OPTIONS = [
  { value: "", label: "All Sessions" },
  { value: "AS", label: "Asian" },
  { value: "LO", label: "London" },
  { value: "NY", label: "New York" },
  { value: "OTHER", label: "Other" },
];

const DIRECTION_OPTIONS = [
  { value: "", label: "All Directions" },
  { value: "LONG", label: "Long" },
  { value: "SHORT", label: "Short" },
];

const RESULT_OPTIONS = [
  { value: "", label: "All Results" },
  { value: "win", label: "Winners" },
  { value: "loss", label: "Losers" },
];

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<TradeWithRelations[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("");
  const [selectedResult, setSelectedResult] = useState("");

  const supabase = createClient();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch filter options
  useEffect(() => {
    async function fetchFilters() {
      const [accountsRes, strategiesRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("is_active", true).order("name") as unknown as Promise<{ data: Account[] | null; error: any }>,
        supabase.from("strategies").select("*").eq("is_active", true).order("name") as unknown as Promise<{ data: Strategy[] | null; error: any }>,
      ]);

      if (accountsRes.data) setAccounts(accountsRes.data);
      if (strategiesRes.data) setStrategies(strategiesRes.data);
    }

    fetchFilters();
  }, [supabase]);

  // Fetch trades
  const fetchTrades = async () => {
    setLoading(true);

    let query = supabase
      .from("trades")
      .select(`
        *,
        accounts(name),
        strategies(name)
      `)
      .order("entry_date", { ascending: false });

    // Apply filters
    if (selectedAccount) {
      query = query.eq("account_id", selectedAccount);
    }
    if (selectedStrategy) {
      query = query.eq("strategy_id", selectedStrategy);
    }
    if (selectedSession) {
      query = query.eq("session", selectedSession);
    }
    if (selectedDirection) {
      query = query.eq("direction", selectedDirection);
    }
    if (selectedResult === "win") {
      query = query.eq("is_winner", true);
    } else if (selectedResult === "loss") {
      query = query.eq("is_winner", false);
    }

    const { data, error } = await query as { data: TradeWithRelations[] | null; error: any };

    if (error) {
      console.error("Error fetching trades:", error);
    } else {
      setTrades(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, [selectedAccount, selectedStrategy, selectedSession, selectedDirection, selectedResult]);

  // Client-side search filter
  const filteredTrades = trades.filter((trade) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      trade.title.toLowerCase().includes(searchLower) ||
      trade.security.toLowerCase().includes(searchLower) ||
      trade.strategies?.name?.toLowerCase().includes(searchLower) ||
      trade.accounts?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Handle delete
  const handleDeleteClick = (trade: TradeWithRelations) => {
    setSelectedTrade(trade);
    setActiveMenu(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTrade) return;
    setDeleting(true);

    const { error } = await (supabase
      .from("trades") as any)
      .delete()
      .eq("id", selectedTrade.id);

    if (error) {
      console.error("Error deleting trade:", error);
    } else {
      setDeleteDialogOpen(false);
      setSelectedTrade(null);
      fetchTrades();
    }

    setDeleting(false);
  };

  // Handle edit
  const handleEditClick = (trade: TradeWithRelations) => {
    setActiveMenu(null);
    router.push(`/trades/${trade.id}/edit`);
  };

  // Filter options
  const accountOptions = [
    { value: "", label: "All Accounts" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const strategyOptions = [
    { value: "", label: "All Strategies" },
    ...strategies.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Trade Journal" description="View and manage your trades" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Filters Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search trades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Link href="/trades/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Trade
              </Button>
            </Link>
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-3">
            <div className="w-40">
              <Select
                options={accountOptions}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                options={strategyOptions}
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Select
                options={SESSION_OPTIONS}
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Select
                options={DIRECTION_OPTIONS}
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Select
                options={RESULT_OPTIONS}
                value={selectedResult}
                onChange={(e) => setSelectedResult(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Trade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete <strong>{selectedTrade?.title}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Trade"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Trades Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No trades found"
                  description={
                    trades.length === 0
                      ? "Start logging your trades to build your journal."
                      : "Try adjusting your filters or search terms."
                  }
                  action={
                    trades.length === 0 ? (
                      <Link href="/trades/new">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Trade
                        </Button>
                      </Link>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead className="text-right">Risk %</TableHead>
                    <TableHead className="text-right">RRx</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-center">Chart</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade) => (
                    <TableRow
                      key={trade.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        {formatDate(trade.entry_date, "MMM d")}
                      </TableCell>
                      <TableCell>
                        <Link href={`/trades/${trade.id}`} className="block hover:underline">
                          <div className="font-medium">{trade.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {trade.security}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <DirectionBadge direction={trade.direction} />
                      </TableCell>
                      <TableCell>
                        {trade.session ? (
                          <SessionBadge session={trade.session} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {trade.strategies?.name ? (
                          <Badge variant="secondary">{trade.strategies.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {trade.risk_percent != null
                          ? `${trade.risk_percent.toFixed(2)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${
                        trade.risk_reward_actual != null
                          ? trade.risk_reward_actual >= 0
                            ? "text-green"
                            : "text-red"
                          : ""
                      }`}>
                        {trade.risk_reward_actual != null
                          ? `${trade.risk_reward_actual.toFixed(2)}R`
                          : "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-medium ${
                          trade.pnl != null
                            ? trade.pnl >= 0
                              ? "text-green"
                              : "text-red"
                            : ""
                        }`}
                      >
                        {trade.pnl != null ? (
                          <>
                            {trade.pnl >= 0 ? "+" : ""}
                            {formatCurrency(trade.pnl)}
                          </>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {trade.is_winner != null ? (
                          <ResultBadge isWinner={trade.is_winner} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {trade.chart_url ? (
                          <a
                            href={trade.chart_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center text-blue hover:text-blue/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Actions Menu */}
                        <div className="relative" ref={activeMenu === trade.id ? menuRef : null}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(activeMenu === trade.id ? null : trade.id);
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {activeMenu === trade.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-background-card border border-border rounded-md shadow-lg z-10">
                              <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                onClick={() => handleEditClick(trade)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red hover:bg-muted/50 transition-colors"
                                onClick={() => handleDeleteClick(trade)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Trade count */}
        {!loading && filteredTrades.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredTrades.length} of {trades.length} trades
          </div>
        )}
      </div>
    </div>
  );
}
