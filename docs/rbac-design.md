# Role-Based Access Control (RBAC) System Design

## Document Overview

**Project:** Tralytic - Trading Analytics Platform
**Version:** 1.0
**Last Updated:** January 2026
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Role Architecture](#2-role-architecture)
3. [Subscription Model](#3-subscription-model)
4. [Permissions Matrix](#4-permissions-matrix)
5. [Database Schema](#5-database-schema)
6. [Access Control Rules](#6-access-control-rules)
7. [Implementation Guidelines](#7-implementation-guidelines)
8. [Security Considerations](#8-security-considerations)
9. [Future Considerations](#9-future-considerations)

---

## 1. Executive Summary

This document outlines the Role-Based Access Control (RBAC) system for Tralytic, a trading analytics platform. The system is designed to manage two distinct user categories:

1. **Administrative Users** - Platform operators with system management capabilities
2. **Platform Users** - End users who use the platform for trade analytics

The subscription model includes a free learning period for evaluation and a premium tier for full platform access.

### Key Design Principles

- **Principle of Least Privilege**: Users receive only the minimum permissions necessary
- **Separation of Concerns**: Admin and user functionalities are clearly separated
- **Data Isolation**: Users can only access their own data (enforced via RLS)
- **Subscription Enforcement**: Feature access is tied to subscription status
- **Audit Trail**: All permission-sensitive actions are logged

---

## 2. Role Architecture

### 2.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPER ADMIN                              │
│                    (Platform Owner/Founder)                      │
│                                                                  │
│  • Full system access                                            │
│  • Can create/manage Web Admins                                  │
│  • Billing & subscription management                             │
│  • System configuration                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         WEB ADMIN                                │
│                    (Platform Operators)                          │
│                                                                  │
│  • User management (view, support, suspend)                      │
│  • Content management (sample data, announcements)               │
│  • Support ticket handling                                       │
│  • Analytics dashboard (platform-wide)                           │
│  • Cannot create other Web Admins                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PLATFORM USERS                              │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   FREE TIER         │    │   PREMIUM TIER                  │ │
│  │   (Learning Period) │    │   (Subscribed Users)            │ │
│  │                     │    │                                 │ │
│  │ • Sample data only  │    │ • Full data import              │ │
│  │ • 7-14 day limit    │    │ • Unlimited trades              │ │
│  │ • View analytics    │    │ • All analytics features        │ │
│  │ • No real data      │    │ • Export capabilities           │ │
│  │   import            │    │ • Priority support              │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Role Definitions

#### SUPER_ADMIN
- **Description**: Platform owner with unrestricted access
- **Creation**: Manually seeded in database (never through UI)
- **Quantity**: Limited to 1-3 designated individuals
- **Key Authority**:
  - Create and revoke Web Admin roles
  - Access all system configurations
  - View and manage billing/subscriptions
  - Override any system restriction

#### WEB_ADMIN
- **Description**: Platform operators handling day-to-day management
- **Creation**: Created by Super Admin only
- **Key Responsibilities**:
  - User support and issue resolution
  - Content moderation and sample data management
  - Platform health monitoring
  - Cannot promote users to Web Admin status

#### PLATFORM_USER (Free Tier)
- **Description**: Users in evaluation/learning period
- **Creation**: Self-registration
- **Duration**: 7-14 days (configurable)
- **Restrictions**:
  - Can only use provided sample data
  - Cannot import personal trade data
  - Cannot export data
  - Full access to analytics features (with sample data)

#### PLATFORM_USER (Premium Tier)
- **Description**: Paying subscribers with full platform access
- **Creation**: Upgrade from free tier via subscription
- **Capabilities**:
  - Import unlimited trade data (CSV/Excel)
  - Full analytics and insights
  - Data export functionality
  - Priority support access

---

## 3. Subscription Model

### 3.1 Subscription States

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   SIGNUP     │────▶│  FREE TIER   │────▶│   PREMIUM    │
│              │     │  (Learning)  │     │   (Active)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                    │
                            │                    │
                            ▼                    ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   EXPIRED    │     │  CANCELLED   │
                     │  (No Access) │     │   (Grace)    │
                     └──────────────┘     └──────────────┘
```

### 3.2 Subscription Status Enum

```typescript
enum SubscriptionStatus {
  LEARNING = 'learning',      // Free trial period (7-14 days)
  ACTIVE = 'active',          // Paid subscription active
  PAST_DUE = 'past_due',      // Payment failed, grace period
  CANCELLED = 'cancelled',    // User cancelled, access until period ends
  EXPIRED = 'expired',        // Free trial ended, no subscription
  PAUSED = 'paused'           // Subscription paused (future feature)
}
```

### 3.3 Pricing Structure

#### Early Adopter Pricing (First 1,000 Users)

| Billing Cycle | Monthly Cost | Annual Cost | Savings |
|---------------|--------------|-------------|---------|
| Monthly       | $23/month    | $276/year   | -       |
| Annual        | $19/month    | $228/year   | $48/year (17%) |

#### Standard Pricing (After 1,000 Users)

| Billing Cycle | Monthly Cost | Annual Cost | Savings |
|---------------|--------------|-------------|---------|
| Monthly       | $42/month    | $504/year   | -       |
| Annual        | $35/month    | $420/year   | $84/year (17%) |

### 3.4 Pricing Configuration

```typescript
const PRICING_CONFIG = {
  earlyAdopterThreshold: 1000,

  earlyAdopter: {
    monthly: {
      amount: 2300,  // cents
      interval: 'month',
      currency: 'usd'
    },
    annual: {
      amount: 22800, // cents ($19 × 12)
      interval: 'year',
      currency: 'usd'
    }
  },

  standard: {
    monthly: {
      amount: 4200,  // cents
      interval: 'month',
      currency: 'usd'
    },
    annual: {
      amount: 42000, // cents ($35 × 12)
      interval: 'year',
      currency: 'usd'
    }
  },

  learningPeriod: {
    minDays: 7,
    maxDays: 14,
    defaultDays: 14
  }
};
```

### 3.5 Learning Period Rules

1. **Duration**: Configurable between 7-14 days (default: 14 days)
2. **Sample Data Only**: 2-3 pre-loaded sample Excel/CSV files
3. **No Data Import**: Import functionality disabled for real data
4. **Full Analytics Access**: Users can explore all analytics features
5. **No Export**: Export functionality disabled
6. **Countdown Display**: Show remaining days prominently

#### Sample Data Provided

| File | Description | Records | Purpose |
|------|-------------|---------|---------|
| `sample_trades_basic.csv` | Basic trade entries | ~50 trades | Demonstrates import mapping |
| `sample_trades_advanced.csv` | Detailed trade data | ~100 trades | Shows full field mapping |
| `sample_multi_account.csv` | Multi-account trades | ~75 trades | Demonstrates account separation |

---

## 4. Permissions Matrix

### 4.1 Permission Categories

```typescript
enum PermissionCategory {
  USER_MANAGEMENT = 'user_management',
  ADMIN_MANAGEMENT = 'admin_management',
  TRADE_MANAGEMENT = 'trade_management',
  DATA_IMPORT = 'data_import',
  DATA_EXPORT = 'data_export',
  ANALYTICS = 'analytics',
  ACCOUNT_MANAGEMENT = 'account_management',
  BILLING = 'billing',
  SYSTEM_CONFIG = 'system_config',
  SUPPORT = 'support'
}
```

### 4.2 Granular Permissions

```typescript
const PERMISSIONS = {
  // User Management
  'users:view': 'View user list and details',
  'users:edit': 'Edit user profile information',
  'users:suspend': 'Suspend/unsuspend user accounts',
  'users:delete': 'Delete user accounts',
  'users:impersonate': 'Impersonate users for support',

  // Admin Management (Super Admin Only)
  'admins:create': 'Create new web admin accounts',
  'admins:edit': 'Edit web admin permissions',
  'admins:revoke': 'Revoke web admin access',
  'admins:view': 'View all admin accounts',

  // Trade Management
  'trades:create': 'Create new trade entries',
  'trades:read': 'View trade entries',
  'trades:update': 'Edit trade entries',
  'trades:delete': 'Delete trade entries',
  'trades:bulk_edit': 'Bulk edit operations',

  // Data Import
  'import:sample': 'Import sample data files',
  'import:own_data': 'Import personal trade data',
  'import:mapping': 'Access column mapping feature',

  // Data Export
  'export:csv': 'Export data to CSV',
  'export:excel': 'Export data to Excel',
  'export:pdf': 'Export reports to PDF',

  // Analytics
  'analytics:basic': 'View basic analytics dashboard',
  'analytics:advanced': 'Access advanced analytics',
  'analytics:custom_reports': 'Create custom reports',
  'analytics:platform_wide': 'View platform-wide metrics (admin)',

  // Account Management
  'accounts:create': 'Create trading accounts',
  'accounts:read': 'View trading accounts',
  'accounts:update': 'Edit trading accounts',
  'accounts:delete': 'Delete trading accounts',

  // Strategy Management
  'strategies:create': 'Create trading strategies',
  'strategies:read': 'View trading strategies',
  'strategies:update': 'Edit trading strategies',
  'strategies:delete': 'Delete trading strategies',

  // Billing & Subscription
  'billing:view_own': 'View own billing history',
  'billing:manage_own': 'Manage own subscription',
  'billing:view_all': 'View all billing data (admin)',
  'billing:manage_all': 'Manage any subscription (admin)',
  'billing:refund': 'Process refunds',

  // System Configuration
  'config:pricing': 'Modify pricing configuration',
  'config:features': 'Enable/disable features',
  'config:sample_data': 'Manage sample data files',
  'config:announcements': 'Manage system announcements',

  // Support
  'support:tickets_own': 'Create and view own tickets',
  'support:tickets_all': 'View and respond to all tickets',
  'support:escalate': 'Escalate support tickets'
} as const;
```

### 4.3 Role-Permission Mapping

| Permission | Super Admin | Web Admin | Premium User | Free User |
|------------|:-----------:|:---------:|:------------:|:---------:|
| **User Management** |
| users:view | ✅ | ✅ | ❌ | ❌ |
| users:edit | ✅ | ✅ | ❌ | ❌ |
| users:suspend | ✅ | ✅ | ❌ | ❌ |
| users:delete | ✅ | ❌ | ❌ | ❌ |
| users:impersonate | ✅ | ✅ | ❌ | ❌ |
| **Admin Management** |
| admins:create | ✅ | ❌ | ❌ | ❌ |
| admins:edit | ✅ | ❌ | ❌ | ❌ |
| admins:revoke | ✅ | ❌ | ❌ | ❌ |
| admins:view | ✅ | ❌ | ❌ | ❌ |
| **Trade Management** |
| trades:create | ✅ | ❌ | ✅ | ✅* |
| trades:read | ✅ | ❌ | ✅ | ✅ |
| trades:update | ✅ | ❌ | ✅ | ✅* |
| trades:delete | ✅ | ❌ | ✅ | ✅* |
| trades:bulk_edit | ✅ | ❌ | ✅ | ❌ |
| **Data Import** |
| import:sample | ✅ | ❌ | ✅ | ✅ |
| import:own_data | ✅ | ❌ | ✅ | ❌ |
| import:mapping | ✅ | ❌ | ✅ | ✅ |
| **Data Export** |
| export:csv | ✅ | ❌ | ✅ | ❌ |
| export:excel | ✅ | ❌ | ✅ | ❌ |
| export:pdf | ✅ | ❌ | ✅ | ❌ |
| **Analytics** |
| analytics:basic | ✅ | ✅ | ✅ | ✅ |
| analytics:advanced | ✅ | ✅ | ✅ | ✅ |
| analytics:custom_reports | ✅ | ❌ | ✅ | ❌ |
| analytics:platform_wide | ✅ | ✅ | ❌ | ❌ |
| **Billing** |
| billing:view_own | ❌ | ❌ | ✅ | ✅ |
| billing:manage_own | ❌ | ❌ | ✅ | ✅ |
| billing:view_all | ✅ | ✅ | ❌ | ❌ |
| billing:manage_all | ✅ | ❌ | ❌ | ❌ |
| billing:refund | ✅ | ❌ | ❌ | ❌ |
| **System Config** |
| config:pricing | ✅ | ❌ | ❌ | ❌ |
| config:features | ✅ | ❌ | ❌ | ❌ |
| config:sample_data | ✅ | ✅ | ❌ | ❌ |
| config:announcements | ✅ | ✅ | ❌ | ❌ |
| **Support** |
| support:tickets_own | ✅ | ✅ | ✅ | ✅ |
| support:tickets_all | ✅ | ✅ | ❌ | ❌ |
| support:escalate | ✅ | ✅ | ❌ | ❌ |

*\* Free users can only modify sample data, not import their own*

---

## 5. Database Schema

### 5.1 New Tables

```sql
-- =============================================
-- RBAC SCHEMA EXTENSION FOR TRALYTICS
-- =============================================

-- Enum types
CREATE TYPE user_role AS ENUM ('super_admin', 'web_admin', 'platform_user');
CREATE TYPE subscription_status AS ENUM ('learning', 'active', 'past_due', 'cancelled', 'expired', 'paused');
CREATE TYPE billing_interval AS ENUM ('month', 'year');

-- =============================================
-- ROLES TABLE
-- =============================================
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT TRUE, -- System roles cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles
INSERT INTO public.roles (name, display_name, description, is_admin, is_system) VALUES
    ('super_admin', 'Super Administrator', 'Full system access with ability to create admins', TRUE, TRUE),
    ('web_admin', 'Web Administrator', 'Platform operator with user management capabilities', TRUE, TRUE),
    ('platform_user', 'Platform User', 'Standard platform user', FALSE, TRUE);

-- =============================================
-- PERMISSIONS TABLE
-- =============================================
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed permissions (abbreviated - full list in implementation)
INSERT INTO public.permissions (name, display_name, category) VALUES
    -- Admin Management
    ('admins:create', 'Create Web Admins', 'admin_management'),
    ('admins:edit', 'Edit Web Admins', 'admin_management'),
    ('admins:revoke', 'Revoke Admin Access', 'admin_management'),
    ('admins:view', 'View All Admins', 'admin_management'),

    -- User Management
    ('users:view', 'View Users', 'user_management'),
    ('users:edit', 'Edit Users', 'user_management'),
    ('users:suspend', 'Suspend Users', 'user_management'),
    ('users:delete', 'Delete Users', 'user_management'),
    ('users:impersonate', 'Impersonate Users', 'user_management'),

    -- Trade Management
    ('trades:create', 'Create Trades', 'trade_management'),
    ('trades:read', 'View Trades', 'trade_management'),
    ('trades:update', 'Update Trades', 'trade_management'),
    ('trades:delete', 'Delete Trades', 'trade_management'),
    ('trades:bulk_edit', 'Bulk Edit Trades', 'trade_management'),

    -- Data Import
    ('import:sample', 'Import Sample Data', 'data_import'),
    ('import:own_data', 'Import Own Data', 'data_import'),
    ('import:mapping', 'Access Import Mapping', 'data_import'),

    -- Data Export
    ('export:csv', 'Export to CSV', 'data_export'),
    ('export:excel', 'Export to Excel', 'data_export'),
    ('export:pdf', 'Export to PDF', 'data_export'),

    -- Analytics
    ('analytics:basic', 'Basic Analytics', 'analytics'),
    ('analytics:advanced', 'Advanced Analytics', 'analytics'),
    ('analytics:custom_reports', 'Custom Reports', 'analytics'),
    ('analytics:platform_wide', 'Platform Analytics', 'analytics'),

    -- Billing
    ('billing:view_own', 'View Own Billing', 'billing'),
    ('billing:manage_own', 'Manage Own Subscription', 'billing'),
    ('billing:view_all', 'View All Billing', 'billing'),
    ('billing:manage_all', 'Manage All Subscriptions', 'billing'),
    ('billing:refund', 'Process Refunds', 'billing'),

    -- System Config
    ('config:pricing', 'Configure Pricing', 'system_config'),
    ('config:features', 'Configure Features', 'system_config'),
    ('config:sample_data', 'Manage Sample Data', 'system_config'),
    ('config:announcements', 'Manage Announcements', 'system_config');

-- =============================================
-- ROLE_PERMISSIONS TABLE (Many-to-Many)
-- =============================================
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Index for faster lookups
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON public.role_permissions(permission_id);

-- =============================================
-- USER_ROLES TABLE
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL means never expires
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_id)
);

-- Index for faster lookups
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role_id);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Subscription Status
    status subscription_status NOT NULL DEFAULT 'learning',

    -- Learning Period
    learning_started_at TIMESTAMPTZ DEFAULT NOW(),
    learning_ends_at TIMESTAMPTZ,
    learning_duration_days INTEGER DEFAULT 14,

    -- Premium Subscription
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),

    -- Billing Details
    billing_interval billing_interval,
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'usd',

    -- Pricing Tier (early adopter vs standard)
    is_early_adopter BOOLEAN DEFAULT FALSE,
    early_adopter_locked_at TIMESTAMPTZ, -- When they locked in early adopter pricing

    -- Dates
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- =============================================
-- SAMPLE_DATA_FILES TABLE
-- =============================================
CREATE TABLE public.sample_data_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL, -- 'csv', 'xlsx'
    record_count INTEGER,
    column_mapping JSONB, -- Pre-configured column mappings
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER_SAMPLE_DATA TABLE (Tracks sample data usage)
-- =============================================
CREATE TABLE public.user_sample_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sample_file_id UUID NOT NULL REFERENCES public.sample_data_files(id) ON DELETE CASCADE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    record_count INTEGER,
    UNIQUE(user_id, sample_file_id)
);

-- =============================================
-- AUDIT_LOG TABLE
-- =============================================
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    user_role VARCHAR(50),

    -- Action
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,

    -- Details
    details JSONB,
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

-- =============================================
-- PLATFORM_METRICS TABLE (For admin dashboard)
-- =============================================
CREATE TABLE public.platform_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL UNIQUE,

    -- User Metrics
    total_users INTEGER DEFAULT 0,
    new_users_today INTEGER DEFAULT 0,
    active_users_today INTEGER DEFAULT 0,

    -- Subscription Metrics
    total_learning INTEGER DEFAULT 0,
    total_premium INTEGER DEFAULT 0,
    total_expired INTEGER DEFAULT 0,

    -- Conversion Metrics
    conversions_today INTEGER DEFAULT 0,
    churn_today INTEGER DEFAULT 0,

    -- Revenue (in cents)
    mrr_cents BIGINT DEFAULT 0,
    arr_cents BIGINT DEFAULT 0,

    -- Early Adopter Tracking
    early_adopter_slots_remaining INTEGER DEFAULT 1000,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EXTEND PROFILES TABLE
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
    is_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
    suspended_at TIMESTAMPTZ;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
    suspended_reason TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
    suspended_by UUID REFERENCES auth.users(id);
```

### 5.2 Database Functions

```sql
-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_user_id UUID,
    p_permission_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND p.name = p_permission_name
    ) INTO has_perm;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is an admin
CREATE OR REPLACE FUNCTION public.user_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = TRUE
          AND r.is_admin = TRUE
    ) INTO is_admin;

    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's subscription status
CREATE OR REPLACE FUNCTION public.get_subscription_status(p_user_id UUID)
RETURNS subscription_status AS $$
DECLARE
    sub_status subscription_status;
BEGIN
    SELECT status INTO sub_status
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    -- If no subscription record, they haven't started learning yet
    IF sub_status IS NULL THEN
        RETURN 'learning'::subscription_status;
    END IF;

    RETURN sub_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can import own data
CREATE OR REPLACE FUNCTION public.can_import_own_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_status subscription_status;
BEGIN
    SELECT status INTO sub_status
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    -- Only active premium users can import their own data
    RETURN sub_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check learning period status
CREATE OR REPLACE FUNCTION public.check_learning_period(p_user_id UUID)
RETURNS TABLE (
    is_in_learning BOOLEAN,
    days_remaining INTEGER,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.status = 'learning' AS is_in_learning,
        GREATEST(0, EXTRACT(DAY FROM (s.learning_ends_at - NOW()))::INTEGER) AS days_remaining,
        s.learning_ends_at AS expires_at
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize user subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
    learning_days INTEGER := 14;
    early_adopter_count INTEGER;
BEGIN
    -- Check if user qualifies for early adopter pricing
    SELECT COALESCE(
        (SELECT early_adopter_slots_remaining
         FROM public.platform_metrics
         ORDER BY metric_date DESC
         LIMIT 1),
        1000
    ) INTO early_adopter_count;

    -- Create subscription record
    INSERT INTO public.subscriptions (
        user_id,
        status,
        learning_started_at,
        learning_ends_at,
        learning_duration_days,
        is_early_adopter
    ) VALUES (
        NEW.id,
        'learning',
        NOW(),
        NOW() + (learning_days || ' days')::INTERVAL,
        learning_days,
        early_adopter_count > 0
    );

    -- Assign default platform_user role
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, r.id
    FROM public.roles r
    WHERE r.name = 'platform_user';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to expire learning periods (run via cron)
CREATE OR REPLACE FUNCTION public.expire_learning_periods()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'learning'
      AND learning_ends_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.3 Row Level Security Policies

```sql
-- =============================================
-- RLS POLICIES FOR RBAC TABLES
-- =============================================

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_data_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sample_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Roles: Everyone can read, only super_admin can modify
CREATE POLICY "Roles are viewable by everyone" ON public.roles
    FOR SELECT USING (TRUE);

CREATE POLICY "Only super_admin can modify roles" ON public.roles
    FOR ALL USING (public.user_has_permission(auth.uid(), 'admins:create'));

-- Permissions: Everyone can read
CREATE POLICY "Permissions are viewable by everyone" ON public.permissions
    FOR SELECT USING (TRUE);

-- Role Permissions: Everyone can read, only super_admin can modify
CREATE POLICY "Role permissions are viewable by everyone" ON public.role_permissions
    FOR SELECT USING (TRUE);

CREATE POLICY "Only super_admin can modify role permissions" ON public.role_permissions
    FOR ALL USING (public.user_has_permission(auth.uid(), 'admins:create'));

-- User Roles: Users can see own, admins can see all
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (
        user_id = auth.uid() OR
        public.user_is_admin(auth.uid())
    );

CREATE POLICY "Only super_admin can assign admin roles" ON public.user_roles
    FOR INSERT WITH CHECK (
        public.user_has_permission(auth.uid(), 'admins:create')
    );

CREATE POLICY "Only super_admin can modify admin roles" ON public.user_roles
    FOR UPDATE USING (
        public.user_has_permission(auth.uid(), 'admins:create')
    );

-- Subscriptions: Users can see own, admins can see all
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (
        user_id = auth.uid() OR
        public.user_is_admin(auth.uid())
    );

CREATE POLICY "Users can update own subscription" ON public.subscriptions
    FOR UPDATE USING (
        user_id = auth.uid() OR
        public.user_has_permission(auth.uid(), 'billing:manage_all')
    );

-- Sample Data Files: Everyone can read active files
CREATE POLICY "Everyone can view active sample files" ON public.sample_data_files
    FOR SELECT USING (is_active = TRUE OR public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can manage sample files" ON public.sample_data_files
    FOR ALL USING (
        public.user_has_permission(auth.uid(), 'config:sample_data')
    );

-- User Sample Data: Users can see own
CREATE POLICY "Users can view own sample data usage" ON public.user_sample_data
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can import sample data" ON public.user_sample_data
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Audit Log: Only admins can view
CREATE POLICY "Only admins can view audit log" ON public.audit_log
    FOR SELECT USING (public.user_is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_log
    FOR INSERT WITH CHECK (TRUE);

-- Platform Metrics: Only admins can view
CREATE POLICY "Only admins can view platform metrics" ON public.platform_metrics
    FOR SELECT USING (public.user_is_admin(auth.uid()));

-- =============================================
-- UPDATE EXISTING TABLE POLICIES
-- =============================================

-- Trades: Add restriction for learning users
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades" ON public.trades
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        (
            public.get_subscription_status(auth.uid()) = 'active' OR
            public.user_is_admin(auth.uid())
            -- Learning users can only insert via sample data import
        )
    );
```

---

## 6. Access Control Rules

### 6.1 Learning Period Restrictions

```typescript
const LEARNING_PERIOD_RESTRICTIONS = {
  // Data Import
  canImportOwnData: false,
  canImportSampleData: true,
  maxSampleFilesAllowed: 3,

  // Data Operations
  canCreateTrades: true,        // Only via sample import
  canEditTrades: true,          // Only sample data
  canDeleteTrades: true,        // Only sample data
  canBulkEdit: false,

  // Export
  canExportCSV: false,
  canExportExcel: false,
  canExportPDF: false,

  // Analytics
  canViewBasicAnalytics: true,
  canViewAdvancedAnalytics: true,
  canCreateCustomReports: false,

  // Other
  maxAccounts: 2,
  maxStrategies: 3,
  showUpgradePrompts: true,
  showDaysRemaining: true
};
```

### 6.2 Premium Tier Capabilities

```typescript
const PREMIUM_CAPABILITIES = {
  // Data Import
  canImportOwnData: true,
  canImportSampleData: true,
  supportedFileTypes: ['csv', 'xlsx', 'xls'],
  maxFileSize: '50MB',

  // Data Operations
  canCreateTrades: true,
  canEditTrades: true,
  canDeleteTrades: true,
  canBulkEdit: true,

  // Export
  canExportCSV: true,
  canExportExcel: true,
  canExportPDF: true,

  // Analytics
  canViewBasicAnalytics: true,
  canViewAdvancedAnalytics: true,
  canCreateCustomReports: true,

  // Limits
  maxAccounts: 'unlimited',
  maxStrategies: 'unlimited',
  maxTradesPerMonth: 'unlimited',

  // Support
  supportLevel: 'priority',
  responseTime: '24 hours'
};
```

### 6.3 Import Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      IMPORT REQUEST                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              CHECK SUBSCRIPTION STATUS                           │
│                                                                  │
│  subscription.status === ?                                       │
└─────────────────────────────────────────────────────────────────┘
              │                              │
              │ 'learning'                   │ 'active'
              ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│   IS SAMPLE FILE?       │    │      ALLOW IMPORT               │
│                         │    │                                 │
│  Check against          │    │  • Validate file format         │
│  sample_data_files      │    │  • Process column mapping       │
│  table                  │    │  • Import trade records         │
└─────────────────────────┘    └─────────────────────────────────┘
         │           │
         │ Yes       │ No
         ▼           ▼
┌──────────────┐  ┌──────────────────────────────────────────────┐
│ ALLOW SAMPLE │  │              BLOCK IMPORT                     │
│ IMPORT       │  │                                              │
│              │  │  Error: "Upgrade to Premium to import        │
│              │  │          your own trading data"              │
└──────────────┘  └──────────────────────────────────────────────┘
```

---

## 7. Implementation Guidelines

### 7.1 TypeScript Types

```typescript
// types/rbac.ts

export type UserRole = 'super_admin' | 'web_admin' | 'platform_user';

export type SubscriptionStatus =
  | 'learning'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'paused';

export type BillingInterval = 'month' | 'year';

export interface Role {
  id: string;
  name: UserRole;
  displayName: string;
  description: string | null;
  isAdmin: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
  createdAt: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string | null;
  assignedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  role?: Role;
}

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;

  // Learning period
  learningStartedAt: string;
  learningEndsAt: string | null;
  learningDurationDays: number;

  // Stripe
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;

  // Billing
  billingInterval: BillingInterval | null;
  amountCents: number | null;
  currency: string;

  // Early adopter
  isEarlyAdopter: boolean;
  earlyAdopterLockedAt: string | null;

  // Period
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface UserWithRBAC {
  id: string;
  email: string;
  roles: Role[];
  permissions: string[];
  subscription: Subscription;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}
```

### 7.2 Permission Hook

```typescript
// hooks/usePermissions.ts

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserWithRBAC, Permission, Subscription } from '@/types/rbac';

export function usePermissions() {
  const [user, setUser] = useState<UserWithRBAC | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadUserPermissions() {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch user roles and permissions
      const { data: roles } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('user_id', authUser.id)
        .eq('is_active', true);

      // Fetch subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      // Fetch permissions for user's roles
      const roleIds = roles?.map(r => r.role_id) || [];
      const { data: permissions } = await supabase
        .from('role_permissions')
        .select('permission:permissions(name)')
        .in('role_id', roleIds);

      const permissionNames = permissions?.map(p => p.permission?.name).filter(Boolean) || [];
      const userRoles = roles?.map(r => r.role) || [];

      setUser({
        id: authUser.id,
        email: authUser.email!,
        roles: userRoles,
        permissions: permissionNames,
        subscription: subscription as Subscription,
        isAdmin: userRoles.some(r => r.isAdmin),
        isSuperAdmin: userRoles.some(r => r.name === 'super_admin')
      });

      setLoading(false);
    }

    loadUserPermissions();
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true; // Super admin has all permissions
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  const isInLearningPeriod = (): boolean => {
    return user?.subscription?.status === 'learning';
  };

  const isPremium = (): boolean => {
    return user?.subscription?.status === 'active';
  };

  const canImportOwnData = (): boolean => {
    return isPremium() || user?.isAdmin === true;
  };

  const getLearningDaysRemaining = (): number => {
    if (!user?.subscription?.learningEndsAt) return 0;
    const endsAt = new Date(user.subscription.learningEndsAt);
    const now = new Date();
    const diff = endsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return {
    user,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isInLearningPeriod,
    isPremium,
    canImportOwnData,
    getLearningDaysRemaining,
    isAdmin: user?.isAdmin ?? false,
    isSuperAdmin: user?.isSuperAdmin ?? false
  };
}
```

### 7.3 Permission Guard Component

```typescript
// components/auth/PermissionGuard.tsx

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { redirect } from 'next/navigation';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  requirePremium?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  requirePremium = false,
  fallback = null,
  redirectTo
}: PermissionGuardProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isPremium,
    loading
  } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check premium requirement
  if (requirePremium && !isPremium()) {
    if (redirectTo) redirect(redirectTo);
    return <>{fallback}</>;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    if (redirectTo) redirect(redirectTo);
    return <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      if (redirectTo) redirect(redirectTo);
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Usage example:
// <PermissionGuard permission="import:own_data" fallback={<UpgradePrompt />}>
//   <ImportButton />
// </PermissionGuard>
```

### 7.4 Middleware Enhancement

```typescript
// middleware.ts (enhanced)

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require admin access
const ADMIN_ROUTES = ['/admin', '/admin/*'];

// Routes that require premium subscription
const PREMIUM_ROUTES = ['/import/own-data', '/export/*'];

// Routes that are blocked for expired subscriptions
const BLOCKED_WHEN_EXPIRED = ['/dashboard', '/trades', '/analytics'];

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  if (!user) {
    // Not authenticated - redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const pathname = request.nextUrl.pathname;

  // Check admin routes
  if (ADMIN_ROUTES.some(route => matchRoute(pathname, route))) {
    const { data: isAdmin } = await supabase.rpc('user_is_admin', {
      p_user_id: user.id
    });

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Check premium routes
  if (PREMIUM_ROUTES.some(route => matchRoute(pathname, route))) {
    const { data: status } = await supabase.rpc('get_subscription_status', {
      p_user_id: user.id
    });

    if (status !== 'active') {
      return NextResponse.redirect(new URL('/upgrade', request.url));
    }
  }

  // Check expired subscription
  if (BLOCKED_WHEN_EXPIRED.some(route => matchRoute(pathname, route))) {
    const { data: status } = await supabase.rpc('get_subscription_status', {
      p_user_id: user.id
    });

    if (status === 'expired') {
      return NextResponse.redirect(new URL('/subscription-expired', request.url));
    }
  }

  return response;
}

function matchRoute(pathname: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return pathname === base || pathname.startsWith(base + '/');
  }
  return pathname === pattern;
}
```

### 7.5 API Route Protection

```typescript
// lib/api/withPermission.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Handler = (
  request: NextRequest,
  context: { user: any; supabase: any }
) => Promise<NextResponse>;

