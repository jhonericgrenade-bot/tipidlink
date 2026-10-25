-- ==============================================================================
-- TIPIDLINK: Shared Family Budget Management Platform
-- Migration: 001_initial_schema.sql
-- Description: Core schema, indexes, RLS policies, helper functions, and default data
-- Idempotent: Can be safely re-run without errors
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for auto-creating profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. HOUSEHOLDS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'PHP',
    monthly_budget_target NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_budget_target >= 0),
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_households_invite_code ON public.households(invite_code);

-- ------------------------------------------------------------------------------
-- 3. HOUSEHOLD MEMBERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    nickname TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_household_user UNIQUE (household_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members(household_id);

-- ------------------------------------------------------------------------------
-- 4. CATEGORIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL DEFAULT 'tag',
    color TEXT NOT NULL DEFAULT '#10B981',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_household ON public.categories(household_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_system_name ON public.categories (name) WHERE is_system = TRUE;

-- ------------------------------------------------------------------------------
-- 5. TRANSACTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'gcash', 'maya', 'bank_transfer', 'credit_card', 'other')),
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_household ON public.transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- ------------------------------------------------------------------------------
-- 6. BUDGETS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2020),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_budget_category 
ON public.budgets (household_id, category_id, month, year) 
WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_budget_overall 
ON public.budgets (household_id, month, year) 
WHERE category_id IS NULL;

-- ------------------------------------------------------------------------------
-- 7. BILLS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    biller_name TEXT,
    account_number TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly', 'once')),
    reminder_days_before INT NOT NULL DEFAULT 3,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bills_household ON public.bills(household_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);

-- ------------------------------------------------------------------------------
-- 8. BILL PAYMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bill_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    paid_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'gcash' CHECK (payment_method IN ('cash', 'gcash', 'maya', 'bank_transfer', 'credit_card', 'other')),
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON public.bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_household ON public.bill_payments(household_id);

CREATE OR REPLACE FUNCTION public.sync_bill_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_bill_id UUID;
    total_paid NUMERIC(12,2);
    target_bill RECORD;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_bill_id := OLD.bill_id;
    ELSE
        target_bill_id := NEW.bill_id;
    END IF;

    SELECT * INTO target_bill FROM public.bills WHERE id = target_bill_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO total_paid FROM public.bill_payments WHERE bill_id = target_bill_id;

    IF total_paid >= target_bill.amount THEN
        UPDATE public.bills SET status = 'paid', updated_at = timezone('utc'::text, now()) WHERE id = target_bill_id;
    ELSIF total_paid > 0 THEN
        UPDATE public.bills SET status = 'partially_paid', updated_at = timezone('utc'::text, now()) WHERE id = target_bill_id;
    ELSE
        IF target_bill.due_date < CURRENT_DATE THEN
            UPDATE public.bills SET status = 'overdue', updated_at = timezone('utc'::text, now()) WHERE id = target_bill_id;
        ELSE
            UPDATE public.bills SET status = 'unpaid', updated_at = timezone('utc'::text, now()) WHERE id = target_bill_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_bill_status ON public.bill_payments;
CREATE TRIGGER trigger_sync_bill_status
    AFTER INSERT OR UPDATE OR DELETE ON public.bill_payments
    FOR EACH ROW EXECUTE FUNCTION public.sync_bill_status();

-- ------------------------------------------------------------------------------
-- 9. SAVINGS GOALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
    deadline DATE,
    category TEXT NOT NULL DEFAULT 'emergency_fund',
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_household ON public.savings_goals(household_id);

-- ------------------------------------------------------------------------------
-- 10. SAVINGS CONTRIBUTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    contributed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON public.savings_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_household ON public.savings_contributions(household_id);

CREATE OR REPLACE FUNCTION public.sync_savings_goal_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_goal_id UUID;
    total_saved NUMERIC(12,2);
    target_goal RECORD;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_goal_id := OLD.goal_id;
    ELSE
        target_goal_id := NEW.goal_id;
    END IF;

    SELECT * INTO target_goal FROM public.savings_goals WHERE id = target_goal_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO total_saved FROM public.savings_contributions WHERE goal_id = target_goal_id;

    UPDATE public.savings_goals 
    SET 
        current_amount = total_saved,
        is_completed = (total_saved >= target_goal.target_amount),
        updated_at = timezone('utc'::text, now())
    WHERE id = target_goal_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_savings_goal ON public.savings_contributions;
