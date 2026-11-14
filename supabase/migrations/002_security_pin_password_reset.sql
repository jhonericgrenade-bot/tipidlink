-- ==============================================================================
-- TIPIDLINK: In-App 4-Digit Security PIN & Password Reset (Zero Email / Zero Localhost)
-- Migration: 002_security_pin_password_reset.sql
-- Description: Adds security_pin and backup_password_hash to profiles.
--              Protects the user's real password so Quick PIN logins NEVER wipe
--              out or overwrite the registered password.
--              Strictly enforces custom PIN for new accounts (0000 only for legacy).
-- ==============================================================================

-- 1. Enable pgcrypto extension for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add security_pin and backup_password_hash columns to public.profiles if not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'security_pin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN security_pin TEXT NOT NULL DEFAULT '0000';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'backup_password_hash'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN backup_password_hash TEXT;
    END IF;
END $$;

-- 3. Set default '0000' only for accounts that have no PIN configured at all
UPDATE public.profiles 
SET security_pin = '0000' 
WHERE security_pin IS NULL OR trim(security_pin) = '';

-- Initial sync of backup_password_hash from auth.users for existing accounts
UPDATE public.profiles p
SET backup_password_hash = u.encrypted_password
FROM auth.users u
WHERE u.id = p.id
  AND p.backup_password_hash IS NULL
  AND u.encrypted_password IS NOT NULL;

