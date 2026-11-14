-- ==============================================================================
-- TIPIDLINK: In-App 4-Digit Security PIN & Password Reset (Zero Email / Zero Localhost)
-- Migration: 002_security_pin_password_reset.sql
-- Description: Adds security_pin column to profiles with default '0000', and exposes
--              a secure PostgreSQL function for PIN-based password resets across
--              all devices (Android, iOS, PC, Mobile Web) without requiring email links.
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

-- 4. Update handle_new_user trigger to support security_pin during signup
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
        COALESCE(new.raw_user_meta_data->>'security_pin', '0000')
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        security_pin = COALESCE(profiles.security_pin, EXCLUDED.security_pin, '0000'),
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$;

-- 5. RPC Function: reset_password_with_pin
-- Allows users to change their password securely using their 4-digit Security PIN (default 0000)
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

    IF new_password IS NULL OR length(new_password) < 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ang bagong password ay dapat hindi bababa sa 8 characters.');
    END IF;

    -- Look up profile by email
    SELECT id, COALESCE(NULLIF(profiles.security_pin, ''), '0000')
    INTO target_user_id, stored_pin
    FROM public.profiles
    WHERE lower(email) = clean_email
    LIMIT 1;

    -- Fallback to auth.users if profile record was not created yet
    IF target_user_id IS NULL THEN
        SELECT id INTO target_user_id
        FROM auth.users
        WHERE lower(email) = clean_email
        LIMIT 1;
        stored_pin := '0000';
    END IF;

    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hindi natagpuan ang account gamit ang email na ito. Pakisuri ang spelling.');
    END IF;

    -- Verify 4-digit PIN (default is '0000' for existing accounts)
    IF clean_pin != stored_pin AND stored_pin IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maling Security PIN. Ang default PIN para sa mga existing account ay 0000.');
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

-- 6. Grant execute permission to anon (unauthenticated) and authenticated roles
GRANT EXECUTE ON FUNCTION public.reset_password_with_pin(TEXT, TEXT, TEXT) TO anon, authenticated;
