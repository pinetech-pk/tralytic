"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Target, MoreVertical, Pencil, Trash2, ExternalLink, Loader2, Star } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PerformanceBar } from "@/components/charts/performance-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import type { Strategy } from "@/lib/types/database";

interface StrategyWithStats extends Strategy {
  trades: number;
  winRate: number;
  pnl: number;
  avgRR: number;
}

interface FormData {
  name: string;
  description: string;
  tags: string;
  entry_criteria: string;
  exit_criteria: string;
  risk_management: string;
  tradingview_url: string;
  is_active: boolean;
  is_default: boolean;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  tags: "",
  entry_criteria: "",
  exit_criteria: "",
  risk_management: "",
  tradingview_url: "",
  is_active: true,
  is_default: false,
};

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyWithStats | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Fetch strategies with trade stats
  const fetchStrategies = async () => {
    setLoading(true);

    // Get strategies
    const { data: strategiesData, error: strategiesError } = await (supabase
      .from("strategies")
      .select("*")
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: Strategy[] | null; error: any }>);

    if (strategiesError) {
      console.error("Error fetching strategies:", strategiesError);
      setLoading(false);
      return;
    }

    // Get trade stats for all strategies
    const { data: tradesData, error: tradesError } = await (supabase
      .from("trades")
      .select("strategy_id, pnl, risk_reward_actual, is_winner") as unknown as Promise<{
        data: { strategy_id: string | null; pnl: number | null; risk_reward_actual: number | null; is_winner: boolean | null }[] | null;
        error: any;
      }>);

    if (tradesError) {
      console.error("Error fetching trades:", tradesError);
    }

    // Calculate stats per strategy
    const strategiesWithStats: StrategyWithStats[] = (strategiesData || []).map((strategy) => {
      const strategyTrades = (tradesData || []).filter((t) => t.strategy_id === strategy.id);
      const totalTrades = strategyTrades.length;
      const winners = strategyTrades.filter((t) => t.is_winner === true).length;
      const winRate = totalTrades > 0 ? Math.round((winners / totalTrades) * 100) : 0;
      const totalPnl = strategyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const avgRR =
        totalTrades > 0
          ? strategyTrades.reduce((sum, t) => sum + (t.risk_reward_actual || 0), 0) / totalTrades
          : 0;

      return {
        ...strategy,
        trades: totalTrades,
        winRate,
        pnl: totalPnl,
        avgRR: Math.round(avgRR * 100) / 100,
      };
    });

    setStrategies(strategiesWithStats);
    setLoading(false);
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  // Handle form change
  const handleFormChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setFormError("No user found. Please log in again.");
      setSubmitting(false);
      return;
    }

    const tagsArray = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // If setting as default, unset all other defaults first
    if (formData.is_default) {
      await (supabase.from("strategies") as any)
        .update({ is_default: false })
        .eq("user_id", userData.user.id);
    }

    const insertData: Record<string, unknown> = {
      user_id: userData.user.id,
      name: formData.name,
      description: formData.description || null,
      tags: tagsArray,
      entry_criteria: formData.entry_criteria || null,
      exit_criteria: formData.exit_criteria || null,
      risk_management: formData.risk_management || null,
      is_active: formData.is_active,
      is_default: formData.is_default,
    };

    // Only add tradingview_url if it has a value
    if (formData.tradingview_url) {
      insertData.tradingview_url = formData.tradingview_url;
    }

    const { error } = await (supabase.from("strategies") as any).insert(insertData);

    if (error) {
      console.error("Error creating strategy:", error);
      setFormError(error.message || "Failed to create strategy");
    } else {
      setDialogOpen(false);
      setFormData(initialFormData);
      fetchStrategies();
    }

    setSubmitting(false);
  };

  // Handle edit click
  const handleEditClick = (strategy: StrategyWithStats) => {
    setSelectedStrategy(strategy);
    setFormData({
      name: strategy.name,
      description: strategy.description || "",
      tags: strategy.tags?.join(", ") || "",
      entry_criteria: strategy.entry_criteria || "",
      exit_criteria: strategy.exit_criteria || "",
      risk_management: strategy.risk_management || "",
      tradingview_url: strategy.tradingview_url || "",
      is_active: strategy.is_active,
      is_default: strategy.is_default,
    });
    setActiveMenu(null);
    setEditDialogOpen(true);
  };

  // Handle update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStrategy) return;
    setSubmitting(true);
    setFormError(null);

    const tagsArray = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // If setting as default, unset all other defaults first
    if (formData.is_default) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await (supabase.from("strategies") as any)
          .update({ is_default: false })
          .eq("user_id", userData.user.id);
      }
    }

    const updateData: Record<string, unknown> = {
      name: formData.name,
      description: formData.description || null,
      tags: tagsArray,
      entry_criteria: formData.entry_criteria || null,
      exit_criteria: formData.exit_criteria || null,
      risk_management: formData.risk_management || null,
      is_active: formData.is_active,
      is_default: formData.is_default,
      updated_at: new Date().toISOString(),
    };

    // Only add tradingview_url if it has a value
    if (formData.tradingview_url) {
      updateData.tradingview_url = formData.tradingview_url;
    }

    const { error } = await (supabase.from("strategies") as any)
      .update(updateData)
      .eq("id", selectedStrategy.id);

    if (error) {
      console.error("Error updating strategy:", error);
      setFormError(error.message || "Failed to update strategy");
    } else {
      setEditDialogOpen(false);
      setSelectedStrategy(null);
      setFormData(initialFormData);
      fetchStrategies();
    }

    setSubmitting(false);
  };

  // Handle delete click
  const handleDeleteClick = (strategy: StrategyWithStats) => {
    setSelectedStrategy(strategy);
    setActiveMenu(null);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!selectedStrategy) return;
    setDeleting(true);

    const { error } = await (supabase.from("strategies") as any)
      .delete()
      .eq("id", selectedStrategy.id);

    if (error) {
      console.error("Error deleting strategy:", error);
    } else {
      setDeleteDialogOpen(false);
      setSelectedStrategy(null);
      fetchStrategies();
    }

    setDeleting(false);
  };

  // Toggle active status
  const handleToggleActive = async (strategy: StrategyWithStats) => {
    const { error } = await (supabase.from("strategies") as any)
      .update({
        is_active: !strategy.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", strategy.id);

    if (error) {
      console.error("Error toggling strategy status:", error);
    } else {
      fetchStrategies();
    }
    setActiveMenu(null);
  };

  // Handle set as default
  const handleSetDefault = async (strategy: StrategyWithStats) => {
    setActiveMenu(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Unset all defaults for this user, then set the selected one
    await (supabase.from("strategies") as any)
      .update({ is_default: false })
      .eq("user_id", userData.user.id);

    await (supabase.from("strategies") as any)
      .update({ is_default: true })
      .eq("id", strategy.id);

    fetchStrategies();
  };

  // Form fields JSX - inlined to prevent focus loss on re-render
  const renderFormFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Strategy Name *</Label>
        <Input
          id="name"
          placeholder="e.g., CCM + Trix"
          value={formData.name}
          onChange={(e) => handleFormChange("name", e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your strategy..."
          rows={2}
          value={formData.description}
          onChange={(e) => handleFormChange("description", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          placeholder="scalping, momentum"
          value={formData.tags}
          onChange={(e) => handleFormChange("tags", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tradingview_url">TradingView Link</Label>
        <Input
          id="tradingview_url"
          type="url"
          placeholder="https://www.tradingview.com/chart/..."
          value={formData.tradingview_url}
          onChange={(e) => handleFormChange("tradingview_url", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Add a TradingView link for visual representation of this strategy
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="entry">Entry Criteria</Label>
        <Textarea
          id="entry"
          placeholder="When do you enter a trade..."
          rows={2}
          value={formData.entry_criteria}
          onChange={(e) => handleFormChange("entry_criteria", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exit">Exit Criteria</Label>
        <Textarea
          id="exit"
          placeholder="When do you exit a trade..."
          rows={2}
          value={formData.exit_criteria}
          onChange={(e) => handleFormChange("exit_criteria", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="risk">Risk Management</Label>
        <Textarea
          id="risk"
          placeholder="How do you manage risk..."
          rows={2}
          value={formData.risk_management}
          onChange={(e) => handleFormChange("risk_management", e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => handleFormChange("is_active", e.target.checked)}
          className="rounded border-border"
        />
        <Label htmlFor="is_active" className="font-normal">
          Active strategy
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => handleFormChange("is_default", e.target.checked)}
          className="rounded border-border"
        />
        <Label htmlFor="is_default" className="font-normal">
          Set as default strategy
        </Label>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Strategies"
        description="Define and track your trading strategies"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Strategy
          </Button>
        </div>

        {/* Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Strategy</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red bg-red/10 border border-red/20 rounded-md">
                  {formError}
                </div>
              )}
              {renderFormFields()}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setFormData(initialFormData);
                    setFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Strategy"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Strategy</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red bg-red/10 border border-red/20 rounded-md">
                  {formError}
                </div>
              )}
              {renderFormFields()}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setFormData(initialFormData);
                    setFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Strategy"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Strategy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete <strong>{selectedStrategy?.name}</strong>?
                {selectedStrategy && selectedStrategy.trades > 0 && (
                  <span className="block mt-2 text-yellow-500">
                    Warning: This strategy has {selectedStrategy.trades} associated trades.
                    The trades will not be deleted but will no longer be linked to this strategy.
                  </span>
                )}
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
                    "Delete Strategy"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Strategies Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : strategies.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="No strategies found"
                description="Create your first strategy to start tracking performance."
                action={
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Strategy
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {strategies.map((strategy) => (
              <Card key={strategy.id} className={!strategy.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-bg">
                        <Target className="h-5 w-5 text-purple" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{strategy.name}</CardTitle>
                          {strategy.is_default && (
                            <Badge variant="default" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {!strategy.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {strategy.tags?.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Actions Menu */}
                    <div className="relative" ref={activeMenu === strategy.id ? menuRef : null}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === strategy.id ? null : strategy.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {activeMenu === strategy.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-background-card border border-border rounded-md shadow-lg z-10">
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                            onClick={() => handleEditClick(strategy)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          {!strategy.is_default && (
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              onClick={() => handleSetDefault(strategy)}
                            >
                              <Star className="h-4 w-4" />
                              Set as Default
                            </button>
                          )}
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                            onClick={() => handleToggleActive(strategy)}
                          >
                            {strategy.is_active ? "Mark Inactive" : "Mark Active"}
                          </button>
                          {strategy.tradingview_url && (
                            <a
                              href={strategy.tradingview_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              onClick={() => setActiveMenu(null)}
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Chart
                            </a>
                          )}
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red hover:bg-muted/50 transition-colors"
                            onClick={() => handleDeleteClick(strategy)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {strategy.description && (
                    <p className="text-sm text-muted-foreground">
                      {strategy.description}
                    </p>
                  )}

                  {strategy.tradingview_url && (
                    <a
                      href={strategy.tradingview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-purple hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on TradingView
                    </a>
                  )}

                  {strategy.trades > 0 ? (
                    <>
                      <PerformanceBar
                        label="Win Rate"
                        value={strategy.winRate}
                        maxValue={100}
                        trades={strategy.trades}
                        pnl={strategy.pnl}
                        color="bg-purple"
                      />

                      <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="font-medium font-mono">{strategy.trades}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className={`font-medium font-mono ${strategy.winRate >= 50 ? "text-green" : "text-red"}`}>
                            {strategy.winRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg R:R</p>
                          <p className="font-medium font-mono">{strategy.avgRR}R</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">P&L</p>
                          <p
                            className={`font-medium font-mono ${
                              strategy.pnl >= 0 ? "text-green" : "text-red"
                            }`}
                          >
                            {strategy.pnl >= 0 ? "+" : ""}
                            ${strategy.pnl.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2 border-t">
                      No trades recorded for this strategy yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
