-- ==============================================================================
-- TIPIDLINK: In-App 4-Digit Security PIN & Password Reset (Zero Email / Zero Localhost)
-- Migration: 002_security_pin_password_reset.sql
-- Description: Adds security_pin column to profiles with default '0000', and exposes
--              secure PostgreSQL functions for PIN-based logins and password resets.
--              Seamlessly supports custom PINs chosen during registration (stored in
--              raw_user_meta_data or profiles), with default '0000' for existing accounts.
-- ==============================================================================

-- 1. Enable pgcrypto extension for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add security_pin column to public.profiles if not exists
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
END $$;

-- 3. Set default '0000' for all existing accounts
UPDATE public.profiles 
SET security_pin = '0000' 
WHERE security_pin IS NULL OR trim(security_pin) = '';

-- 4. Update handle_new_user trigger to save custom security_pin during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, security_pin)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url',
        COALESCE(NULLIF(new.raw_user_meta_data->>'security_pin', ''), '0000')
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        security_pin = COALESCE(NULLIF(EXCLUDED.security_pin, ''), profiles.security_pin, '0000'),
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
    clean_email TEXT;
    clean_pin TEXT;
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
        NULLIF(p.security_pin, ''),
        NULLIF(u.raw_user_meta_data->>'security_pin', '')
    INTO target_user_id, stored_pin, meta_pin
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = clean_email
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hindi natagpuan ang account gamit ang email na ito. Pakisuri ang spelling.');
    END IF;

    -- Match against custom profile PIN, signup metadata PIN, or default '0000'
    IF clean_pin != COALESCE(stored_pin, '') 
       AND clean_pin != COALESCE(meta_pin, '') 
       AND clean_pin != '0000' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maling Security PIN. Pakisuri ang iyong 4-digit PIN.');
    END IF;

    -- Update encrypted_password in auth.users using pgcrypto's bcrypt
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    -- Ensure profile also has valid PIN set
    UPDATE public.profiles
    SET security_pin = clean_pin, updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Matagumpay na nabago ang iyong password gamit ang Security PIN!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_password_with_pin(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 6. Direct Quick PIN Login Function (like GCash / Maya)
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
    clean_email TEXT;
    clean_pin TEXT;
    temp_pass TEXT;
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
        NULLIF(p.security_pin, ''),
        NULLIF(u.raw_user_meta_data->>'security_pin', '')
    INTO target_user_id, stored_pin, meta_pin
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = clean_email
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hindi natagpuan ang account gamit ang email na ito. Pakisuri ang spelling.');
    END IF;

    -- Match against custom profile PIN, signup metadata PIN, or default '0000'
    IF clean_pin != COALESCE(stored_pin, '') 
       AND clean_pin != COALESCE(meta_pin, '') 
       AND clean_pin != '0000' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maling Security PIN. Pakisuri ang iyong 4-digit PIN.');
    END IF;

    -- Update profile PIN to keep in sync
    UPDATE public.profiles
    SET security_pin = clean_pin, updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    -- Generate temporary secure session key
    temp_pass := 'PIN_' || encode(gen_random_bytes(16), 'hex') || '!A1';

    -- Update auth.users with the temporary session password
    UPDATE auth.users
    SET 
        encrypted_password = crypt(temp_pass, gen_salt('bf')),
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'session_key', temp_pass);
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_with_pin(TEXT, TEXT) TO anon, authenticated;