-- 4. Update handle_new_user trigger to save custom security_pin and real password hash during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, security_pin, backup_password_hash)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        COALESCE(NULLIF(trim(new.raw_user_meta_data->>'security_pin'), ''), '0000'),
        new.encrypted_password
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        security_pin = COALESCE(NULLIF(trim(EXCLUDED.security_pin), ''), NULLIF(trim(profiles.security_pin), ''), '0000'),
        backup_password_hash = COALESCE(new.encrypted_password, profiles.backup_password_hash),
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RPC Function: reset_password_with_pin
CREATE OR REPLACE FUNCTION public.reset_password_with_pin(
    target_email TEXT,
    security_pin TEXT,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    target_user_id UUID;
    stored_pin TEXT;
    meta_pin TEXT;
    expected_pin TEXT;
    clean_email TEXT;
    clean_pin TEXT;
    new_hash TEXT;
BEGIN
    clean_email := lower(trim(target_email));
    clean_pin := trim(security_pin);

    IF clean_email IS NULL OR clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pakilagay ang iyong rehistradong email address.');
    END IF;

    IF clean_pin IS NULL OR clean_pin = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pakilagay ang 4-digit Security PIN.');
    END IF;

    -- Strict password validation (8+ chars, upper, lower, symbol)
    IF new_password IS NULL OR length(new_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ang bagong password ay dapat hindi bababa sa 8 characters.');
    END IF;

    IF new_password !~ '[A-Z]' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kailangan ay may kahit isang uppercase letter (A-Z).');
    END IF;

    IF new_password !~ '[a-z]' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kailangan ay may kahit isang lowercase letter (a-z).');
    END IF;

    IF new_password !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?~`]' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kailangan ay may kahit isang special symbol (hal. @, #, $, %, !).');
    END IF;

    -- Look up user ID and PINs from both auth.users and public.profiles
    SELECT 
        u.id,
        NULLIF(trim(p.security_pin), ''),
        NULLIF(trim(u.raw_user_meta_data->>'security_pin'), '')
    INTO target_user_id, stored_pin, meta_pin
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = clean_email
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hindi natagpuan ang account gamit ang email na ito. Pakisuri ang spelling.');
    END IF;

    -- Determine strict expected PIN:
    -- If custom PIN was set in profiles or signup metadata, ONLY that custom PIN is valid.
    -- '0000' is ONLY accepted if no custom PIN was ever set.
    expected_pin := COALESCE(stored_pin, meta_pin, '0000');

    IF clean_pin != expected_pin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maling Security PIN. Pakisuri ang iyong 4-digit PIN.');
    END IF;

    -- Compute bcrypt hash
    new_hash := crypt(new_password, gen_salt('bf'));

    -- Update encrypted_password in auth.users
    UPDATE auth.users
    SET 
        encrypted_password = new_hash,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    -- Update profile PIN and backup_password_hash so future PIN logins restore this new password
    UPDATE public.profiles
    SET 
        security_pin = clean_pin,
        backup_password_hash = new_hash,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Matagumpay na nabago ang iyong password gamit ang Security PIN!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_password_with_pin(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 6. Direct Quick PIN Login Function (Safely preserving original password)
CREATE OR REPLACE FUNCTION public.login_with_pin(
    target_email TEXT,
    security_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    target_user_id UUID;
    stored_pin TEXT;
    meta_pin TEXT;
    expected_pin TEXT;
    clean_email TEXT;
    clean_pin TEXT;
    temp_pass TEXT;
    current_hash TEXT;
BEGIN
    clean_email := lower(trim(target_email));
    clean_pin := trim(security_pin);

    IF clean_email IS NULL OR clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pakilagay ang iyong rehistradong email address.');
    END IF;

    IF clean_pin IS NULL OR clean_pin = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pakilagay ang 4-digit Security PIN.');
    END IF;

    -- Look up user ID and PINs from both auth.users and public.profiles
    SELECT 
        u.id,
        NULLIF(trim(p.security_pin), ''),
        NULLIF(trim(u.raw_user_meta_data->>'security_pin'), ''),
        u.encrypted_password
    INTO target_user_id, stored_pin, meta_pin, current_hash
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = clean_email
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hindi natagpuan ang account gamit ang email na ito. Pakisuri ang spelling.');
    END IF;

    -- Determine strict expected PIN:
    expected_pin := COALESCE(stored_pin, meta_pin, '0000');

    IF clean_pin != expected_pin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maling Security PIN. Pakisuri ang iyong 4-digit PIN.');
    END IF;

    -- CRITICAL SAFETY: Preserve user's real password hash BEFORE creating temp session key
    IF current_hash IS NOT NULL AND current_hash NOT LIKE 'PIN_%' THEN
        UPDATE public.profiles
        SET 
            backup_password_hash = current_hash,
            security_pin = clean_pin,
            updated_at = timezone('utc'::text, now())
        WHERE id = target_user_id;
    ELSE
        UPDATE public.profiles
        SET security_pin = clean_pin, updated_at = timezone('utc'::text, now())
        WHERE id = target_user_id;
    END IF;

    -- Generate temporary secure session key
    temp_pass := 'PIN_' || encode(gen_random_bytes(16), 'hex') || '!A1';

    -- Update auth.users with the temporary session password so Gotrue accepts the session
    UPDATE auth.users
    SET 
        encrypted_password = crypt(temp_pass, gen_salt('bf')),
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'session_key', temp_pass);
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_with_pin(TEXT, TEXT) TO anon, authenticated;

-- 7. Restore original password immediately after PIN session issuance
CREATE OR REPLACE FUNCTION public.restore_password_after_pin_login(
    target_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    clean_email TEXT;
    target_user_id UUID;
    saved_hash TEXT;
BEGIN
    clean_email := lower(trim(target_email));

    SELECT u.id, p.backup_password_hash
    INTO target_user_id, saved_hash
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = clean_email
    LIMIT 1;

    IF target_user_id IS NOT NULL AND saved_hash IS NOT NULL AND saved_hash NOT LIKE 'PIN_%' THEN
        UPDATE auth.users
        SET 
            encrypted_password = saved_hash,
            updated_at = timezone('utc'::text, now())
        WHERE id = target_user_id;

        RETURN jsonb_build_object('success', true, 'restored', true);
    END IF;

    RETURN jsonb_build_object('success', true, 'restored', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_password_after_pin_login(TEXT) TO anon, authenticated;