CREATE TRIGGER trigger_sync_savings_goal
    AFTER INSERT OR UPDATE OR DELETE ON public.savings_contributions
    FOR EACH ROW EXECUTE FUNCTION public.sync_savings_goal_total();

-- ------------------------------------------------------------------------------
-- 11. SECURITY & NON-RECURSIVE RLS FUNCTIONS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_household_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT household_id 
    FROM public.household_members 
    WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_household_admin(household_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.household_members 
        WHERE household_id = household_uuid 
          AND user_id = user_uuid 
          AND role IN ('owner', 'admin')
    );
$$;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 12. RLS POLICIES (with DROP POLICY IF EXISTS for safe re-runs)
-- ------------------------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- HOUSEHOLDS
DROP POLICY IF EXISTS "Users can view households they belong to" ON public.households;
CREATE POLICY "Users can view households they belong to"
ON public.households FOR SELECT
TO authenticated
USING (id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can create households" ON public.households;
CREATE POLICY "Authenticated users can create households"
ON public.households FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Household admins can update their household" ON public.households;
CREATE POLICY "Household admins can update their household"
ON public.households FOR UPDATE
TO authenticated
USING (public.is_household_admin(id, auth.uid()))
WITH CHECK (public.is_household_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Household owners can delete their household" ON public.households;
CREATE POLICY "Household owners can delete their household"
ON public.households FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.household_members 
        WHERE household_id = id AND user_id = auth.uid() AND role = 'owner'
    )
);

-- HOUSEHOLD MEMBERS
DROP POLICY IF EXISTS "Members can view other members in their households" ON public.household_members;
CREATE POLICY "Members can view other members in their households"
ON public.household_members FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can join household or admins can add members" ON public.household_members;
CREATE POLICY "Users can join household or admins can add members"
ON public.household_members FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR public.is_household_admin(household_id, auth.uid())
);

DROP POLICY IF EXISTS "Admins can update membership roles" ON public.household_members;
CREATE POLICY "Admins can update membership roles"
ON public.household_members FOR UPDATE
TO authenticated
USING (public.is_household_admin(household_id, auth.uid()))
WITH CHECK (public.is_household_admin(household_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can remove members or members can leave" ON public.household_members;
CREATE POLICY "Admins can remove members or members can leave"
ON public.household_members FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR public.is_household_admin(household_id, auth.uid())
);

-- CATEGORIES
DROP POLICY IF EXISTS "View system categories or household categories" ON public.categories;
CREATE POLICY "View system categories or household categories"
ON public.categories FOR SELECT
TO authenticated
USING (
    is_system = TRUE 
    OR household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Household members can create categories" ON public.categories;
CREATE POLICY "Household members can create categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can edit their household categories" ON public.categories;
CREATE POLICY "Household members can edit their household categories"
ON public.categories FOR UPDATE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete non-system categories" ON public.categories;
CREATE POLICY "Household members can delete non-system categories"
ON public.categories FOR DELETE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())) AND is_system = FALSE);

