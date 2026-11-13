import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { INITIAL_DEMO_DATA } from '../lib/mockData';

const HouseholdContext = createContext(null);

export const HouseholdProvider = ({ children }) => {
  const { user, profile, isDemoMode } = useAuth();
  const [households, setHouseholds] = useState([]);
  const [currentHousehold, setCurrentHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load households whenever user or demo status changes
  useEffect(() => {
    if (!user) {
      setHouseholds([]);
      setCurrentHousehold(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    loadHouseholds();
  }, [user, isDemoMode]);

  // Load members whenever current household changes
  useEffect(() => {
    if (currentHousehold) {
      loadMembers(currentHousehold.id);
    } else {
      setMembers([]);
    }
  }, [currentHousehold]);

  const generateInviteCode = (name = 'TIPID') => {
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'TIPID';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${clean}-${random}`;
  };

  const createHouseholdInternal = async ({ name, description = '', monthly_budget_target = 0, currency = 'PHP' }) => {
    const invite_code = generateInviteCode(name);

    if (isDemoMode || !isSupabaseConfigured) {
      const newHH = {
        id: `hh-${Date.now()}`,
        name,
        description,
        monthly_budget_target: Number(monthly_budget_target),
        currency,
        invite_code,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };

      const storageKey = isDemoMode
        ? 'tipidlink_demo_households'
        : `tipidlink_user_households_${user.id}`;

      let currentList = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) currentList = JSON.parse(saved);
      } catch (e) {
        currentList = [];
      }

      const updatedList = [...currentList, newHH];
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      localStorage.setItem('tipidlink_active_household_id', newHH.id);

      const ownerMember = {
        id: `mem-${Date.now()}`,
        household_id: newHH.id,
        user_id: user.id,
        full_name: profile?.full_name || 'House Owner',
        email: profile?.email || user.email,
        role: 'owner',
        nickname: profile?.full_name || 'Owner',
        joined_at: new Date().toISOString(),
      };
      setMembers([ownerMember]);
      localStorage.setItem(`tipidlink_members_${newHH.id}`, JSON.stringify([ownerMember]));

      return { success: true, household: newHH };
    }

    try {
      const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });

      const newHH = {
        id: newId,
        name,
        description,
        monthly_budget_target: Number(monthly_budget_target),
        currency,
        invite_code,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };

      // 1. Insert household without select() to pass Supabase RLS
      const { error: hhErr } = await supabase
        .from('households')
        .insert({
          id: newId,
          name,
          description,
          monthly_budget_target: Number(monthly_budget_target),
          currency,
          invite_code,
          created_by: user.id,
        });

      if (hhErr) throw hhErr;

      // 2. Add creator as owner
      const { error: memErr } = await supabase
        .from('household_members')
        .insert({
          household_id: newId,
          user_id: user.id,
          role: 'owner',
          nickname: profile?.full_name || 'Owner',
        });

      if (memErr) throw memErr;

      localStorage.setItem('tipidlink_active_household_id', newId);
      return { success: true, household: newHH };
    } catch (err) {
      console.error('Failed to create household:', err);
      return { success: false, error: err.message };
    }
  };

  const loadHouseholds = async () => {
    setLoading(true);

    if (isDemoMode) {
      // Load Santos demo household
      const savedHH = localStorage.getItem('tipidlink_demo_households');
      let hhList = [];
      if (savedHH) {
        try {
          hhList = JSON.parse(savedHH);
        } catch {
          hhList = [INITIAL_DEMO_DATA.household];
        }
      } else {
        hhList = [INITIAL_DEMO_DATA.household];
        localStorage.setItem('tipidlink_demo_households', JSON.stringify(hhList));
      }

      setHouseholds(hhList);
      const activeId = localStorage.getItem('tipidlink_active_household_id');
      const active = hhList.find(h => h.id === activeId) || hhList[0];
      setCurrentHousehold(active || null);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      // Offline fallback for real registered users: do NOT show Santos family
      const storageKey = `tipidlink_user_households_${user?.id}`;
      const savedHH = localStorage.getItem(storageKey);
      let hhList = [];
      if (savedHH) {
        try {
          hhList = JSON.parse(savedHH);
        } catch {
          hhList = [];
        }
      }
      if (hhList.length === 0 && user) {
        const familyLastName = (profile?.full_name || user?.email?.split('@')[0] || 'My').trim().split(' ').slice(-1)[0];
        const defaultHH = {
          id: `hh-${Date.now()}`,
          name: `${familyLastName} Household`,
          description: 'Aming pampamilyang budget',
          monthly_budget_target: 0,
          currency: 'PHP',
          invite_code: generateInviteCode(familyLastName),
          created_by: user.id,
          created_at: new Date().toISOString(),
        };
        hhList = [defaultHH];
        localStorage.setItem(storageKey, JSON.stringify(hhList));
      }
      setHouseholds(hhList);
      setCurrentHousehold(hhList[0] || null);
      setLoading(false);
      return;
    }

    try {
      // Supabase query for real user's households
      const { data: memberRows, error: memberErr } = await supabase
        .from('household_members')
        .select(`
          household_id,
          role,
          households:household_id (
            id,
            name,
            description,
            currency,
            monthly_budget_target,
            invite_code,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (memberErr) throw memberErr;

      let hhList = (memberRows || [])
        .map(row => row.households)
        .filter(Boolean);

      // If a real registered user has 0 households, auto-create a clean household for them
      if (hhList.length === 0 && user) {
        const familyLastName = (profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My').trim().split(' ').slice(-1)[0];
        const familyName = `${familyLastName} Household`;

        const autoCreated = await createHouseholdInternal({
          name: familyName,
          description: 'Shared family household',
          monthly_budget_target: 0,
          currency: 'PHP',
        });

        if (autoCreated.success && autoCreated.household) {
          hhList = [autoCreated.household];
        }
      }

      setHouseholds(hhList);

      if (hhList.length > 0) {
        const savedId = localStorage.getItem('tipidlink_active_household_id');
        const found = hhList.find(h => h.id === savedId) || hhList[0];
        setCurrentHousehold(found);
      } else {
        setCurrentHousehold(null);
      }
    } catch (err) {
      console.error('Error fetching households:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (householdId) => {
    if (isDemoMode) {
      const savedMembers = localStorage.getItem(`tipidlink_demo_members_${householdId}`);
      if (savedMembers) {
        try {
          setMembers(JSON.parse(savedMembers));
          return;
        } catch (e) {
          console.error(e);
        }
      }
      setMembers(INITIAL_DEMO_DATA.members);
      return;
    }

    if (!isSupabaseConfigured) {
      const savedMembers = localStorage.getItem(`tipidlink_members_${householdId}`);
      if (savedMembers) {
        try {
          setMembers(JSON.parse(savedMembers));
          return;
        } catch (e) {
          console.error(e);
        }
      }
      const singleMember = [{
        id: `mem-${user?.id}`,
        household_id: householdId,
        user_id: user?.id,
        role: 'owner',
        nickname: profile?.full_name || 'Owner',
        joined_at: new Date().toISOString(),
        full_name: profile?.full_name || 'Account Owner',
        email: user?.email || '',
        avatar_url: profile?.avatar_url || '',
      }];
      setMembers(singleMember);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('household_members')
        .select(`
          id,
          household_id,
          user_id,
          role,
          nickname,
          joined_at,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('household_id', householdId);

      if (error) throw error;

      const formatted = (data || []).map(m => ({
        id: m.id,
        household_id: m.household_id,
        user_id: m.user_id,
        role: m.role,
        nickname: m.nickname,
        joined_at: m.joined_at,
        full_name: m.profiles?.full_name || (m.user_id === user?.id ? (profile?.full_name || 'You') : 'Family Member'),
        email: m.profiles?.email || '',
        avatar_url: m.profiles?.avatar_url || '',
      }));

      setMembers(formatted);
    } catch (err) {
      console.error('Error loading household members:', err);
    }
  };

  const switchHousehold = (householdId) => {
    const target = households.find(h => h.id === householdId);
    if (target) {
      setCurrentHousehold(target);
      localStorage.setItem('tipidlink_active_household_id', target.id);
    }
  };

  const createHousehold = async ({ name, description = '', monthly_budget_target = 0, currency = 'PHP' }) => {
    const res = await createHouseholdInternal({ name, description, monthly_budget_target, currency });
    if (res.success && res.household) {
      setHouseholds(prev => [...prev, res.household]);
      setCurrentHousehold(res.household);
    }
    return res;
  };

  const joinHouseholdByCode = async (inviteCode) => {
    const cleanCode = inviteCode.trim().toUpperCase();

    if (isDemoMode) {
      if (cleanCode === 'SANTOS2026' || cleanCode.startsWith('TIPID')) {
        const target = households.find(h => h.invite_code === cleanCode) || INITIAL_DEMO_DATA.household;
        const alreadyIn = members.some(m => m.user_id === user.id && m.household_id === target.id);
        if (alreadyIn) {
          return { success: false, error: 'Kasapi ka na sa household na ito!' };
        }
        const newMember = {
          id: `mem-${Date.now()}`,
          household_id: target.id,
          user_id: user.id,
          full_name: profile?.full_name || 'New Member',
          email: profile?.email || user.email,
          role: 'member',
          nickname: profile?.full_name || 'Member',
          joined_at: new Date().toISOString(),
        };
        const updatedMembers = [...members, newMember];
        setMembers(updatedMembers);
        localStorage.setItem(`tipidlink_demo_members_${target.id}`, JSON.stringify(updatedMembers));
        setCurrentHousehold(target);
        return { success: true, household: target };
      }
      return { success: false, error: 'Invalid invite code.' };
    }

    if (!isSupabaseConfigured) {
      return { success: false, error: 'Household join requires an active connection.' };
    }

    try {
      const { data: hh, error: lookupErr } = await supabase
        .from('households')
        .select('*')
        .ilike('invite_code', cleanCode)
        .single();

      if (lookupErr || !hh) {
        return { success: false, error: 'Hindi natagpuan ang household gamit ang code na ito. Pakisuri muli.' };
      }

      const { data: existing } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', hh.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setCurrentHousehold(hh);
        return { success: true, message: 'Kasapi ka na sa household na ito.' };
      }

      const { error: joinErr } = await supabase
        .from('household_members')
        .insert({
          household_id: hh.id,
          user_id: user.id,
          role: 'member',
          nickname: profile?.full_name || 'Member',
        });

      if (joinErr) throw joinErr;

      await loadHouseholds();
      setCurrentHousehold(hh);
      return { success: true, household: hh };
    } catch (err) {
      console.error('Join household failed:', err);
      return { success: false, error: err.message };
    }
  };

  const updateHousehold = async (updates) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    if (isDemoMode || !isSupabaseConfigured) {
      const updated = { ...currentHousehold, ...updates, updated_at: new Date().toISOString() };
      setCurrentHousehold(updated);
      const list = households.map(h => h.id === updated.id ? updated : h);
      setHouseholds(list);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('households')
        .update(updates)
        .eq('id', currentHousehold.id);

      if (error) throw error;
      setCurrentHousehold(prev => ({ ...prev, ...updates }));
      setHouseholds(prev => prev.map(h => h.id === currentHousehold.id ? { ...h, ...updates } : h));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = members.map(m => m.id === memberId ? { ...m, role: newRole } : m);
      setMembers(updated);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('household_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeMember = async (memberId) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = members.filter(m => m.id !== memberId);
      setMembers(updated);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const currentMember = members.find(m => m.user_id === user?.id);
  const currentUserRole = currentMember?.role || 'owner';
  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        members,
        loading,
        currentUserRole,
        isOwnerOrAdmin,
        switchHousehold,
        createHousehold,
        joinHouseholdByCode,
        updateHousehold,
        updateMemberRole,
        removeMember,
        refreshHouseholds: loadHouseholds,
        refreshMembers: () => currentHousehold && loadMembers(currentHousehold.id),
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