export function withPermission(permission: string, handler: Handler) {
  return async (request: NextRequest) => {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission_name: permission
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: `Missing permission: ${permission}` },
        { status: 403 }
      );
    }

    return handler(request, { user, supabase });
  };
}

// Usage:
// export const POST = withPermission('import:own_data', async (req, { user, supabase }) => {
//   // Handler code here
// });
```

---

## 8. Security Considerations

### 8.1 Security Principles

1. **Defense in Depth**: Multiple layers of authorization checks
   - Middleware (route-level)
   - API routes (endpoint-level)
   - Database RLS (data-level)

2. **Fail Closed**: Default deny - explicitly grant permissions

3. **Audit Everything**: Log all permission-sensitive actions

4. **Separation of Duties**:
   - Only Super Admin can create Web Admins
   - Web Admins cannot elevate their own privileges

### 8.2 Attack Mitigation

| Attack Vector | Mitigation |
|---------------|------------|
| Privilege Escalation | RLS policies + API validation + DB functions |
| Subscription Bypass | Server-side validation, not client-side |
| Data Leakage | RLS enforces user_id filtering at DB level |
| Admin Impersonation | Role assignment requires super_admin permission |
| Learning Period Bypass | Server-side date validation, not client timestamps |

### 8.3 Audit Logging

All of the following actions should be logged:

- Role assignments/revocations
- Permission changes
- Subscription status changes
- Admin actions on user accounts
- Data imports (especially own data)
- Bulk operations
- Failed authorization attempts

---

## 9. Future Considerations

### 9.1 Potential Enhancements

1. **Team/Organization Support**
   - Multiple users under one subscription
   - Role hierarchy within teams
   - Data sharing between team members

2. **Additional Subscription Tiers**
   - Professional tier with advanced features
   - Enterprise tier with custom branding

3. **Granular Feature Flags**
   - A/B testing new features
   - Gradual feature rollouts

4. **API Access**
   - API keys for programmatic access
   - Rate limiting based on subscription tier

5. **White-label Support**
   - Broker partnerships
   - Custom branding options

### 9.2 Scalability Considerations

- Permission caching at session level
- Denormalized permission checks for high-frequency operations
- Background jobs for subscription status updates
- Metric aggregation for admin dashboard

---

## Appendix A: Sample Data Files Specification

### A.1 sample_trades_basic.csv

**Purpose**: Demonstrates basic import mapping
**Records**: 50 trades
**Columns**:
- date, time, symbol, direction, entry_price, exit_price, quantity, pnl

### A.2 sample_trades_advanced.csv

**Purpose**: Shows full field mapping
**Records**: 100 trades
**Columns**:
- All basic columns plus: account, strategy, session, market, setup_type, risk_amount, notes, tags

### A.3 sample_multi_account.csv

**Purpose**: Demonstrates multi-account functionality
**Records**: 75 trades across 3 accounts
**Columns**:
- Similar to advanced, with clear account differentiation

---

## Appendix B: Early Adopter Tracking Logic

```typescript
async function checkEarlyAdopterEligibility(userId: string): Promise<boolean> {
  const supabase = createClient();

  // Get current early adopter count
  const { data: metrics } = await supabase
    .from('platform_metrics')
    .select('early_adopter_slots_remaining')
    .order('metric_date', { ascending: false })
    .limit(1)
    .single();

  // Check if user is already an early adopter
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('is_early_adopter, early_adopter_locked_at')
    .eq('user_id', userId)
    .single();

  // If already locked in as early adopter, they keep the pricing
  if (subscription?.is_early_adopter && subscription?.early_adopter_locked_at) {
    return true;
  }

  // Otherwise, check if slots are available
  return (metrics?.early_adopter_slots_remaining ?? 0) > 0;
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | System | Initial design document |
