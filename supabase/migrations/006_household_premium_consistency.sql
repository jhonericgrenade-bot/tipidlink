-- Keep subscription access on the household record, not on an individual
-- member's browser or profile. Any joined member may activate a paid/sponsored
-- plan for the household; only an owner or admin may return it to Free.

CREATE OR REPLACE FUNCTION public.set_household_premium(
    target_household_id UUID,
    activate_premium BOOLEAN,
    requested_plan TEXT DEFAULT NULL,
    requested_sponsor TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_description TEXT;
    clean_description TEXT;
    next_description TEXT;
    plan_name TEXT;
    sponsor_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be signed in to change a household plan.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.household_members
        WHERE household_id = target_household_id
          AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You are not a member of this household.';
    END IF;

    -- A member who pays may activate Pro for everybody, but cancelling shared
    -- access remains an owner/admin action.
    IF NOT activate_premium
       AND NOT public.is_household_admin(target_household_id, auth.uid()) THEN
        RAISE EXCEPTION 'Only a household owner or admin can reset the plan to Free.';
    END IF;

    SELECT description
      INTO existing_description
      FROM public.households
     WHERE id = target_household_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Household not found.';
    END IF;

    clean_description := btrim(regexp_replace(
        regexp_replace(COALESCE(existing_description, ''), '\[TIER:(PRO|FREE)[^]]*\]', '', 'gi'),
        '\[PRO[^]]*\]', '', 'gi'
    ));

    IF activate_premium THEN
        plan_name := LEFT(COALESCE(NULLIF(btrim(requested_plan), ''), 'TipidLink Premium Plan (₱30/mo)'), 160);
        sponsor_name := NULLIF(LEFT(btrim(COALESCE(requested_sponsor, '')), 160), '');
        next_description := CASE WHEN clean_description = '' THEN '' ELSE clean_description || ' ' END
          || '[TIER:PRO|PLAN:' || plan_name
          || CASE WHEN sponsor_name IS NULL THEN '' ELSE '|SPONSOR:' || sponsor_name END
          || ']';
    ELSE
        next_description := CASE WHEN clean_description = '' THEN '' ELSE clean_description || ' ' END || '[TIER:FREE]';
        plan_name := 'Free Household Plan';
        sponsor_name := NULL;
    END IF;

    UPDATE public.households
       SET description = next_description,
           updated_at = timezone('utc'::text, now())
     WHERE id = target_household_id;

    RETURN jsonb_build_object(
        'success', true,
        'is_premium', activate_premium,
        'plan', plan_name,
        'sponsor', sponsor_name,
        'description', next_description
    );
END;
$$;

REVOKE ALL ON FUNCTION public.set_household_premium(UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_household_premium(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
