-- =============================================
-- RBAC SYSTEM MIGRATION
-- Tralytic - Trading Analytics Platform
-- Version: 1.0
-- =============================================

-- =============================================
-- ENUM TYPES
-- =============================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'web_admin', 'platform_user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('learning', 'active', 'past_due', 'cancelled', 'expired', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_interval AS ENUM ('month', 'year');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- ROLES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles (idempotent)
INSERT INTO public.roles (name, display_name, description, is_admin, is_system) VALUES
    ('super_admin', 'Super Administrator', 'Full system access with ability to create and manage web admins', TRUE, TRUE),
    ('web_admin', 'Web Administrator', 'Platform operator with user management and support capabilities', TRUE, TRUE),
    ('platform_user', 'Platform User', 'Standard platform user for trade analytics', FALSE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- PERMISSIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed permissions (idempotent)
INSERT INTO public.permissions (name, display_name, description, category) VALUES
    -- Admin Management (Super Admin Only)
    ('admins:create', 'Create Web Admins', 'Create new web administrator accounts', 'admin_management'),
    ('admins:edit', 'Edit Web Admins', 'Edit web administrator details and permissions', 'admin_management'),
    ('admins:revoke', 'Revoke Admin Access', 'Revoke web administrator privileges', 'admin_management'),
    ('admins:view', 'View All Admins', 'View list of all administrator accounts', 'admin_management'),

    -- User Management
    ('users:view', 'View Users', 'View user list and profile details', 'user_management'),
    ('users:edit', 'Edit Users', 'Edit user profile information', 'user_management'),
    ('users:suspend', 'Suspend Users', 'Suspend and unsuspend user accounts', 'user_management'),
    ('users:delete', 'Delete Users', 'Permanently delete user accounts', 'user_management'),
    ('users:impersonate', 'Impersonate Users', 'Log in as users for support purposes', 'user_management'),

    -- Trade Management
    ('trades:create', 'Create Trades', 'Create new trade entries', 'trade_management'),
    ('trades:read', 'View Trades', 'View trade entries and details', 'trade_management'),
    ('trades:update', 'Update Trades', 'Edit existing trade entries', 'trade_management'),
    ('trades:delete', 'Delete Trades', 'Delete trade entries', 'trade_management'),
    ('trades:bulk_edit', 'Bulk Edit Trades', 'Perform bulk edit operations on trades', 'trade_management'),

    -- Data Import
    ('import:sample', 'Import Sample Data', 'Import provided sample data files', 'data_import'),
    ('import:own_data', 'Import Own Data', 'Import personal trade data from CSV/Excel', 'data_import'),
    ('import:mapping', 'Access Import Mapping', 'Access column mapping feature during import', 'data_import'),

    -- Data Export
    ('export:csv', 'Export to CSV', 'Export trade data to CSV format', 'data_export'),
    ('export:excel', 'Export to Excel', 'Export trade data to Excel format', 'data_export'),
    ('export:pdf', 'Export to PDF', 'Export reports to PDF format', 'data_export'),

    -- Analytics
    ('analytics:basic', 'Basic Analytics', 'View basic analytics dashboard', 'analytics'),
    ('analytics:advanced', 'Advanced Analytics', 'Access advanced analytics features', 'analytics'),
    ('analytics:custom_reports', 'Custom Reports', 'Create and save custom reports', 'analytics'),
    ('analytics:platform_wide', 'Platform Analytics', 'View platform-wide metrics (admin only)', 'analytics'),

    -- Account Management
    ('accounts:create', 'Create Accounts', 'Create trading accounts', 'account_management'),
    ('accounts:read', 'View Accounts', 'View trading account details', 'account_management'),
    ('accounts:update', 'Update Accounts', 'Edit trading account settings', 'account_management'),
    ('accounts:delete', 'Delete Accounts', 'Delete trading accounts', 'account_management'),

    -- Strategy Management
    ('strategies:create', 'Create Strategies', 'Create trading strategies', 'strategy_management'),
    ('strategies:read', 'View Strategies', 'View trading strategy details', 'strategy_management'),
    ('strategies:update', 'Update Strategies', 'Edit trading strategies', 'strategy_management'),
    ('strategies:delete', 'Delete Strategies', 'Delete trading strategies', 'strategy_management'),

    -- Billing & Subscription
    ('billing:view_own', 'View Own Billing', 'View personal billing history', 'billing'),
    ('billing:manage_own', 'Manage Own Subscription', 'Manage personal subscription', 'billing'),
    ('billing:view_all', 'View All Billing', 'View all billing data (admin)', 'billing'),
    ('billing:manage_all', 'Manage All Subscriptions', 'Manage any user subscription (admin)', 'billing'),
    ('billing:refund', 'Process Refunds', 'Process subscription refunds', 'billing'),

    -- System Configuration
    ('config:pricing', 'Configure Pricing', 'Modify subscription pricing', 'system_config'),
    ('config:features', 'Configure Features', 'Enable or disable platform features', 'system_config'),
    ('config:sample_data', 'Manage Sample Data', 'Upload and manage sample data files', 'system_config'),
    ('config:announcements', 'Manage Announcements', 'Create and manage system announcements', 'system_config'),

    -- Support
    ('support:tickets_own', 'Own Support Tickets', 'Create and view personal support tickets', 'support'),
    ('support:tickets_all', 'All Support Tickets', 'View and respond to all support tickets', 'support'),
    ('support:escalate', 'Escalate Tickets', 'Escalate support tickets to higher priority', 'support')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- ROLE_PERMISSIONS TABLE (Many-to-Many)
-- =============================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);