-- TRANSACTIONS
DROP POLICY IF EXISTS "Household members can view transactions" ON public.transactions;
CREATE POLICY "Household members can view transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can add transactions" ON public.transactions;
CREATE POLICY "Household members can add transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can update transactions" ON public.transactions;
CREATE POLICY "Household members can update transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete transactions" ON public.transactions;
CREATE POLICY "Household members can delete transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- BUDGETS
DROP POLICY IF EXISTS "Household members can view budgets" ON public.budgets;
CREATE POLICY "Household members can view budgets"
ON public.budgets FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can create budgets" ON public.budgets;
CREATE POLICY "Household members can create budgets"
ON public.budgets FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can update budgets" ON public.budgets;
CREATE POLICY "Household members can update budgets"
ON public.budgets FOR UPDATE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete budgets" ON public.budgets;
CREATE POLICY "Household members can delete budgets"
ON public.budgets FOR DELETE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- BILLS
DROP POLICY IF EXISTS "Household members can view bills" ON public.bills;
CREATE POLICY "Household members can view bills"
ON public.bills FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can add bills" ON public.bills;
CREATE POLICY "Household members can add bills"
ON public.bills FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can update bills" ON public.bills;
CREATE POLICY "Household members can update bills"
ON public.bills FOR UPDATE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete bills" ON public.bills;
CREATE POLICY "Household members can delete bills"
ON public.bills FOR DELETE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- BILL PAYMENTS
DROP POLICY IF EXISTS "Household members can view bill payments" ON public.bill_payments;
CREATE POLICY "Household members can view bill payments"
ON public.bill_payments FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can record bill payments" ON public.bill_payments;
CREATE POLICY "Household members can record bill payments"
ON public.bill_payments FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete bill payments" ON public.bill_payments;
CREATE POLICY "Household members can delete bill payments"
ON public.bill_payments FOR DELETE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- SAVINGS GOALS
DROP POLICY IF EXISTS "Household members can view savings goals" ON public.savings_goals;
CREATE POLICY "Household members can view savings goals"
ON public.savings_goals FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can add savings goals" ON public.savings_goals;
CREATE POLICY "Household members can add savings goals"
ON public.savings_goals FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can update savings goals" ON public.savings_goals;
CREATE POLICY "Household members can update savings goals"
ON public.savings_goals FOR UPDATE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete savings goals" ON public.savings_goals;
CREATE POLICY "Household members can delete savings goals"
ON public.savings_goals FOR DELETE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- SAVINGS CONTRIBUTIONS
DROP POLICY IF EXISTS "Household members can view contributions" ON public.savings_contributions;
CREATE POLICY "Household members can view contributions"
ON public.savings_contributions FOR SELECT
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can add contributions" ON public.savings_contributions;
CREATE POLICY "Household members can add contributions"
ON public.savings_contributions FOR INSERT
TO authenticated
WITH CHECK (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

DROP POLICY IF EXISTS "Household members can delete contributions" ON public.savings_contributions;
CREATE POLICY "Household members can delete contributions"
ON public.savings_contributions FOR DELETE
TO authenticated
USING (household_id IN (SELECT public.get_user_household_ids(auth.uid())));

-- ------------------------------------------------------------------------------
-- 13. SEED DEFAULT SYSTEM CATEGORIES (Filipino Household Centric)
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (name, type, icon, color, is_system)
VALUES
    -- Expenses
    ('Groceries & Food (Palengke / Supermarket)', 'expense', 'shopping-cart', '#10B981', TRUE),
    ('Electricity (Meralco / Coop)', 'expense', 'zap', '#F59E0B', TRUE),
    ('Water Bill (Maynilad / Manila Water)', 'expense', 'droplet', '#3B82F6', TRUE),
    ('Internet & Mobile Load (PLDT / Converge / Globe)', 'expense', 'wifi', '#6366F1', TRUE),
    ('House Rent / Mortgage', 'expense', 'home', '#8B5CF6', TRUE),
    ('Transportation & Gas (Jeep / Tricycle / MRT)', 'expense', 'bus', '#EC4899', TRUE),
    ('Education & School Baon', 'expense', 'book-open', '#14B8A6', TRUE),
    ('Health, Medicine & Emergencies', 'expense', 'heart-pulse', '#EF4444', TRUE),
    ('Dining Out & Delivery (Jollibee / Grab)', 'expense', 'coffee', '#F97316', TRUE),
    ('Personal Care & Household Supplies', 'expense', 'smile', '#06B6D4', TRUE),
    ('Miscellaneous & Others', 'expense', 'more-horizontal', '#64748B', TRUE),
    
    -- Income
    ('Salary / Regular Employment', 'income', 'briefcase', '#10B981', TRUE),
    ('Freelance & Side Hustles (Raket)', 'income', 'laptop', '#3B82F6', TRUE),
    ('Remittance / Padala (OFW)', 'income', 'send', '#8B5CF6', TRUE),
    ('Small Business / Sari-Sari Store', 'income', 'store', '#F59E0B', TRUE),
    ('Other Income & Allowances', 'income', 'plus-circle', '#06B6D4', TRUE)
ON CONFLICT (name) WHERE is_system = TRUE DO NOTHING;
