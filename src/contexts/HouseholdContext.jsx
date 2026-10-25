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

  // Load households whenever user changes
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

  const loadHouseholds = async () => {
    setLoading(true);

    if (isDemoMode || !isSupabaseConfigured) {
      // Load from localStorage or mockData
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

    try {
      // Fetch households user is a member of via Supabase
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

      const hhList = (memberRows || [])
        .map(row => row.households)
        .filter(Boolean);

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
    if (isDemoMode || !isSupabaseConfigured) {
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
        full_name: m.profiles?.full_name || 'Family Member',
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

  const generateInviteCode = (name = 'TIPID') => {
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'TIPID';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${clean}-${random}`;
  };

  const createHousehold = async ({ name, description = '', monthly_budget_target = 50000, currency = 'PHP' }) => {
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

      const updatedList = [...households, newHH];
      setHouseholds(updatedList);
      setCurrentHousehold(newHH);
      localStorage.setItem('tipidlink_demo_households', JSON.stringify(updatedList));
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
      localStorage.setItem(`tipidlink_demo_members_${newHH.id}`, JSON.stringify([ownerMember]));

      return { success: true, household: newHH };
    }

    try {
      // 1. Insert household
      const { data: hhData, error: hhErr } = await supabase
        .from('households')
        .insert({
          name,
          description,
          monthly_budget_target: Number(monthly_budget_target),
          currency,
          invite_code,
          created_by: user.id,
        })
        .select()
        .single();

      if (hhErr) throw hhErr;

      // 2. Add creator as owner
      const { error: memErr } = await supabase
        .from('household_members')
        .insert({
          household_id: hhData.id,
          user_id: user.id,
          role: 'owner',
          nickname: profile?.full_name || 'Owner',
        });

      if (memErr) throw memErr;

      const updatedList = [...households, hhData];
      setHouseholds(updatedList);
      setCurrentHousehold(hhData);
      localStorage.setItem('tipidlink_active_household_id', hhData.id);

      return { success: true, household: hhData };
    } catch (err) {
      console.error('Create household failed:', err);
      return { success: false, error: err.message };
    }
  };

  const joinHouseholdByCode = async (inviteCode) => {
    const cleanCode = inviteCode.trim().toUpperCase();

    if (isDemoMode || !isSupabaseConfigured) {
      // Check if code matches Santos or mock
      if (cleanCode === 'SANTOS2026' || cleanCode.startsWith('TIPID')) {
        const target = households.find(h => h.invite_code === cleanCode) || INITIAL_DEMO_DATA.household;
        const alreadyIn = members.some(m => m.user_id === user.id && m.household_id === target.id);
        if (alreadyIn) {
          return { success: false, error: 'You are already a member of this household!' };
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
      return { success: false, error: 'Invalid invite code. Try "SANTOS2026" or create a new household.' };
    }

    try {
      // 1. Look up household by invite_code
      const { data: hh, error: lookupErr } = await supabase
        .from('households')
        .select('*')
        .ilike('invite_code', cleanCode)
        .single();

      if (lookupErr || !hh) {
        return { success: false, error: 'Invalid invite code. Please check and try again.' };
      }

      // 2. Check if already joined
      const { data: existing } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', hh.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setCurrentHousehold(hh);
        return { success: true, message: 'You are already a member of this household.' };
      }

      // 3. Join
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
      localStorage.setItem('tipidlink_demo_households', JSON.stringify(list));
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
      localStorage.setItem(`tipidlink_demo_members_${currentHousehold.id}`, JSON.stringify(updated));
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
      localStorage.setItem(`tipidlink_demo_members_${currentHousehold.id}`, JSON.stringify(updated));
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

  // Find user's role in current household
  const currentMember = members.find(m => m.user_id === user?.id);
  const currentUserRole = currentMember?.role || 'member';
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
