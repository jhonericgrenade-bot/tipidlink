import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_DEMO_DATA } from '../lib/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if user has an active demo session saved in localStorage
    const savedDemoUser = localStorage.getItem('tipidlink_demo_user');
    
    if (!isSupabaseConfigured || savedDemoUser) {
      if (savedDemoUser) {
        try {
          const parsed = JSON.parse(savedDemoUser);
          setUser({ id: parsed.id, email: parsed.email });
          setProfile(parsed);
          setIsDemoMode(true);
        } catch {
          // If parse fails, clear
          localStorage.removeItem('tipidlink_demo_user');
        }
      }
      setLoading(false);
      return;
    }

    // Supabase Auth session listener
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    if (!isSupabaseConfigured || isDemoMode) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
    }
  };

  // Sign in with Supabase Auth or Demo Mode fallback
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      // Demo authentication
      const demoProfile = {
        ...INITIAL_DEMO_DATA.profile,
        email: email || INITIAL_DEMO_DATA.profile.email,
        full_name: email.split('@')[0] || INITIAL_DEMO_DATA.profile.full_name,
      };
      localStorage.setItem('tipidlink_demo_user', JSON.stringify(demoProfile));
      setUser({ id: demoProfile.id, email: demoProfile.email });
      setProfile(demoProfile);
      setIsDemoMode(true);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Sign up with Supabase Auth or Demo Mode fallback
  const signUp = async (email, password, fullName) => {
    if (!isSupabaseConfigured) {
      const demoProfile = {
        id: `usr-${Date.now()}`,
        email,
        full_name: fullName || email.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName || email)}`,
      };
      localStorage.setItem('tipidlink_demo_user', JSON.stringify(demoProfile));
      setUser({ id: demoProfile.id, email });
      setProfile(demoProfile);
      setIsDemoMode(true);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
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

    localStorage.setItem('tipidlink_demo_user', JSON.stringify(demoProfile));
    setUser({ id: demoProfile.id, email: demoProfile.email });
    setProfile(demoProfile);
    setIsDemoMode(true);
    return { success: true };
  };

  // Sign out
  const signOut = async () => {
    if (isDemoMode || !isSupabaseConfigured) {
      localStorage.removeItem('tipidlink_demo_user');
      setUser(null);
      setProfile(null);
      setIsDemoMode(false);
      return;
    }

    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      localStorage.setItem('tipidlink_demo_user', JSON.stringify(updated));
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
