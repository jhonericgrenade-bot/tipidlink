-- Restores the user-requested legacy PIN sign-in and recovery experience.
-- The functions and PIN columns were retained by earlier migrations; migration
-- 004 only revoked client execution privileges.

GRANT EXECUTE ON FUNCTION public.login_with_pin(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_password_with_pin(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_password_after_pin_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_account_with_family_key(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
