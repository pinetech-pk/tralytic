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
          trade_columns: string[] | null;
          is_admin: boolean | null;
          suspended_at: string | null;
          suspended_reason: string | null;
          suspended_by: string | null;
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
          trade_columns?: string[] | null;
          is_admin?: boolean | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          suspended_by?: string | null;
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
          trade_columns?: string[] | null;
          is_admin?: boolean | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          suspended_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey";
            columns: ["suspended_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
          is_archived: boolean;
          archived_at: string | null;
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
          is_archived?: boolean;
          archived_at?: string | null;
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
          is_archived?: boolean;
          archived_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_strategy_id_fkey";
            columns: ["strategy_id"];
            isOneToOne: false;
            referencedRelation: "strategies";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_trade_id_fkey";
            columns: ["trade_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "daily_summaries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_summaries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          is_admin: boolean | null;
          is_system: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          is_admin?: boolean | null;
          is_system?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          display_name?: string;
          description?: string | null;
          is_admin?: boolean | null;
          is_system?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          category: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          category: string;
          created_at?: string | null;
        };
        Update: {
          name?: string;
          display_name?: string;
          description?: string | null;
          category?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          permission_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          role_id: string;
          permission_id: string;
          created_at?: string | null;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          }
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          assigned_by: string | null;
          assigned_at: string | null;
          expires_at: string | null;
          is_active: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          assigned_by?: string | null;
          assigned_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          assigned_by?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          learning_started_at: string | null;
          learning_ends_at: string | null;
          learning_duration_days: number | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          billing_interval: Database["public"]["Enums"]["billing_interval"] | null;
          amount_cents: number | null;
          currency: string | null;
          is_early_adopter: boolean | null;
          early_adopter_locked_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancelled_at: string | null;
          cancel_at_period_end: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          learning_started_at?: string | null;
          learning_ends_at?: string | null;
          learning_duration_days?: number | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          billing_interval?: Database["public"]["Enums"]["billing_interval"] | null;
          amount_cents?: number | null;
          currency?: string | null;
          is_early_adopter?: boolean | null;
          early_adopter_locked_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancelled_at?: string | null;
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          status?: Database["public"]["Enums"]["subscription_status"];
          learning_started_at?: string | null;
          learning_ends_at?: string | null;
          learning_duration_days?: number | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          billing_interval?: Database["public"]["Enums"]["billing_interval"] | null;
          amount_cents?: number | null;
          currency?: string | null;
          is_early_adopter?: boolean | null;
          early_adopter_locked_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancelled_at?: string | null;
          cancel_at_period_end?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      sample_data_files: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          file_path: string;
          file_type: string;
          record_count: number | null;
          column_mapping: Json | null;
          is_active: boolean | null;
          sort_order: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          file_path: string;
          file_type: string;
          record_count?: number | null;
          column_mapping?: Json | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          display_name?: string;
          description?: string | null;
          file_path?: string;
          file_type?: string;
          record_count?: number | null;
          column_mapping?: Json | null;
          is_active?: boolean | null;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_sample_data: {
        Row: {
          id: string;
          user_id: string;
          sample_file_id: string;
          imported_at: string | null;
          record_count: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          sample_file_id: string;
          imported_at?: string | null;
          record_count?: number | null;
        };
        Update: {
          user_id?: string;
          sample_file_id?: string;
          imported_at?: string | null;
          record_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_sample_data_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_sample_data_sample_file_id_fkey";
            columns: ["sample_file_id"];
            isOneToOne: false;
            referencedRelation: "sample_data_files";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          user_email: string | null;
          user_role: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          user_role?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
        Update: {
          user_id?: string | null;
          user_email?: string | null;
          user_role?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      platform_metrics: {
        Row: {
          id: string;
          metric_date: string;
          total_users: number | null;
          new_users_today: number | null;
          active_users_today: number | null;
          total_learning: number | null;
          total_premium: number | null;
          total_expired: number | null;
          conversions_today: number | null;
          churn_today: number | null;
          mrr_cents: number | null;
          arr_cents: number | null;
          early_adopter_slots_remaining: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          metric_date: string;
          total_users?: number | null;
          new_users_today?: number | null;
          active_users_today?: number | null;
          total_learning?: number | null;
          total_premium?: number | null;
          total_expired?: number | null;
          conversions_today?: number | null;
          churn_today?: number | null;
          mrr_cents?: number | null;
          arr_cents?: number | null;
          early_adopter_slots_remaining?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          metric_date?: string;
          total_users?: number | null;
          new_users_today?: number | null;
          active_users_today?: number | null;
          total_learning?: number | null;
          total_premium?: number | null;
          total_expired?: number | null;
          conversions_today?: number | null;
          churn_today?: number | null;
          mrr_cents?: number | null;
          arr_cents?: number | null;
          early_adopter_slots_remaining?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      // Every trade, tagged with its account's archive state (migration 007).
      // Read-only; filter on account_is_archived to scope analytics.
      trades_with_archive: {
        Row: Database["public"]["Tables"]["trades"]["Row"] & {
          account_is_archived: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_strategy_id_fkey";
            columns: ["strategy_id"];
            isOneToOne: false;
            referencedRelation: "strategies";
            referencedColumns: ["id"];
          }
        ];
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
          p_include_archived?: boolean;
          p_strategy_id?: string;
          p_no_strategy?: boolean;
          p_exclude_weekends?: boolean;
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
      user_has_permission: {
        Args: {
          p_user_id: string;
          p_permission_name: string;
        };
        Returns: boolean;
      };
      user_is_admin: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
      user_is_super_admin: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
      get_subscription_status: {
        Args: {
          p_user_id: string;
        };
        Returns: Database["public"]["Enums"]["subscription_status"];
      };
      can_import_own_data: {
        Args: {
          p_user_id: string;
        };
        Returns: boolean;
      };
      check_learning_period: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          is_in_learning: boolean;
          days_remaining: number;
          ends_at: string;
        }[];
      };
      expire_learning_periods: {
        Args: Record<string, never>;
        Returns: number;
      };
      log_audit_event: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_resource_type: string;
          p_resource_id?: string;
          p_details?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: "super_admin" | "web_admin" | "platform_user";
      subscription_status:
        | "learning"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
        | "paused";
      billing_interval: "month" | "year";
    };
    CompositeTypes: {
      [_ in never]: never;
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

// RBAC convenience types (migration 002)
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type Permission = Database["public"]["Tables"]["permissions"]["Row"];
export type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type PlatformMetrics = Database["public"]["Tables"]["platform_metrics"]["Row"];
export type AuditLogEntry = Database["public"]["Tables"]["audit_log"]["Row"];

export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
export type BillingInterval = Database["public"]["Enums"]["billing_interval"];
export type UserRoleName = Database["public"]["Enums"]["user_role"];