-- Assign permissions to Super Admin (all permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Web Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'web_admin'
  AND p.name IN (
    'users:view', 'users:edit', 'users:suspend', 'users:impersonate',
    'analytics:basic', 'analytics:advanced', 'analytics:platform_wide',
    'billing:view_all',
    'config:sample_data', 'config:announcements',
    'support:tickets_own', 'support:tickets_all', 'support:escalate'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Platform User (base permissions - premium features handled at subscription level)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'platform_user'
  AND p.name IN (
    'trades:create', 'trades:read', 'trades:update', 'trades:delete',
    'import:sample', 'import:mapping',
    'analytics:basic', 'analytics:advanced',
    'accounts:create', 'accounts:read', 'accounts:update', 'accounts:delete',
    'strategies:create', 'strategies:read', 'strategies:update', 'strategies:delete',
    'billing:view_own', 'billing:manage_own',
    'support:tickets_own'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================
-- USER_ROLES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Subscription Status
    status subscription_status NOT NULL DEFAULT 'learning',

    -- Learning Period
    learning_started_at TIMESTAMPTZ DEFAULT NOW(),
    learning_ends_at TIMESTAMPTZ,
    learning_duration_days INTEGER DEFAULT 14,

    -- Premium Subscription (Stripe)
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),

    -- Billing Details
    billing_interval billing_interval,
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'usd',

    -- Early Adopter Pricing
    is_early_adopter BOOLEAN DEFAULT FALSE,
    early_adopter_locked_at TIMESTAMPTZ,

    -- Subscription Period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- =============================================
-- SAMPLE_DATA_FILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.sample_data_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    record_count INTEGER,
    column_mapping JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed sample data file records
INSERT INTO public.sample_data_files (name, display_name, description, file_path, file_type, record_count, sort_order)
VALUES
    ('sample_trades_basic', 'Basic Trades Sample', 'Simple trade data to demonstrate basic import mapping with essential fields', '/samples/sample_trades_basic.csv', 'csv', 50, 1),
    ('sample_trades_advanced', 'Advanced Trades Sample', 'Comprehensive trade data showing all available fields and mapping options', '/samples/sample_trades_advanced.csv', 'csv', 100, 2),
    ('sample_multi_account', 'Multi-Account Sample', 'Trade data across multiple accounts to demonstrate account separation', '/samples/sample_multi_account.csv', 'csv', 75, 3)
ON CONFLICT DO NOTHING;

-- =============================================
-- USER_SAMPLE_DATA TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_sample_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sample_file_id UUID NOT NULL REFERENCES public.sample_data_files(id) ON DELETE CASCADE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    record_count INTEGER,
    UNIQUE(user_id, sample_file_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sample_data_user ON public.user_sample_data(user_id);

-- =============================================
-- AUDIT_LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- =============================================
-- PLATFORM_METRICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.platform_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    new_users_today INTEGER DEFAULT 0,
    active_users_today INTEGER DEFAULT 0,
    total_learning INTEGER DEFAULT 0,
    total_premium INTEGER DEFAULT 0,
    total_expired INTEGER DEFAULT 0,
    conversions_today INTEGER DEFAULT 0,
    churn_today INTEGER DEFAULT 0,
    mrr_cents BIGINT DEFAULT 0,
    arr_cents BIGINT DEFAULT 0,
    early_adopter_slots_remaining INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with today's metrics
INSERT INTO public.platform_metrics (metric_date, early_adopter_slots_remaining)
VALUES (CURRENT_DATE, 1000)
ON CONFLICT (metric_date) DO NOTHING;

-- =============================================
-- EXTEND PROFILES TABLE
-- =============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

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
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND r.is_admin = TRUE
    ) INTO is_admin;

    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a super admin
CREATE OR REPLACE FUNCTION public.user_is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_super BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND r.name = 'super_admin'
    ) INTO is_super;

    RETURN is_super;
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

    IF sub_status IS NULL THEN
        RETURN 'learning'::subscription_status;
    END IF;

    RETURN sub_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can import their own data
CREATE OR REPLACE FUNCTION public.can_import_own_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_status subscription_status;
    is_admin BOOLEAN;
BEGIN
    -- Admins can always import
    SELECT public.user_is_admin(p_user_id) INTO is_admin;
    IF is_admin THEN
        RETURN TRUE;
    END IF;

    -- Check subscription status
    SELECT status INTO sub_status
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    RETURN sub_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check learning period status
CREATE OR REPLACE FUNCTION public.check_learning_period(p_user_id UUID)
RETURNS TABLE (
    is_in_learning BOOLEAN,
    days_remaining INTEGER,
    ends_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.status = 'learning' AS is_in_learning,
        GREATEST(0, EXTRACT(DAY FROM (s.learning_ends_at - NOW()))::INTEGER) AS days_remaining,
        s.learning_ends_at AS ends_at
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
    platform_user_role_id UUID;
BEGIN
    -- Get current early adopter slots
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

    -- Get platform_user role ID
    SELECT id INTO platform_user_role_id
    FROM public.roles
    WHERE name = 'platform_user';

    -- Assign default platform_user role
    IF platform_user_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, platform_user_role_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup (create subscription and assign role)
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to expire learning periods (run via cron job)
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

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    user_email VARCHAR;
    user_role VARCHAR;
BEGIN
    -- Get user email
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = p_user_id;

    -- Get user's primary role
    SELECT r.name INTO user_role
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
    ORDER BY r.is_admin DESC
    LIMIT 1;

    INSERT INTO public.audit_log (
        user_id,
        user_email,
        user_role,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        p_user_id,
        user_email,
        user_role,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_data_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sample_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Roles: Everyone can read
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;
CREATE POLICY "Roles are viewable by everyone" ON public.roles
    FOR SELECT USING (TRUE);

-- Permissions: Everyone can read
DROP POLICY IF EXISTS "Permissions are viewable by everyone" ON public.permissions;
CREATE POLICY "Permissions are viewable by everyone" ON public.permissions
    FOR SELECT USING (TRUE);

-- Role Permissions: Everyone can read
DROP POLICY IF EXISTS "Role permissions are viewable by everyone" ON public.role_permissions;
CREATE POLICY "Role permissions are viewable by everyone" ON public.role_permissions
    FOR SELECT USING (TRUE);

-- User Roles: Users can see own, admins can see all
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (
        user_id = auth.uid() OR
        public.user_is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Only super_admin can manage user roles" ON public.user_roles;
CREATE POLICY "Only super_admin can manage user roles" ON public.user_roles
    FOR ALL USING (
        public.user_is_super_admin(auth.uid())
    );

-- Subscriptions: Users can see own, admins can see all
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (
        user_id = auth.uid() OR
        public.user_is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription" ON public.subscriptions
    FOR UPDATE USING (
        user_id = auth.uid() OR
        public.user_has_permission(auth.uid(), 'billing:manage_all')
    );

-- Sample Data Files: Everyone can read active files
DROP POLICY IF EXISTS "Everyone can view active sample files" ON public.sample_data_files;
CREATE POLICY "Everyone can view active sample files" ON public.sample_data_files
    FOR SELECT USING (is_active = TRUE OR public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage sample files" ON public.sample_data_files;
CREATE POLICY "Admins can manage sample files" ON public.sample_data_files
    FOR ALL USING (
        public.user_has_permission(auth.uid(), 'config:sample_data')
    );

-- User Sample Data: Users can see and create own
DROP POLICY IF EXISTS "Users can view own sample data usage" ON public.user_sample_data;
CREATE POLICY "Users can view own sample data usage" ON public.user_sample_data
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can import sample data" ON public.user_sample_data;
CREATE POLICY "Users can import sample data" ON public.user_sample_data
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Audit Log: Only admins can view
DROP POLICY IF EXISTS "Only admins can view audit log" ON public.audit_log;
CREATE POLICY "Only admins can view audit log" ON public.audit_log
    FOR SELECT USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
CREATE POLICY "System can insert audit logs" ON public.audit_log
    FOR INSERT WITH CHECK (TRUE);

-- Platform Metrics: Only admins can view
DROP POLICY IF EXISTS "Only admins can view platform metrics" ON public.platform_metrics;
CREATE POLICY "Only admins can view platform metrics" ON public.platform_metrics
    FOR SELECT USING (public.user_is_admin(auth.uid()));

-- =============================================
-- UPDATE TIMESTAMP TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sample_data_files_updated_at ON public.sample_data_files;
CREATE TRIGGER update_sample_data_files_updated_at
    BEFORE UPDATE ON public.sample_data_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_metrics_updated_at ON public.platform_metrics;
CREATE TRIGGER update_platform_metrics_updated_at
    BEFORE UPDATE ON public.platform_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on types
GRANT USAGE ON TYPE user_role TO authenticated;
GRANT USAGE ON TYPE subscription_status TO authenticated;
GRANT USAGE ON TYPE billing_interval TO authenticated;

-- Grant select on reference tables
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;

-- Grant appropriate access on user-specific tables
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT ON public.sample_data_files TO authenticated;
GRANT SELECT, INSERT ON public.user_sample_data TO authenticated;
GRANT INSERT ON public.audit_log TO authenticated;

-- Grant admin tables to service_role only
GRANT ALL ON public.platform_metrics TO service_role;
GRANT ALL ON public.audit_log TO service_role;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
