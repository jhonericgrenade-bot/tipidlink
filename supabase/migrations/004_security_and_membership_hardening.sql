-- TIPIDLINK: Server-side authorization and account-security hardening
-- Run after 001-003. This migration intentionally removes the insecure
-- PIN/master-key authentication RPCs and makes household joining server-side.

-- Do not expose a SECURITY DEFINER helper that can be used to enumerate another
-- person's households. The RLS policies below always pass the current user ID.
CREATE OR REPLACE FUNCTION public.get_user_household_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF user_uuid IS NULL OR user_uuid IS DISTINCT FROM auth.uid() THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT household_id
    FROM public.household_members
    WHERE user_id = user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_household_admin(household_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF user_uuid IS NULL OR user_uuid IS DISTINCT FROM auth.uid() THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.household_members
        WHERE household_id = household_uuid
          AND user_id = user_uuid
          AND role IN ('owner', 'admin')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_household_owner(household_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF user_uuid IS NULL OR user_uuid IS DISTINCT FROM auth.uid() THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.household_members
        WHERE household_id = household_uuid
          AND user_id = user_uuid
          AND role = 'owner'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_household_creator(household_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF user_uuid IS NULL OR user_uuid IS DISTINCT FROM auth.uid() THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.households
        WHERE id = household_uuid AND created_by = user_uuid
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_visible_profile_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT DISTINCT member.user_id
    FROM public.household_members AS member
    WHERE member.household_id IN (
        SELECT public.get_user_household_ids(auth.uid())
    );
$$;

-- Invite resolution and membership creation must happen together on the server.
-- Callers can only receive the ordinary member role; no client can self-assign
-- owner/admin or join a household by supplying a UUID.
CREATE OR REPLACE FUNCTION public.join_household_by_invite_code(
    invite_code_input TEXT,
    member_nickname TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_household_id UUID;
    safe_nickname TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please sign in before joining a household.');
    END IF;

    SELECT id INTO target_household_id
    FROM public.households
    WHERE upper(regexp_replace(invite_code, '[[:space:]-]', '', 'g')) =
          upper(regexp_replace(COALESCE(invite_code_input, ''), '[[:space:]-]', '', 'g'))
    LIMIT 1;

    IF target_household_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Household invite code not found.');
    END IF;

    safe_nickname := NULLIF(left(trim(COALESCE(member_nickname, '')), 80), '');

    INSERT INTO public.household_members (household_id, user_id, role, nickname)
    VALUES (target_household_id, auth.uid(), 'member', safe_nickname)
    ON CONFLICT (household_id, user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'household_id', target_household_id);
END;
$$;

REVOKE ALL ON FUNCTION public.join_household_by_invite_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_household_by_invite_code(TEXT, TEXT) TO authenticated;

-- Profile details are visible only to their owner and people in a shared household.
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Household profiles are visible to shared members"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR id IN (SELECT public.get_visible_profile_ids()));

-- Direct self-joins are forbidden. A creator may create exactly its own owner
-- row; invite joins use the SECURITY DEFINER RPC above.
DROP POLICY IF EXISTS "Users can join household or admins can add members" ON public.household_members;
CREATE POLICY "Owners can create their initial membership or admins can add members"
ON public.household_members FOR INSERT
TO authenticated
WITH CHECK (
    public.is_household_admin(household_id, auth.uid())
    OR (
        user_id = auth.uid()
        AND role = 'owner'
        AND public.is_household_creator(household_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Admins can update membership roles" ON public.household_members;
CREATE POLICY "Owners manage all roles and admins manage members"
ON public.household_members FOR UPDATE
TO authenticated
USING (
    public.is_household_owner(household_id, auth.uid())
    OR (public.is_household_admin(household_id, auth.uid()) AND role = 'member')
)
WITH CHECK (
    public.is_household_owner(household_id, auth.uid())
    OR (public.is_household_admin(household_id, auth.uid()) AND role = 'member')
);

DROP POLICY IF EXISTS "Admins can remove members or members can leave" ON public.household_members;
CREATE POLICY "Owners remove any member, admins remove members, members leave"
ON public.household_members FOR DELETE
TO authenticated
USING (
    (public.is_household_owner(household_id, auth.uid()) AND user_id <> auth.uid())
    OR (public.is_household_admin(household_id, auth.uid()) AND role = 'member')
    OR (user_id = auth.uid() AND role <> 'owner')
);

-- Never allow the last owner to be demoted. Owner deletion is already blocked
-- by RLS; this UPDATE-only trigger deliberately does not interfere with a
-- cascading household deletion.
CREATE OR REPLACE FUNCTION public.prevent_orphaned_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.role = 'owner' AND NEW.role <> 'owner'
       AND EXISTS (SELECT 1 FROM public.households WHERE id = OLD.household_id)
       AND NOT EXISTS (
           SELECT 1 FROM public.household_members
           WHERE household_id = OLD.household_id
             AND role = 'owner'
             AND id <> OLD.id
       ) THEN
        RAISE EXCEPTION 'A household must retain at least one owner';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_orphaned_household_member ON public.household_members;
CREATE TRIGGER prevent_orphaned_household_member
BEFORE UPDATE ON public.household_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_orphaned_household();

-- Budgets represent the household plan, so they follow the owner/admin UI
-- permission model at the database layer as well.
DROP POLICY IF EXISTS "Household members can create budgets" ON public.budgets;
CREATE POLICY "Household admins can create budgets"
ON public.budgets FOR INSERT
TO authenticated
WITH CHECK (public.is_household_admin(household_id, auth.uid()));

DROP POLICY IF EXISTS "Household members can update budgets" ON public.budgets;
CREATE POLICY "Household admins can update budgets"
ON public.budgets FOR UPDATE
TO authenticated
USING (public.is_household_admin(household_id, auth.uid()))
WITH CHECK (public.is_household_admin(household_id, auth.uid()));

DROP POLICY IF EXISTS "Household members can delete budgets" ON public.budgets;
CREATE POLICY "Household admins can delete budgets"
ON public.budgets FOR DELETE
TO authenticated
USING (public.is_household_admin(household_id, auth.uid()));

-- Prevent a household member from recording a payment/contribution against a
-- record that belongs to another household.
DROP POLICY IF EXISTS "Household members can record bill payments" ON public.bill_payments;
CREATE POLICY "Household members can record linked bill payments"
ON public.bill_payments FOR INSERT
TO authenticated
WITH CHECK (
    household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    AND (paid_by IS NULL OR paid_by = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.bills
        WHERE id = bill_id AND household_id = bill_payments.household_id
    )
);

DROP POLICY IF EXISTS "Household members can add contributions" ON public.savings_contributions;
CREATE POLICY "Household members can add linked contributions"
ON public.savings_contributions FOR INSERT
TO authenticated
WITH CHECK (
    household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    AND (contributed_by IS NULL OR contributed_by = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.savings_goals
        WHERE id = goal_id AND household_id = savings_contributions.household_id
    )
);

DROP POLICY IF EXISTS "Household members can add transactions" ON public.transactions;
CREATE POLICY "Household members can add their own transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
    household_id IN (SELECT public.get_user_household_ids(auth.uid()))
    AND (user_id IS NULL OR user_id = auth.uid())
);

-- A four-digit PIN and a static master code are not safe account credentials.
-- Disable these legacy RPCs; normal password sign-in and email recovery remain.
DO $$
BEGIN
    IF to_regprocedure('public.reset_password_with_pin(text,text,text)') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.reset_password_with_pin(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated';
    END IF;
    IF to_regprocedure('public.login_with_pin(text,text)') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.login_with_pin(TEXT, TEXT) FROM PUBLIC, anon, authenticated';
    END IF;
    IF to_regprocedure('public.restore_password_after_pin_login(text)') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.restore_password_after_pin_login(TEXT) FROM PUBLIC, anon, authenticated';
    END IF;
    IF to_regprocedure('public.recover_account_with_family_key(text,text,text,text)') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.recover_account_with_family_key(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated';
    END IF;
END;
$$;
