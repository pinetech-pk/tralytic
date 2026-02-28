"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Wallet, MoreVertical, Loader2, Pencil, Trash2, Star } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/lib/types/database";

interface AccountWithStats extends Account {
  trades_count?: number;
  win_rate?: number;
  total_pnl?: number;
}

const accountTypeOptions = [
  { value: "personal", label: "Personal" },
  { value: "funded", label: "Funded" },
  { value: "demo", label: "Demo" },
  { value: "backtest", label: "Backtest" },
];

const riskLevelOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const initialFormData = {
  name: "",
  account_type: "personal",
  risk_level: "medium",
  initial_capital: "",
  broker: "",
  description: "",
  is_default: false,
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithStats | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState(initialFormData);
  const [editFormData, setEditFormData] = useState(initialFormData);

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

  // Fetch accounts with stats
  const fetchAccounts = async () => {
    setLoading(true);

    const { data: accountsData, error: accountsError } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false }) as { data: Account[] | null; error: any };

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      setLoading(false);
      return;
    }

    // Fetch trade stats for each account
    const accountsWithStats: AccountWithStats[] = await Promise.all(
      (accountsData || []).map(async (account: Account) => {
        const { data: trades } = await supabase
          .from("trades")
          .select("pnl, is_winner")
          .eq("account_id", account.id)
          .eq("status", "closed") as { data: { pnl: number | null; is_winner: boolean | null }[] | null };

        const tradesCount = trades?.length || 0;
        const winningTrades = trades?.filter((t) => t.is_winner)?.length || 0;
        const winRate = tradesCount > 0 ? (winningTrades / tradesCount) * 100 : 0;
        const totalPnl = trades?.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0;

        return {
          ...account,
          trades_count: tradesCount,
          win_rate: winRate,
          total_pnl: totalPnl,
        };
      })
    );

    setAccounts(accountsWithStats);
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle create form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      setSubmitting(false);
      return;
    }

    // If setting as default, unset all other defaults first
    if (formData.is_default) {
      await (supabase.from("accounts") as any)
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: formData.name,
      account_type: formData.account_type,
      risk_level: formData.risk_level,
      initial_capital: parseFloat(formData.initial_capital) || 0,
      current_balance: parseFloat(formData.initial_capital) || 0,
      broker: formData.broker || null,
      description: formData.description || null,
      is_default: formData.is_default,
    } as any);

    if (error) {
      console.error("Error creating account:", error);
    } else {
      setFormData(initialFormData);
      setDialogOpen(false);
      fetchAccounts();
    }

    setSubmitting(false);
  };

  // Handle edit
  const handleEditClick = (account: AccountWithStats) => {
    setSelectedAccount(account);
    setEditFormData({
      name: account.name,
      account_type: account.account_type,
      risk_level: account.risk_level,
      initial_capital: account.initial_capital.toString(),
      broker: account.broker || "",
      description: account.description || "",
      is_default: account.is_default,
    });
    setActiveMenu(null);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSubmitting(true);

    // If setting as default, unset all other defaults first
    if (editFormData.is_default) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase.from("accounts") as any)
          .update({ is_default: false })
          .eq("user_id", user.id);
      }
    }

    const { error } = await (supabase
      .from("accounts") as any)
      .update({
        name: editFormData.name,
        account_type: editFormData.account_type,
        risk_level: editFormData.risk_level,
        initial_capital: parseFloat(editFormData.initial_capital) || 0,
        broker: editFormData.broker || null,
        description: editFormData.description || null,
        is_default: editFormData.is_default,
      })
      .eq("id", selectedAccount.id);

    if (error) {
      console.error("Error updating account:", error);
    } else {
      setEditDialogOpen(false);
      setSelectedAccount(null);
      fetchAccounts();
    }

    setSubmitting(false);
  };

  // Handle delete
  const handleDeleteClick = (account: AccountWithStats) => {
    setSelectedAccount(account);
    setActiveMenu(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAccount) return;
    setSubmitting(true);

    const { error } = await (supabase
      .from("accounts") as any)
      .delete()
      .eq("id", selectedAccount.id);

    if (error) {
      console.error("Error deleting account:", error);
    } else {
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
      fetchAccounts();
    }

    setSubmitting(false);
  };

  // Handle set as default
  const handleSetDefault = async (account: AccountWithStats) => {
    setActiveMenu(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Unset all defaults for this user, then set the selected one
    await (supabase.from("accounts") as any)
      .update({ is_default: false })
      .eq("user_id", user.id);

    await (supabase.from("accounts") as any)
      .update({ is_default: true })
      .eq("id", account.id);

    fetchAccounts();
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Accounts"
        description="Manage your trading accounts"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    placeholder="My Trading Account"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Account Type</Label>
                    <Select
                      id="type"
                      options={accountTypeOptions}
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="risk">Risk Level</Label>
                    <Select
                      id="risk"
                      options={riskLevelOptions}
                      value={formData.risk_level}
                      onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capital">Initial Capital ($)</Label>
                  <Input
                    id="capital"
                    type="number"
                    placeholder="1000"
                    value={formData.initial_capital}
                    onChange={(e) => setFormData({ ...formData, initial_capital: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broker">Broker (Optional)</Label>
                  <Input
                    id="broker"
                    placeholder="e.g., FTMO, Interactive Brokers"
                    value={formData.broker}
                    onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Notes about this account..."
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="is_default" className="font-normal">
                    Set as default account
                  </Label>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
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
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Account Name</Label>
                <Input
                  id="edit-name"
                  placeholder="My Trading Account"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Account Type</Label>
                  <Select
                    id="edit-type"
                    options={accountTypeOptions}
                    value={editFormData.account_type}
                    onChange={(e) => setEditFormData({ ...editFormData, account_type: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-risk">Risk Level</Label>
                  <Select
                    id="edit-risk"
                    options={riskLevelOptions}
                    value={editFormData.risk_level}
                    onChange={(e) => setEditFormData({ ...editFormData, risk_level: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capital">Initial Capital ($)</Label>
                <Input
                  id="edit-capital"
                  type="number"
                  placeholder="1000"
                  value={editFormData.initial_capital}
                  onChange={(e) => setEditFormData({ ...editFormData, initial_capital: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-broker">Broker (Optional)</Label>
                <Input
                  id="edit-broker"
                  placeholder="e.g., FTMO, Interactive Brokers"
                  value={editFormData.broker}
                  onChange={(e) => setEditFormData({ ...editFormData, broker: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Notes about this account..."
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-is_default"
                  checked={editFormData.is_default}
                  onChange={(e) => setEditFormData({ ...editFormData, is_default: e.target.checked })}
                  className="rounded border-border"
                />
                <Label htmlFor="edit-is_default" className="font-normal">
                  Set as default account
                </Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
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
              <DialogTitle>Delete Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete <strong>{selectedAccount?.name}</strong>?
                This action cannot be undone.
              </p>
              {selectedAccount && (selectedAccount.trades_count || 0) > 0 && (
                <p className="text-sm text-yellow-500">
                  Warning: This account has {selectedAccount.trades_count} trade(s) associated with it.
                  Deleting will remove the account reference from those trades.
                </p>
              )}
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
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            title="No accounts yet"
            description="Create your first trading account to start tracking your performance."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-bg">
                        <Wallet className="h-5 w-5 text-blue" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.name}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {account.account_type}
                          </Badge>
                          <Badge
                            variant={
                              account.risk_level === "low"
                                ? "success"
                                : account.risk_level === "high"
                                ? "danger"
                                : "warning"
                            }
                            className="text-xs"
                          >
                            {account.risk_level} risk
                          </Badge>
                          {account.is_default && (
                            <Badge variant="default" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Dropdown Menu */}
                    <div className="relative" ref={activeMenu === account.id ? menuRef : null}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setActiveMenu(activeMenu === account.id ? null : account.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {activeMenu === account.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-background-card border border-border rounded-md shadow-lg z-10">
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                            onClick={() => handleEditClick(account)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          {!account.is_default && (
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              onClick={() => handleSetDefault(account)}
                            >
                              <Star className="h-4 w-4" />
                              Set as Default
                            </button>
                          )}
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red hover:bg-muted/50 transition-colors"
                            onClick={() => handleDeleteClick(account)}
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono">
                      ${account.current_balance.toFixed(2)}
                    </span>
                    {account.initial_capital > 0 && (
                      <span
                        className={`text-sm font-medium ${
                          (account.total_pnl || 0) >= 0 ? "text-green" : "text-red"
                        }`}
                      >
                        {(account.total_pnl || 0) >= 0 ? "+" : ""}
                        {(((account.total_pnl || 0) / account.initial_capital) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {account.broker && (
                    <p className="text-xs text-muted-foreground">
                      Broker: {account.broker}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Trades</p>
                      <p className="font-medium font-mono">{account.trades_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                      <p className={`font-medium font-mono ${(account.win_rate || 0) >= 50 ? "text-green" : "text-red"}`}>
                        {(account.win_rate || 0).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">P&L</p>
                      <p
                        className={`font-medium font-mono ${
                          (account.total_pnl || 0) >= 0 ? "text-green" : "text-red"
                        }`}
                      >
                        {(account.total_pnl || 0) >= 0 ? "+" : ""}${(account.total_pnl || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
