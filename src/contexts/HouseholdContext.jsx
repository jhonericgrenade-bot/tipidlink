import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { INITIAL_DEMO_DATA } from '../lib/mockData';

// Safe Base64URL encoder/decoder for household share codes
export const encodeHouseholdCode = (uuid) => {
  if (!uuid) return '';
  try {
    const hex = uuid.replace(/-/g, '');
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return uuid;
  }
};

export const decodeHouseholdCode = (code) => {
  if (!code) return null;
  const clean = code.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return clean.toLowerCase();
  }
  if (/^[0-9a-f]{32}$/i.test(clean)) {
    const h = clean.toLowerCase();
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  try {
    let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    let hex = '';
    for (let i = 0; i < binary.length; i++) {
      const h = binary.charCodeAt(i).toString(16).padStart(2, '0');
      hex += h;
    }
    if (hex.length !== 32) return null;
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join('-');
  } catch {
    return null;
  }
};

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

      const currentOwnerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || profile?.full_name || 'House Owner';
      const ownerMember = {
        id: `mem-${Date.now()}`,
        household_id: newHH.id,
        user_id: user.id,
        full_name: currentOwnerName,
        email: profile?.email || user.email,
        role: 'owner',
        nickname: currentOwnerName,
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
      const currentUserName = user?.user_metadata?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'Owner';
      const { error: memErr } = await supabase
        .from('household_members')
        .insert({
          household_id: newId,
          user_id: user.id,
          role: 'owner',
          nickname: currentUserName,
        });

      if (memErr) throw memErr;

      // 3. Register invite_code in profile for universal public lookup by other joining family members
      try {
        const { data: currentP } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        let entries = currentP?.phone ? currentP.phone.replace(/^INVITES?:/i, '').split('|').filter(Boolean) : [];
        entries = entries.filter(e => !e.toUpperCase().startsWith(`${invite_code.toUpperCase()}:`));
        entries.push(`${invite_code.toUpperCase()}:${newId}`);
        const newPhone = `INVITES:${entries.join('|')}`;

        await supabase
          .from('profiles')
          .update({ phone: newPhone })
          .eq('id', user.id);
      } catch (pErr) {
        console.warn('Profile code sync notice:', pErr);
      }

      localStorage.setItem('tipidlink_active_household_id', newId);
      return { success: true, household: newHH };
    } catch (err) {
      console.error('Failed to create household:', err);
      return { success: false, error: err.message };
    }
  };

  const loadHouseholds = async (forceSelectId = null) => {
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
      const activeId = forceSelectId || localStorage.getItem('tipidlink_active_household_id');
      const active = hhList.find(h => h.id === activeId) || hhList[0];
      setCurrentHousehold(active || null);
      if (active?.id) {
        localStorage.setItem('tipidlink_active_household_id', active.id);
      }
      setLoading(false);
      return hhList;
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
      // If user signed up with a pending invite code, join that household first
      const pendingJoinCode = localStorage.getItem('tipidlink_pending_join_code');
      if (pendingJoinCode) {
        localStorage.removeItem('tipidlink_pending_join_code');
        const joinRes = await joinHouseholdByCode(pendingJoinCode);
        if (joinRes.success) {
          return;
        }
      }

      if (hhList.length === 0 && user) {
        const currentFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My';
        const familyLastName = currentFullName.trim().split(' ').slice(-1)[0] || 'Family';
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
      // Sort hhList so joined households appear first
      hhList.sort((a, b) => {
        const aIsJoined = (a.created_by !== user?.id) || (a.user_role === 'member' || a.user_role === 'admin');
        const bIsJoined = (b.created_by !== user?.id) || (b.user_role === 'member' || b.user_role === 'admin');
        if (aIsJoined && !bIsJoined) return -1;
        if (!aIsJoined && bIsJoined) return 1;
        return 0;
      });
      setHouseholds(hhList);
      const joinedHousehold = hhList.find(h => 
        (h.created_by !== user?.id) || (h.user_role === 'member' || h.user_role === 'admin')
      );
      const activeId = forceSelectId || (joinedHousehold ? joinedHousehold.id : null) || localStorage.getItem('tipidlink_active_household_id');
      const active = hhList.find(h => h.id === activeId) || joinedHousehold || hhList[0];
      setCurrentHousehold(active || null);
      if (active?.id) {
        localStorage.setItem('tipidlink_active_household_id', active.id);
        if (user?.id) {
          localStorage.setItem(`tipidlink_active_household_${user.id}`, active.id);
        }
      }
      setLoading(false);
      return hhList;
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
        .map(row => {
          if (!row.households) return null;
          return {
            ...row.households,
            user_role: row.role || (row.households.created_by === user.id ? 'owner' : 'member'),
          };
        })
        .filter(Boolean);

      // If user signed up with a pending invite code, join that household first
      const pendingJoinCode = localStorage.getItem('tipidlink_pending_join_code');
      if (pendingJoinCode) {
        localStorage.removeItem('tipidlink_pending_join_code');
        const joinRes = await joinHouseholdByCode(pendingJoinCode);
        if (joinRes.success) {
          return;
        }
      }

      // If a real registered user has 0 households, auto-create a clean household for them
      if (hhList.length === 0 && user) {
        // ALWAYS use user metadata from the current authenticated user to prevent stale profile leaks
        const currentFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My';
        const familyLastName = currentFullName.trim().split(' ').slice(-1)[0] || 'Family';
        const familyName = `${familyLastName} Household`;

        const autoCreated = await createHouseholdInternal({
          name: familyName,
          description: 'Shared family household',
          monthly_budget_target: 0,
          currency: 'PHP',
        });

        if (autoCreated.success && autoCreated.household) {
          hhList = [{
            ...autoCreated.household,
            user_role: 'owner',
          }];
        }
      }

      // Prioritize joined family households where user is an admin or member.
      // Auto-created single-member dummy households (created_by === user.id) are placed after joined households.
      hhList.sort((a, b) => {
        const aIsJoined = (a.created_by !== user?.id) || (a.user_role === 'member' || a.user_role === 'admin');
        const bIsJoined = (b.created_by !== user?.id) || (b.user_role === 'member' || b.user_role === 'admin');
        if (aIsJoined && !bIsJoined) return -1;
        if (!aIsJoined && bIsJoined) return 1;
        return 0;
      });

      setHouseholds(hhList);

      if (hhList.length > 0) {
        // Identify joined household (where role is admin or member, or created_by is someone else)
        const joinedHousehold = hhList.find(h => 
          (h.created_by !== user?.id) || (h.user_role === 'member' || h.user_role === 'admin')
        );

        let activeId = forceSelectId;

        // If not force-selected by manual switcher:
        if (!activeId) {
          const userSavedId = user?.id ? localStorage.getItem(`tipidlink_active_household_${user.id}`) : null;
          const genericSavedId = localStorage.getItem('tipidlink_active_household_id');
          const candidateId = userSavedId || genericSavedId;

          if (candidateId) {
            const candidate = hhList.find(h => h.id === candidateId);
            // If the candidate household is their own empty auto-created household,
            // but the user belongs to a joined family household, automatically direct to the joined household!
            if (candidate) {
              if (candidate.created_by === user?.id && joinedHousehold) {
                activeId = joinedHousehold.id;
              } else {
                activeId = candidate.id;
              }
            }
          }
        }

        // Fallback default: if user belongs to a joined household (admin/member), default to it!
        if (!activeId) {
          activeId = joinedHousehold ? joinedHousehold.id : hhList[0].id;
        }

        const found = hhList.find(h => h.id === activeId) || joinedHousehold || hhList[0];
        setCurrentHousehold(found);
        if (found?.id) {
          localStorage.setItem('tipidlink_active_household_id', found.id);
          if (user?.id) {
            localStorage.setItem(`tipidlink_active_household_${user.id}`, found.id);
          }
        }

        // Keep ALL invite_codes in profile.phone in sync for reliable family lookup
        if (user) {
          const syncEntries = hhList
            .filter(h => h.id && h.invite_code)
            .map(h => `${h.invite_code.toUpperCase().replace(/\s+/g, '')}:${h.id}`);
          if (syncEntries.length > 0) {
            supabase
              .from('profiles')
              .update({
                phone: `INVITES:${syncEntries.join('|')}`,
              })
              .eq('id', user.id)
              .then(() => {})
              .catch(() => {});
          }
        }
      } else {
        setCurrentHousehold(null);
      }
      return hhList;
    } catch (err) {
      console.error('Error fetching households:', err);
      return [];
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
        full_name: m.user_id === user?.id 
          ? (user?.user_metadata?.full_name || profile?.full_name || m.profiles?.full_name || 'You')
          : (m.profiles?.full_name || m.nickname || 'Family Member'),
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
    const rawCode = (inviteCode || '').trim();
    if (!rawCode) {
      return { success: false, error: 'Please enter the household invite code.' };
    }

    if (isDemoMode) {
      const cleanUpper = rawCode.toUpperCase();
      if (cleanUpper === 'SANTOS2026' || cleanUpper.startsWith('TIPID')) {
        const target = households.find(h => h.invite_code === cleanUpper) || INITIAL_DEMO_DATA.household;
        const alreadyIn = members.some(m => m.user_id === user.id && m.household_id === target.id);
        if (alreadyIn) {
          return { success: false, error: 'You are already a member of this household!' };
        }
        const newMember = {
          id: `mem-${Date.now()}`,
          household_id: target.id,
          user_id: user.id,
          full_name: user?.user_metadata?.full_name || profile?.full_name || 'New Member',
          email: profile?.email || user.email,
          role: 'member',
          nickname: user?.user_metadata?.full_name || profile?.full_name || 'Member',
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
      const cleanInput = rawCode.trim();
      const cleanUpper = cleanInput.toUpperCase().replace(/\s+/g, '');
      let targetHouseholdId = null;

      // Step 1: Universal lookup in profiles.phone (INVITES:CODE:UUID|CODE2:UUID2)
      // This is accessible to all authenticated users and handles both invite_codes and encoded UUIDs
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('phone')
        .not('phone', 'is', null)
        .ilike('phone', '%INVITE%');

      for (const p of (matchedProfiles || [])) {
        if (!p.phone) continue;

        // Strip prefix "INVITES:" or "INVITE:"
        const cleanPhone = p.phone.replace(/^INVITES?:/i, '');
        // Split multiple entries by pipe '|'
        const entries = cleanPhone.split('|');

        for (const entry of entries) {
          const parts = entry.trim().split(':');
          if (parts.length >= 2) {
            const registeredCode = parts[0].trim().toUpperCase();
            const uuid = parts[1].trim();

            // Match exact invite code (e.g. "KALAB-4211") or without dash ("KALAB4211")
            if (
              registeredCode === cleanUpper ||
              registeredCode.replace(/-/g, '') === cleanUpper.replace(/-/g, '')
            ) {
              targetHouseholdId = uuid;
              break;
            }

            // Match direct UUID
            if (uuid.toLowerCase() === cleanInput.toLowerCase()) {
              targetHouseholdId = uuid;
              break;
            }

            // Match Base64 encoded UUID (handles both original case and uppercase)
            const encoded = encodeHouseholdCode(uuid);
            if (
              encoded === cleanInput ||
              encoded.toUpperCase() === cleanUpper
            ) {
              targetHouseholdId = uuid;
              break;
            }
          }
        }
        if (targetHouseholdId) break;
      }

      // Step 2: Direct fallback query in households table
      if (!targetHouseholdId) {
        try {
          const { data: hh } = await supabase
            .from('households')
            .select('id, name, invite_code')
            .ilike('invite_code', cleanInput)
            .maybeSingle();

          if (hh?.id) {
            targetHouseholdId = hh.id;
          }
        } catch (e) {
          console.warn('Household lookup notice:', e);
        }
      }

      // Step 3: Fallback decodeHouseholdCode only if still not resolved
      if (!targetHouseholdId) {
        targetHouseholdId = decodeHouseholdCode(cleanInput);
      }

      if (!targetHouseholdId) {
        return { success: false, error: 'Household not found with this code. Please check the spelling of the invite code provided by the household owner.' };
      }

      // Check if already joined
      const { data: existing } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', targetHouseholdId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        localStorage.setItem('tipidlink_active_household_id', targetHouseholdId);
        if (user?.id) {
          localStorage.setItem(`tipidlink_active_household_${user.id}`, targetHouseholdId);
        }
        const freshList = await loadHouseholds(targetHouseholdId);
        const joinedHH = freshList.find(h => h.id === targetHouseholdId);
        if (joinedHH) {
          setCurrentHousehold(joinedHH);
        }
        return { success: true, message: 'You are already a member of this household.' };
      }

      // Insert membership
      const memberNickname = user?.user_metadata?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'Member';
      const { error: joinErr } = await supabase
        .from('household_members')
        .insert({
          household_id: targetHouseholdId,
          user_id: user.id,
          role: 'member',
          nickname: memberNickname,
        });

      if (joinErr) {
        if (joinErr.code === '23503' || joinErr.message?.includes('foreign key')) {
          return {
            success: false,
            error: 'Household not found or no longer active with this code. Please verify the invite code with the owner.'
          };
        }
        throw joinErr;
      }

      localStorage.setItem('tipidlink_active_household_id', targetHouseholdId);
      if (user?.id) {
        localStorage.setItem(`tipidlink_active_household_${user.id}`, targetHouseholdId);
      }
      const freshList = await loadHouseholds(targetHouseholdId);
      const joinedHH = freshList.find(h => h.id === targetHouseholdId);
      if (joinedHH) {
        setCurrentHousehold(joinedHH);
      }
      return { success: true };
    } catch (err) {
      console.error('Join household failed:', err);
      return { success: false, error: err.message };
    }
  };

  const updateHousehold = async (updates) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };
    if (!isOwnerOrAdmin) return { success: false, error: 'Only owners and admins can update household settings.' };

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
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Only owners and admins can update member roles.' };
    }
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return { success: false, error: 'Member not found.' };

    if (currentUserRole === 'admin') {
      if (targetMember.role === 'owner') {
        return { success: false, error: 'Admins cannot change the household owner.' };
      }
      if (newRole === 'owner') {
        return { success: false, error: 'Only owners can assign the owner role.' };
      }
    }

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
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Only owners and admins can remove members.' };
    }
    const targetMember = members.find(m => m.id === memberId);
    if (targetMember?.role === 'owner') {
      return { success: false, error: 'The household owner cannot be removed.' };
    }
    if (currentUserRole === 'admin' && targetMember?.role === 'admin') {
      return { success: false, error: 'Admins cannot remove other admins. Only the owner can.' };
    }

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

  const deleteHousehold = async (householdId) => {
    if (!householdId) return { success: false, error: 'No household ID provided' };
    if (currentUserRole !== 'owner') {
      return { success: false, error: 'Only the household owner can delete the household.' };
    }

    if (isDemoMode || !isSupabaseConfigured) {
      const remaining = households.filter(h => h.id !== householdId);
      setHouseholds(remaining);
      const nextActive = remaining[0] || null;
      setCurrentHousehold(nextActive);
      if (nextActive) {
        localStorage.setItem('tipidlink_active_household_id', nextActive.id);
      } else {
        localStorage.removeItem('tipidlink_active_household_id');
      }
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', householdId);

      if (error) throw error;

      const remaining = households.filter(h => h.id !== householdId);
      setHouseholds(remaining);
      const nextActive = remaining[0] || null;
      setCurrentHousehold(nextActive);
      if (nextActive) {
        localStorage.setItem('tipidlink_active_household_id', nextActive.id);
      } else {
        localStorage.removeItem('tipidlink_active_household_id');
      }

      await loadHouseholds();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const leaveHousehold = async (householdId) => {
    if (!householdId || !user) return { success: false, error: 'No household ID or user' };

    if (isDemoMode || !isSupabaseConfigured) {
      const remaining = households.filter(h => h.id !== householdId);
      setHouseholds(remaining);
      const nextActive = remaining[0] || null;
      setCurrentHousehold(nextActive);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', user.id);

      if (error) throw error;

      const remaining = households.filter(h => h.id !== householdId);
      setHouseholds(remaining);
      const nextActive = remaining[0] || null;
      setCurrentHousehold(nextActive);
      if (nextActive) {
        localStorage.setItem('tipidlink_active_household_id', nextActive.id);
      } else {
        localStorage.removeItem('tipidlink_active_household_id');
      }

      await loadHouseholds();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Auto-refresh when tab/app regains focus (e.g. switching back on mobile)
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible' && currentHousehold?.id && user) {
        loadMembers(currentHousehold.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentHousehold?.id, user?.id]);

  const currentMember = members.find(m => m.user_id === user?.id);
  const currentUserRole = currentMember?.role || (currentHousehold?.created_by === user?.id ? 'owner' : 'member');
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin';
  const isMember = currentUserRole === 'member';
  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  const shareCode = isDemoMode
    ? (currentHousehold?.invite_code || 'SANTOS2026')
    : (currentHousehold?.invite_code || encodeHouseholdCode(currentHousehold?.id) || '');

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        members,
        loading,
        currentUserRole,
        isOwner,
        isAdmin,
        isMember,
        isOwnerOrAdmin,
        shareCode,
        switchHousehold,
        createHousehold,
        joinHouseholdByCode,
        updateHousehold,
        updateMemberRole,
        removeMember,
        deleteHousehold,
        leaveHousehold,
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
