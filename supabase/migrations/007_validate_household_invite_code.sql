-- Validate an invite code before registration without revealing household IDs,
-- names, members, or other private household data.
CREATE OR REPLACE FUNCTION public.validate_household_invite_code(invite_code_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.households
        WHERE upper(regexp_replace(invite_code, '[[:space:]-]', '', 'g')) =
              upper(regexp_replace(COALESCE(invite_code_input, ''), '[[:space:]-]', '', 'g'))
    ) INTO code_exists;

    RETURN jsonb_build_object('exists', COALESCE(code_exists, FALSE));
END;
$$;

REVOKE ALL ON FUNCTION public.validate_household_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_household_invite_code(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
