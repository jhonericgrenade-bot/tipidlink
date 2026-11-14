import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_DEMO_DATA } from '../lib/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchUserProfile = async (authUser) => {
    if (!authUser) return null;
    const userId = authUser.id;
    const resolvedName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Family Member';
    const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(resolvedName)}`;

    if (!isSupabaseConfigured || isDemoMode) {
      const fallback = {
        id: userId,
        email: authUser.email,
        full_name: resolvedName,
        avatar_url: fallbackAvatar,
      };
      setProfile(fallback);
      return fallback;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data && data.full_name) {
        setProfile(data);
        return data;
      } else {
        const fallback = {
          id: userId,
          email: authUser.email,
          full_name: resolvedName,
          avatar_url: data?.avatar_url || fallbackAvatar,
        };
        setProfile(fallback);

        // Attempt upsert so DB remains consistent
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            email: authUser.email,
            full_name: resolvedName,
            avatar_url: fallback.avatar_url,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Profile upsert note:', e);
        }
        return fallback;
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
      const fallback = {
        id: userId,
        email: authUser.email,
        full_name: resolvedName,
        avatar_url: fallbackAvatar,
      };
      setProfile(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (session?.user) {
            // A verified user session is active: strictly turn off demo mode
            localStorage.removeItem('tipidlink_demo_user');
            localStorage.removeItem('tipidlink_demo_active');
            setIsDemoMode(false);
            setUser(session.user);
            await fetchUserProfile(session.user);
            setLoading(false);
            return;
          }
        }

        // Only restore demo session if explicitly active AND no real Supabase session exists
        const demoActive = localStorage.getItem('tipidlink_demo_active');
        const savedDemoUser = localStorage.getItem('tipidlink_demo_user');

        if (demoActive === 'true' && savedDemoUser) {
          try {
            const parsed = JSON.parse(savedDemoUser);
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
            setIsDemoMode(true);
          } catch {
            localStorage.removeItem('tipidlink_demo_user');
            localStorage.removeItem('tipidlink_demo_active');
            setUser(null);
            setProfile(null);
            setIsDemoMode(false);
          }
        } else {
          setUser(null);
          setProfile(null);
          setIsDemoMode(false);
        }
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    let subscription = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          localStorage.removeItem('tipidlink_demo_user');
          localStorage.removeItem('tipidlink_demo_active');
          setIsDemoMode(false);
          setUser(session.user);
          await fetchUserProfile(session.user);
        } else if (!localStorage.getItem('tipidlink_demo_active')) {
          setUser(null);
          setProfile(null);
          setIsDemoMode(false);
        }
        setLoading(false);
      });
      subscription = data.subscription;
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in with Supabase Auth or offline fallback
  const signIn = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Clear any previous demo state
    localStorage.removeItem('tipidlink_demo_user');
    localStorage.removeItem('tipidlink_demo_active');
    localStorage.removeItem('tipidlink_active_household_id');
    setIsDemoMode(false);

    if (!isSupabaseConfigured) {
      const fallbackName = cleanEmail.split('@')[0];
      const offlineProfile = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        full_name: fallbackName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackName)}`,
      };
      setUser({ id: offlineProfile.id, email: offlineProfile.email });
      setProfile(offlineProfile);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;

      if (data?.user) {
        setUser(data.user);
        await fetchUserProfile(data.user);
      }

      return { success: true, data };
    } catch (error) {
      let friendlyMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        friendlyMessage = 'Maling email o password. Pakisuri kung tama ang spelling o mag-register muna kung bago pa ang account.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMessage = 'Hindi pa confirmed ang iyong email. Pakitingnan ang verification link sa iyong inbox o spam folder.';
      }
      return { success: false, error: friendlyMessage };
    }
  };

  // Sign up with Supabase Auth or offline fallback
  const signUp = async (email, password, fullName, securityPin = '0000') => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim() || cleanEmail.split('@')[0];
    const cleanPin = (securityPin || '0000').trim() || '0000';

    // Immediately clear state and any previous demo/user session
    setUser(null);
    setProfile(null);
    localStorage.removeItem('tipidlink_demo_user');
    localStorage.removeItem('tipidlink_demo_active');
    localStorage.removeItem('tipidlink_active_household_id');
    localStorage.removeItem('tipidlink_is_premium');
    localStorage.removeItem('tipidlink_premium_plan');
    localStorage.removeItem('tipidlink_premium_sponsor');
    setIsDemoMode(false);

    if (!isSupabaseConfigured) {
      const demoProfile = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        full_name: cleanName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        security_pin: cleanPin,
      };
      setUser({ id: demoProfile.id, email: cleanEmail });
      setProfile(demoProfile);
      return { success: true };
    }

    try {
      // Ensure any previous session is completely signed out so stale profiles never leak
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            security_pin: cleanPin,
          },
        },
      });
      if (error) throw error;

      if (data?.user) {
        const newProfile = {
          id: data.user.id,
          email: cleanEmail,
          full_name: cleanName,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          security_pin: cleanPin,
        };
        setUser(data.user);
        setProfile(newProfile);

        try {
          await supabase.from('profiles').upsert(newProfile);
        } catch (pErr) {
          console.warn('Initial profile upsert note:', pErr);
        }
      }

      return { success: true, data };
    } catch (error) {
      let friendlyMessage = error.message;
      if (error.message.includes('User already registered')) {
        friendlyMessage = 'Mayroon nang account gamit ang email na ito. Subukang mag-log in na lamang.';
      } else if (error.message.includes('Password should be') || error.message.toLowerCase().includes('password')) {
        friendlyMessage = 'Kailangan ay may uppercase (A-Z), lowercase (a-z), special symbol (!@#$), at hindi bababa sa 8 characters ang iyong password (pinapayagan din ang numero).';
      }
      return { success: false, error: friendlyMessage };
    }
  };

  // Log in immediately as demo user
  const loginAsDemo = (demoUserKey = 'maria') => {
    let selectedUser;
    if (demoUserKey === 'juan') {
      selectedUser = INITIAL_DEMO_DATA.members[1];
    } else if (demoUserKey === 'angela') {
      selectedUser = INITIAL_DEMO_DATA.members[2];
    } else {
      selectedUser = INITIAL_DEMO_DATA.profile;
    }

    const demoProfile = {
      id: selectedUser.user_id || selectedUser.id,
      email: selectedUser.email,
      full_name: selectedUser.full_name,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedUser.full_name)}`,
      nickname: selectedUser.nickname || selectedUser.full_name,
    };

    localStorage.setItem('tipidlink_demo_active', 'true');
    localStorage.setItem('tipidlink_demo_user', JSON.stringify(demoProfile));
    setUser({ id: demoProfile.id, email: demoProfile.email });
    setProfile(demoProfile);
    setIsDemoMode(true);
    return { success: true };
  };

  // Sign out
  const signOut = async () => {
    localStorage.removeItem('tipidlink_demo_active');
    localStorage.removeItem('tipidlink_demo_user');
    localStorage.removeItem('tipidlink_active_household_id');
    localStorage.removeItem('tipidlink_is_premium');
    localStorage.removeItem('tipidlink_premium_plan');
    localStorage.removeItem('tipidlink_premium_sponsor');
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      if (isDemoMode) {
        localStorage.setItem('tipidlink_demo_user', JSON.stringify(updated));
      }
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      setProfile(prev => ({ ...prev, ...updates }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Reset password via email
  const resetPassword = async (targetEmail) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your registered email address.' };
    }

    if (isDemoMode || !isSupabaseConfigured) {
      return {
        success: true,
        message: `Password reset link has been simulated for ${cleanEmail}. Check your inbox for instructions.`
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return {
        success: true,
        message: `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox or spam folder.`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update password for currently signed-in user
  const updatePassword = async (newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long.'
      };
    }

    if (isDemoMode || !isSupabaseConfigured) {
      return {
        success: true,
        message: 'Password successfully updated!'
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return {
        success: true,
        message: 'Password successfully updated!'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Direct OTP Code Verification + Password Reset (Zero-redirect / No-broken-links)
  const verifyOtpAndResetPassword = async (targetEmail, token, newPassword) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    let cleanToken = (token || '').trim();

    if (!cleanEmail) {
      return { success: false, error: 'Please enter your registered email.' };
    }
    if (!cleanToken) {
      return { success: false, error: 'Please enter the 6-digit verification code sent to your email.' };
    }
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    // Smart token extraction: if user pasted the entire link from their Gmail
    if (cleanToken.includes('http') || cleanToken.includes('#') || cleanToken.includes('?') || cleanToken.includes('=')) {
      try {
        const dummyUrl = cleanToken.startsWith('http') ? cleanToken : `https://tipidlink.app/${cleanToken}`;
        const parsed = new URL(dummyUrl);
        const extracted = parsed.searchParams.get('token')
          || parsed.searchParams.get('code')
          || parsed.searchParams.get('token_hash')
          || (parsed.hash && new URLSearchParams(parsed.hash.replace(/^#/, '')).get('access_token'));
        if (extracted) {
          cleanToken = extracted;
        }
      } catch (e) {
        // Keep cleanToken as-is
      }
    }

    if (isDemoMode || !isSupabaseConfigured) {
      return {
        success: true,
        message: 'Password successfully updated!'
      };
    }

    try {
      // 1. Try OTP verification as 'recovery'
      let verifyRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery',
      });

      // Fallback: Try OTP verification as 'email' if recovery fails
      if (verifyRes.error) {
        const emailTypeRes = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email',
        });
        if (!emailTypeRes.error) {
          verifyRes = emailTypeRes;
        }
      }

      if (verifyRes.error) {
        let msg = verifyRes.error.message;
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
          msg = 'Maling verification code o nag-expire na. Pakisuri ang 6-digit code sa pinakabagong email mula sa TipidLink.';
        }
        return { success: false, error: msg };
      }

      // 2. Update password with the verified session
      const { error: pwdError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (pwdError) throw pwdError;

      return {
        success: true,
        message: 'Matagumpay na nabago ang iyong password! Maaari ka nang mag-sign in gamit ang bagong password.',
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Reset Password using 4-digit Security PIN (Zero Email / Zero Localhost)
  const resetPasswordWithPin = async (targetEmail, securityPin, newPassword) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    const cleanPin = (securityPin || '').trim();

    if (!cleanEmail) {
      return { success: false, error: 'Pakilagay ang iyong rehistradong email address.' };
    }
    if (!cleanPin || cleanPin.length !== 4) {
      return { success: false, error: 'Pakilagay ang 4-digit Security PIN (default: 0000).' };
    }
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Ang bagong password ay dapat hindi bababa sa 8 characters.' };
    }

    if (isDemoMode || !isSupabaseConfigured) {
      return {
        success: true,
        message: 'Matagumpay na nabago ang iyong password gamit ang Security PIN!'
      };
    }

    try {
      const { data, error } = await supabase.rpc('reset_password_with_pin', {
        target_email: cleanEmail,
        security_pin: cleanPin,
        new_password: newPassword,
      });

      if (error) {
        if (error.code === 'PGRST202') {
          return {
            success: false,
            error: 'Kailangang patakbuhin ang 002_security_pin_password_reset.sql sa Supabase SQL Editor para maging aktibo ang PIN reset sa cloud database.'
          };
        }
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Hindi mabago ang password.' };
      }

      return {
        success: true,
        message: data?.message || 'Matagumpay na nabago ang iyong password!'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update Security PIN for currently logged-in user
  const updateSecurityPin = async (newPin) => {
    const cleanPin = (newPin || '').trim();
    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return { success: false, error: 'Ang Security PIN ay dapat 4 na numero (hal. 1234).' };
    }

    if (isDemoMode || !isSupabaseConfigured) {
      const updated = { ...profile, security_pin: cleanPin };
      setProfile(updated);
      return { success: true, message: 'Matagumpay na na-update ang iyong Security PIN!' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ security_pin: cleanPin })
        .eq('id', user.id);

      if (error) throw error;
      setProfile(prev => ({ ...prev, security_pin: cleanPin }));
      return { success: true, message: 'Matagumpay na na-update ang iyong Security PIN!' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isDemoMode,
        isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        loginAsDemo,
        updateProfile,
        resetPassword,
        updatePassword,
        verifyOtpAndResetPassword,
        resetPasswordWithPin,
        updateSecurityPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
