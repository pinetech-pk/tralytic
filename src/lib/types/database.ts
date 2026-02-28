export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string;
          default_currency: string;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          default_currency?: string;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          default_currency?: string;
          theme?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          initial_capital: number;
          current_balance: number;
          currency: string;
          risk_level: "low" | "medium" | "high";
          account_type: "personal" | "funded" | "demo" | "backtest";
          broker: string | null;
          is_active: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          initial_capital?: number;
          current_balance?: number;
          currency?: string;
          risk_level?: "low" | "medium" | "high";
          account_type?: "personal" | "funded" | "demo" | "backtest";
          broker?: string | null;
          is_active?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          initial_capital?: number;
          current_balance?: number;
          currency?: string;
          risk_level?: "low" | "medium" | "high";
          account_type?: "personal" | "funded" | "demo" | "backtest";
          broker?: string | null;
          is_active?: boolean;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          tags: string[];
          rules: string | null;
          entry_criteria: string | null;
          exit_criteria: string | null;
          risk_management: string | null;
          tradingview_url: string | null;
          is_active: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          tags?: string[];
          rules?: string | null;
          entry_criteria?: string | null;
          exit_criteria?: string | null;
          risk_management?: string | null;
          tradingview_url?: string | null;
          is_active?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          tags?: string[];
          rules?: string | null;
          entry_criteria?: string | null;
          exit_criteria?: string | null;
          risk_management?: string | null;
          tradingview_url?: string | null;
          is_active?: boolean;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          strategy_id: string | null;
          title: string;
          security: string;
          market: "crypto" | "forex" | "stocks" | "futures" | "options";
          direction: "LONG" | "SHORT";
          entry_price: number | null;
          exit_price: number | null;
          quantity: number | null;
          entry_date: string;
          exit_date: string | null;
          timeframe: string | null;
          session: "AS" | "LO" | "NY" | "OTHER" | null;
          stop_loss: number | null;
          take_profit: number | null;
          risk_percent: number | null;
          risk_amount: number | null;
          risk_reward_planned: number | null;
          pnl: number | null;
          pnl_percent: number | null;
          risk_reward_actual: number | null;
          is_winner: boolean | null;
          status: "open" | "closed" | "cancelled";
          setup_notes: string | null;
          execution_notes: string | null;
          review_notes: string | null;
          mistake: string | null;
          lesson: string | null;
          chart_url: string | null;
          images: string[];
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          strategy_id?: string | null;
          title: string;
          security: string;
          market?: "crypto" | "forex" | "stocks" | "futures" | "options";
          direction: "LONG" | "SHORT";
          entry_price?: number | null;
          exit_price?: number | null;
          quantity?: number | null;
          entry_date: string;
          exit_date?: string | null;
          timeframe?: string | null;
          session?: "AS" | "LO" | "NY" | "OTHER" | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          risk_percent?: number | null;
          risk_amount?: number | null;
          risk_reward_planned?: number | null;
          pnl?: number | null;
          pnl_percent?: number | null;
          risk_reward_actual?: number | null;
          is_winner?: boolean | null;
          status?: "open" | "closed" | "cancelled";
          setup_notes?: string | null;
          execution_notes?: string | null;
          review_notes?: string | null;
          mistake?: string | null;
          lesson?: string | null;
          chart_url?: string | null;
          images?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          strategy_id?: string | null;
          title?: string;
          security?: string;
          market?: "crypto" | "forex" | "stocks" | "futures" | "options";
          direction?: "LONG" | "SHORT";
          entry_price?: number | null;
          exit_price?: number | null;
          quantity?: number | null;
          entry_date?: string;
          exit_date?: string | null;
          timeframe?: string | null;
          session?: "AS" | "LO" | "NY" | "OTHER" | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          risk_percent?: number | null;
          risk_amount?: number | null;
          risk_reward_planned?: number | null;
          pnl?: number | null;
          pnl_percent?: number | null;
          risk_reward_actual?: number | null;
          is_winner?: boolean | null;
          status?: "open" | "closed" | "cancelled";
          setup_notes?: string | null;
          execution_notes?: string | null;
          review_notes?: string | null;
          mistake?: string | null;
          lesson?: string | null;
          chart_url?: string | null;
          images?: string[];
          tags?: string[];
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string | null;
          title: string;
          content: string | null;
          type: "general" | "mistake" | "lesson" | "insight" | "routine";
          tags: string[];
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trade_id?: string | null;
          title: string;
          content?: string | null;
          type?: "general" | "mistake" | "lesson" | "insight" | "routine";
          tags?: string[];
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          trade_id?: string | null;
          title?: string;
          content?: string | null;
          type?: "general" | "mistake" | "lesson" | "insight" | "routine";
          tags?: string[];
          is_pinned?: boolean;
          updated_at?: string;
        };
      };
      daily_summaries: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          date: string;
          total_trades: number;
          winning_trades: number;
          losing_trades: number;
          total_pnl: number;
          total_risk: number;
          avg_risk_reward: number | null;
          equity: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          date: string;
          total_trades?: number;
          winning_trades?: number;
          losing_trades?: number;
          total_pnl?: number;
          total_risk?: number;
          avg_risk_reward?: number | null;
          equity?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          date?: string;
          total_trades?: number;
          winning_trades?: number;
          losing_trades?: number;
          total_pnl?: number;
          total_risk?: number;
          avg_risk_reward?: number | null;
          equity?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
    Functions: {
      calculate_trade_stats: {
        Args: {
          p_user_id: string;
          p_account_id?: string;
          p_strategy_id?: string;
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: Json;
      };
      get_equity_curve: {
        Args: {
          p_user_id: string;
          p_account_id?: string;
          p_initial_capital?: number;
        };
        Returns: {
          trade_number: number;
          trade_date: string;
          trade_pnl: number;
          cumulative_pnl: number;
          equity: number;
        }[];
      };
      get_daily_pnl: {
        Args: {
          p_user_id: string;
          p_account_id?: string;
          p_start_date?: string;
          p_end_date?: string;
        };
        Returns: {
          date: string;
          total_pnl: number;
          trade_count: number;
          winning_trades: number;
          win_rate: number;
        }[];
      };
      get_performance_by_strategy: {
        Args: {
          p_user_id: string;
          p_account_id?: string;
        };
        Returns: {
          strategy_id: string;
          strategy_name: string;
          total_trades: number;
          winning_trades: number;
          win_rate: number;
          total_pnl: number;
          avg_pnl: number;
          avg_risk_reward: number;
        }[];
      };
      get_performance_by_session: {
        Args: {
          p_user_id: string;
          p_account_id?: string;
        };
        Returns: {
          session: string;
          session_name: string;
          total_trades: number;
          winning_trades: number;
          win_rate: number;
          total_pnl: number;
        }[];
      };
      get_performance_by_direction: {
        Args: {
          p_user_id: string;
          p_account_id?: string;
        };
        Returns: {
          direction: string;
          total_trades: number;
          winning_trades: number;
          win_rate: number;
          total_pnl: number;
        }[];
      };
      get_monthly_performance: {
        Args: {
          p_user_id: string;
          p_account_id?: string;
        };
        Returns: {
          month: string;
          total_trades: number;
          winning_trades: number;
          win_rate: number;
          total_pnl: number;
        }[];
      };
      get_periodic_performance: {
        Args: {
          p_user_id: string;
          p_period_type?: string;
          p_num_periods?: number;
          p_account_ids?: string[];
        };
        Returns: {
          period_key: string;
          period_label: string;
          period_start: string;
          period_end: string;
          total_trades: number;
          winning_trades: number;
          losing_trades: number;
          win_rate: number;
          total_pnl: number;
          avg_pnl: number;
          largest_win: number;
          largest_loss: number;
          long_trades: number;
          short_trades: number;
          total_risk_reward: number;
          gross_profit: number;
          gross_loss: number;
          profit_factor: number;
        }[];
      };
    };
  };
}

// Periodic performance row type
export type PeriodicPerformanceRow =
  Database["public"]["Functions"]["get_periodic_performance"]["Returns"][number];

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type Strategy = Database["public"]["Tables"]["strategies"]["Row"];
export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type DailySummary = Database["public"]["Tables"]["daily_summaries"]["Row"];

export type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];
export type TradeUpdate = Database["public"]["Tables"]["trades"]["Update"];
export type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
export type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];
export type StrategyInsert = Database["public"]["Tables"]["strategies"]["Insert"];
export type StrategyUpdate = Database["public"]["Tables"]["strategies"]["Update"];
