import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { INITIAL_DEMO_DATA } from '../lib/mockData';
import { broadcastSyncEvent, subscribeToSyncEvents, isMatchingHouseholdId } from '../lib/realtimeSync';
import {
  parseHouseholdTier,
  formatHouseholdDescription,
  isSantosHouseholdId,
  SANTOS_UUID,
  SANTOS_DEMO_ID
} from '../lib/premiumTier';

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

// Strict Pre-validation helper to verify household code existence BEFORE allowing signup or join to proceed
export const verifyInviteCodeExists = async (code) => {
  const raw = (code || '').trim();
  if (!raw) return { exists: false, error: 'Pakilagay ang household invite code.' };
  const cleanUpper = raw.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');

  // 1. Strict Santos Household presentation code
  if (cleanUpper === 'SANTOS2026') {
    return {
      exists: true,
      householdId: '0d37e235-c9dd-4876-a54a-9acb36516599',
      householdName: 'Santos Family Household',
      inviteCode: 'SANTOS2026',
    };
  }

  // 2. Explicitly reject any partial or invalid variants of SANTOS (e.g. SANTOS2027, SANTOS123)
  if (cleanUpper.startsWith('SANTOS')) {
    return {
      exists: false,
      error: 'Maling household invite code. Ang opisyal na code ng Santos Family ay SANTOS2026. Pakisuri ang tamang code bago magpatuloy.'
    };
  }

  // 3. For any other codes, if user is already authenticated in Supabase, query cloud data directly
  if (isSupabaseConfigured && supabase?.auth) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Search profiles.phone
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('phone')
          .not('phone', 'is', null)
          .ilike('phone', '%INVITE%');

        for (const p of (matchedProfiles || [])) {
          if (!p.phone) continue;
          const cleanPhone = p.phone.replace(/^INVITES?:/i, '');
          const entries = cleanPhone.split('|');
          for (const entry of entries) {
            const parts = entry.trim().split(':');
            if (parts.length >= 2) {
              const registeredCode = parts[0].trim().toUpperCase();
              const uuid = parts[1].trim();
              if (
                registeredCode === cleanUpper ||
                registeredCode.replace(/-/g, '') === cleanUpper.replace(/-/g, '')
              ) {
                return { exists: true, householdId: uuid, inviteCode: registeredCode };
              }
            }
          }
        }

        // Direct lookup in households table
        const { data: hh } = await supabase
          .from('households')
          .select('id, name, invite_code')
          .ilike('invite_code', raw)
          .maybeSingle();

        if (hh?.id) {
          return { exists: true, householdId: hh.id, householdName: hh.name, inviteCode: hh.invite_code };
        }
      }
    } catch (err) {
      console.warn('Pre-validation check note:', err);
    }
  }

  return {
    exists: false,
    error: 'Hindi nahanap ang household code na ito (o hindi pa nagagawa). Pakisuri ang tamang invite code mula sa household owner bago magpatuloy.'
  };
};

const HouseholdContext = createContext(null);

export const HouseholdProvider = ({ children }) => {
  const { user, profile, isDemoMode } = useAuth();

  // Instant warm cache initialization so current household is never temporarily null on open
  const [households, setHouseholds] = useState(() => {
    try {
      const activeId = localStorage.getItem('tipidlink_active_household_id');
      const userHH = user?.id ? localStorage.getItem(`tipidlink_user_households_${user.id}`) : null;
      const demoHH = localStorage.getItem('tipidlink_demo_households');
      const source = userHH || demoHH;
      if (source) {
        const list = JSON.parse(source);
        if (Array.isArray(list) && list.length > 0) return list;
      }
      if (activeId === 'hh-santos-family') {
        return [INITIAL_DEMO_DATA.household];
      }
    } catch {}
    return [];
  });

  const [currentHousehold, setCurrentHousehold] = useState(() => {
    try {
      const activeId = localStorage.getItem('tipidlink_active_household_id') || 'hh-santos-family';
      const userHH = user?.id ? localStorage.getItem(`tipidlink_user_households_${user.id}`) : null;
      const demoHH = localStorage.getItem('tipidlink_demo_households');
      const source = userHH || demoHH;
      if (source) {
        const list = JSON.parse(source);
        const found = list.find(h => h.id === activeId);
        if (found) return found;
      }
      if (activeId === 'hh-santos-family') {
        return INITIAL_DEMO_DATA.household;
      }
    } catch {}
    return null;
  });

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load households whenever user, demo status, or profile changes
  useEffect(() => {
    if (!user) {
      setHouseholds([]);
      setCurrentHousehold(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    loadHouseholds();
  }, [user?.id, isDemoMode, profile?.phone]);

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

    if (!isSupabaseConfigured || !user) {
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
        let active = hhList.find(h => h.id === activeId) || hhList[0];
        if (active) {
          const customTarget = localStorage.getItem(`tipidlink_household_target_${active.id}`)
            || localStorage.getItem('tipidlink_last_saved_target');
          if (customTarget) {
            active = { ...active, monthly_budget_target: Number(customTarget) };
          }
        }
        setCurrentHousehold(active || null);
        if (active?.id) {
          localStorage.setItem('tipidlink_active_household_id', active.id);
        }
        setLoading(false);
        return hhList;
      }

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

      // A user only has Santos Family if in demo mode OR explicitly joined via code SANTOS2026
      const hasJoinedSantos = isDemoMode
        || (user?.email && user.email.endsWith('@tipidlink.ph'))
        || (user?.id && localStorage.getItem(`tipidlink_user_joined_santos_${user.id}`) === 'true')
        || (user?.user_metadata?.joined_santos === true)
        || (profile?.phone && profile.phone.includes('JOINED:SANTOS2026'));

      if (hasJoinedSantos) {
        let directCloudTarget = null;
        let directCloudDesc = null;
        if (isSupabaseConfigured) {
          try {
            const { data: directHh } = await supabase
              .from('households')
              .select('monthly_budget_target, description')
              .eq('id', '0d37e235-c9dd-4876-a54a-9acb36516599')
              .maybeSingle();
            if (directHh && directHh.monthly_budget_target !== undefined && directHh.monthly_budget_target !== null) {
              directCloudTarget = Number(directHh.monthly_budget_target);
            }
            if (directHh?.description) {
              directCloudDesc = directHh.description;
            }
          } catch (e) {}
        }

        const santosTier = parseHouseholdTier(directCloudDesc || INITIAL_DEMO_DATA.household.description);
        const santosTierOverride = typeof localStorage !== 'undefined'
          ? (localStorage.getItem('tipidlink_household_tier_0d37e235-c9dd-4876-a54a-9acb36516599') || localStorage.getItem('tipidlink_household_tier_hh-santos-family') || localStorage.getItem('tipidlink_code_tier_SANTOS2026'))
          : null;
        const santosIsExplicitFree = santosTier.isExplicitFree || santosTierOverride === 'FREE';
        let santosIsPro = false;
        if (!santosIsExplicitFree) {
          const cachedSantosPremium = (typeof localStorage !== 'undefined' && (
            localStorage.getItem('tipidlink_household_premium_0d37e235-c9dd-4876-a54a-9acb36516599') === 'true' ||
            localStorage.getItem('tipidlink_household_premium_hh-santos-family') === 'true' ||
            santosTierOverride === 'PRO'
          ));
          santosIsPro = Boolean(santosTier.isPremium || cachedSantosPremium);
        }
        const santosPlan = santosTier.plan || (typeof localStorage !== 'undefined' ? (
          localStorage.getItem('tipidlink_household_plan_0d37e235-c9dd-4876-a54a-9acb36516599') ||
          localStorage.getItem('tipidlink_household_plan_hh-santos-family')
        ) : null) || (santosIsPro ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');
        const santosSponsor = santosTier.sponsor || (typeof localStorage !== 'undefined' ? (
          localStorage.getItem('tipidlink_household_sponsor_0d37e235-c9dd-4876-a54a-9acb36516599') ||
          localStorage.getItem('tipidlink_household_sponsor_hh-santos-family')
        ) : null);

        const savedSantosTarget = localStorage.getItem('tipidlink_household_target_0d37e235-c9dd-4876-a54a-9acb36516599')
          || localStorage.getItem('tipidlink_household_target_hh-santos-family')
          || localStorage.getItem('tipidlink_last_saved_target');
        const initialSantosTarget = directCloudTarget !== null
          ? directCloudTarget
          : (savedSantosTarget ? Number(savedSantosTarget) : 75000);

        const santosWithRole = {
          ...INITIAL_DEMO_DATA.household,
          id: '0d37e235-c9dd-4876-a54a-9acb36516599',
          name: 'Santos Family Household',
          description: santosTier.cleanDescription || 'Shared budget and expenses for the Santos family home in Pasig City',
          clean_description: santosTier.cleanDescription || 'Shared budget and expenses for the Santos family home in Pasig City',
          raw_description: directCloudDesc || INITIAL_DEMO_DATA.household.description,
          monthly_budget_target: initialSantosTarget,
          invite_code: 'SANTOS2026',
          is_premium: santosIsPro,
          premium_plan: santosPlan,
          sponsor_details: santosSponsor,
          user_role: user?.email?.startsWith('maria.santos') ? 'owner' : (user?.email?.startsWith('juan.santos') ? 'admin' : 'member'),
        };

        const existingSantosIndex = hhList.findIndex(h => h.id === '0d37e235-c9dd-4876-a54a-9acb36516599' || h.id === 'hh-santos-family' || h.invite_code === 'SANTOS2026');
        if (existingSantosIndex >= 0) {
          const cloudTarget = hhList[existingSantosIndex].monthly_budget_target;
          const currentTarget = (cloudTarget !== undefined && cloudTarget !== null)
            ? Number(cloudTarget)
            : (directCloudTarget !== null ? directCloudTarget : (savedSantosTarget ? Number(savedSantosTarget) : 75000));
          hhList[existingSantosIndex] = {
            ...hhList[existingSantosIndex],
            name: hhList[existingSantosIndex].name || 'Santos Family Household',
            description: santosTier.cleanDescription || hhList[existingSantosIndex].description,
            clean_description: santosTier.cleanDescription || hhList[existingSantosIndex].description,
            monthly_budget_target: currentTarget,
            invite_code: 'SANTOS2026',
            is_premium: santosIsPro,
            premium_plan: santosPlan,
            sponsor_details: santosSponsor,
            user_role: hhList[existingSantosIndex].user_role || santosWithRole.user_role,
          };
          localStorage.setItem('tipidlink_household_target_0d37e235-c9dd-4876-a54a-9acb36516599', String(currentTarget));
          localStorage.setItem('tipidlink_last_saved_target', String(currentTarget));
        } else {
          hhList.unshift(santosWithRole);
        }
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

      // Query all users/owners with active PREMIUM_STATUS:PRO in Supabase
      let proOwnerIds = new Set();
      try {
        const { data: proProfiles } = await supabase
          .from('profiles')
          .select('id, phone')
          .not('phone', 'is', null)
          .ilike('phone', '%PREMIUM_STATUS:PRO%');
        if (proProfiles) {
          proProfiles.forEach(p => proOwnerIds.add(p.id));
        }
      } catch (e) {
        console.warn('proProfiles fetch notice:', e);
      }

      let hhList = (memberRows || [])
        .map(row => {
          if (!row.households) return null;
          const tier = parseHouseholdTier(row.households.description);
          const hhId = row.households.id;
          const hhTierOverride = typeof localStorage !== 'undefined' ? localStorage.getItem(`tipidlink_household_tier_${hhId}`) : null;
          const codeTierOverride = (typeof localStorage !== 'undefined' && row.households.invite_code)
            ? localStorage.getItem(`tipidlink_code_tier_${row.households.invite_code}`)
            : null;

          const isExplicitFree = tier.isExplicitFree || hhTierOverride === 'FREE' || codeTierOverride === 'FREE';

          let isPro = false;
          const isOwnerPro = proOwnerIds.has(row.households.created_by);
          if (!isExplicitFree) {
            const cachedPremium = typeof localStorage !== 'undefined' ? localStorage.getItem(`tipidlink_household_premium_${hhId}`) : null;
            const cachedCodePremium = (typeof localStorage !== 'undefined' && row.households.invite_code)
              ? localStorage.getItem(`tipidlink_code_premium_${row.households.invite_code}`)
              : null;
            isPro = Boolean(tier.isPremium || isOwnerPro || hhTierOverride === 'PRO' || codeTierOverride === 'PRO' || cachedPremium === 'true' || cachedCodePremium === 'true');
          }

          const plan = tier.plan || (typeof localStorage !== 'undefined' ? localStorage.getItem(`tipidlink_household_plan_${hhId}`) : null) || (isPro ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');
          const sponsor = tier.sponsor || (typeof localStorage !== 'undefined' ? localStorage.getItem(`tipidlink_household_sponsor_${hhId}`) : null);

          if (typeof localStorage !== 'undefined') {
            if (isPro) {
              localStorage.setItem(`tipidlink_household_tier_${hhId}`, 'PRO');
              localStorage.setItem(`tipidlink_household_premium_${hhId}`, 'true');
              localStorage.setItem(`tipidlink_household_plan_${hhId}`, plan);
              if (row.households.invite_code) {
                localStorage.setItem(`tipidlink_code_tier_${row.households.invite_code}`, 'PRO');
                localStorage.setItem(`tipidlink_code_premium_${row.households.invite_code}`, 'true');
              }
              if (sponsor) localStorage.setItem(`tipidlink_household_sponsor_${hhId}`, sponsor);
            } else {
              localStorage.setItem(`tipidlink_household_tier_${hhId}`, 'FREE');
              localStorage.removeItem(`tipidlink_household_premium_${hhId}`);
              localStorage.removeItem(`tipidlink_household_plan_${hhId}`);
              localStorage.removeItem(`tipidlink_household_sponsor_${hhId}`);
              if (row.households.invite_code) {
                localStorage.setItem(`tipidlink_code_tier_${row.households.invite_code}`, 'FREE');
                localStorage.removeItem(`tipidlink_code_premium_${row.households.invite_code}`);
              }
            }
          }

          return {
            ...row.households,
            description: tier.cleanDescription || row.households.description,
            clean_description: tier.cleanDescription || row.households.description,
            raw_description: row.households.description,
            is_premium: isPro,
            owner_is_pro: isOwnerPro,
            premium_plan: plan,
            sponsor_details: sponsor,
            user_role: row.role || (row.households.created_by === user.id ? 'owner' : 'member'),
          };
        })
        .filter(Boolean);

      // A user only has Santos Family if in demo mode OR explicitly joined via code SANTOS2026
      const hasJoinedSantos = isDemoMode
        || (user?.email && user.email.endsWith('@tipidlink.ph'))
        || (user?.id && localStorage.getItem(`tipidlink_user_joined_santos_${user.id}`) === 'true')
        || (user?.user_metadata?.joined_santos === true)
        || (profile?.phone && profile.phone.includes('JOINED:SANTOS2026'));

      if (hasJoinedSantos) {
        let directCloudTarget = null;
        let directCloudDesc = null;
        if (isSupabaseConfigured) {
          try {
            const { data: directHh } = await supabase
              .from('households')
              .select('monthly_budget_target, description')
              .eq('id', '0d37e235-c9dd-4876-a54a-9acb36516599')
              .maybeSingle();
            if (directHh && directHh.monthly_budget_target !== undefined && directHh.monthly_budget_target !== null) {
              directCloudTarget = Number(directHh.monthly_budget_target);
            }
            if (directHh?.description) {
              directCloudDesc = directHh.description;
            }
          } catch (e) {}
        }

        const santosTier = parseHouseholdTier(directCloudDesc || INITIAL_DEMO_DATA.household.description);
        const santosTierOverride = typeof localStorage !== 'undefined'
          ? (localStorage.getItem('tipidlink_household_tier_0d37e235-c9dd-4876-a54a-9acb36516599') || localStorage.getItem('tipidlink_household_tier_hh-santos-family') || localStorage.getItem('tipidlink_code_tier_SANTOS2026'))
          : null;
        const santosIsExplicitFree = santosTier.isExplicitFree || santosTierOverride === 'FREE';
        let santosIsPro = false;
        if (!santosIsExplicitFree) {
          const cachedSantosPremium = (typeof localStorage !== 'undefined' && (
            localStorage.getItem('tipidlink_household_premium_0d37e235-c9dd-4876-a54a-9acb36516599') === 'true' ||
            localStorage.getItem('tipidlink_household_premium_hh-santos-family') === 'true' ||
            santosTierOverride === 'PRO'
          ));
          santosIsPro = Boolean(santosTier.isPremium || cachedSantosPremium);
        }
        const santosPlan = santosTier.plan || (typeof localStorage !== 'undefined' ? (
          localStorage.getItem('tipidlink_household_plan_0d37e235-c9dd-4876-a54a-9acb36516599') ||
          localStorage.getItem('tipidlink_household_plan_hh-santos-family')
        ) : null) || (santosIsPro ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');
        const santosSponsor = santosTier.sponsor || (typeof localStorage !== 'undefined' ? (
          localStorage.getItem('tipidlink_household_sponsor_0d37e235-c9dd-4876-a54a-9acb36516599') ||
          localStorage.getItem('tipidlink_household_sponsor_hh-santos-family')
        ) : null);

        const savedSantosTarget = localStorage.getItem('tipidlink_household_target_0d37e235-c9dd-4876-a54a-9acb36516599')
          || localStorage.getItem('tipidlink_household_target_hh-santos-family')
          || localStorage.getItem('tipidlink_last_saved_target');
        const initialSantosTarget = directCloudTarget !== null
          ? directCloudTarget
          : (savedSantosTarget ? Number(savedSantosTarget) : 75000);

        const santosWithRole = {
          ...INITIAL_DEMO_DATA.household,
          id: '0d37e235-c9dd-4876-a54a-9acb36516599',
          name: 'Santos Family Household',
          description: santosTier.cleanDescription || 'Shared budget and expenses for the Santos family home in Pasig City',
          clean_description: santosTier.cleanDescription || 'Shared budget and expenses for the Santos family home in Pasig City',
          raw_description: directCloudDesc || INITIAL_DEMO_DATA.household.description,
          monthly_budget_target: initialSantosTarget,
          invite_code: 'SANTOS2026',
          is_premium: santosIsPro,
          premium_plan: santosPlan,
          sponsor_details: santosSponsor,
          user_role: user?.email?.startsWith('maria.santos') ? 'owner' : (user?.email?.startsWith('juan.santos') ? 'admin' : 'member'),
        };

        const existingSantosIndex = hhList.findIndex(h => h.id === '0d37e235-c9dd-4876-a54a-9acb36516599' || h.id === 'hh-santos-family' || h.invite_code === 'SANTOS2026');
        if (existingSantosIndex >= 0) {
          const cloudTarget = hhList[existingSantosIndex].monthly_budget_target;
          const currentTarget = (cloudTarget !== undefined && cloudTarget !== null)
            ? Number(cloudTarget)
            : (directCloudTarget !== null ? directCloudTarget : (savedSantosTarget ? Number(savedSantosTarget) : 75000));
          hhList[existingSantosIndex] = {
            ...hhList[existingSantosIndex],
            name: hhList[existingSantosIndex].name || 'Santos Family Household',
            description: santosTier.cleanDescription || hhList[existingSantosIndex].description,
            clean_description: santosTier.cleanDescription || hhList[existingSantosIndex].description,
            monthly_budget_target: currentTarget,
            invite_code: 'SANTOS2026',
            is_premium: santosIsPro,
            premium_plan: santosPlan,
            sponsor_details: santosSponsor,
            user_role: hhList[existingSantosIndex].user_role || santosWithRole.user_role,
          };
          localStorage.setItem('tipidlink_household_target_0d37e235-c9dd-4876-a54a-9acb36516599', String(currentTarget));
          localStorage.setItem('tipidlink_last_saved_target', String(currentTarget));
        } else {
          hhList.unshift(santosWithRole);
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
        const santosHh = hhList.find(h => h.id === '0d37e235-c9dd-4876-a54a-9acb36516599' || h.invite_code === 'SANTOS2026');
        if ((isDemoMode || user?.email?.endsWith('@tipidlink.ph')) && santosHh) {
          activeId = santosHh.id;
        } else if (!activeId) {
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
    const isUuidId = typeof householdId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(householdId);
    const targetHhId = isUuidId ? householdId : (householdId === 'hh-santos-family' ? '0d37e235-c9dd-4876-a54a-9acb36516599' : null);

    // If Supabase is connected and target household is a cloud household, load from Supabase!
    if (isSupabaseConfigured && user && targetHhId) {
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
          .eq('household_id', targetHhId);

        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = data.map(m => ({
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
            phone: m.profiles?.phone || '',
          }));

          setMembers(formatted);
          localStorage.setItem(`tipidlink_members_${householdId}`, JSON.stringify(formatted));

          // Check if the household Owner is Pro - keep household Pro state in sync!
          const ownerMember = formatted.find(m => m.role === 'owner');
          const isOwnerPro = Boolean(ownerMember?.phone && ownerMember.phone.includes('PREMIUM_STATUS:PRO'));
          const hhOverride = typeof localStorage !== 'undefined' ? localStorage.getItem(`tipidlink_household_tier_${householdId}`) : null;
          const codeOverride = (typeof localStorage !== 'undefined' && currentHousehold?.invite_code)
            ? localStorage.getItem(`tipidlink_code_tier_${currentHousehold.invite_code}`)
            : null;
          const isExplicitFree = hhOverride === 'FREE' || codeOverride === 'FREE';

          if (!isExplicitFree && isOwnerPro) {
            setCurrentHousehold(prev => prev ? { ...prev, is_premium: true, owner_is_pro: true } : prev);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(`tipidlink_household_tier_${householdId}`, 'PRO');
              localStorage.setItem(`tipidlink_household_premium_${householdId}`, 'true');
              if (currentHousehold?.invite_code) {
                localStorage.setItem(`tipidlink_code_tier_${currentHousehold.invite_code}`, 'PRO');
                localStorage.setItem(`tipidlink_code_premium_${currentHousehold.invite_code}`, 'true');
              }
            }
          } else if (isExplicitFree) {
            setCurrentHousehold(prev => prev ? { ...prev, is_premium: false, owner_is_pro: false } : prev);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(`tipidlink_household_tier_${householdId}`, 'FREE');
              localStorage.removeItem(`tipidlink_household_premium_${householdId}`);
              if (currentHousehold?.invite_code) {
                localStorage.setItem(`tipidlink_code_tier_${currentHousehold.invite_code}`, 'FREE');
                localStorage.removeItem(`tipidlink_code_premium_${currentHousehold.invite_code}`);
              }
            }
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase members fetch note (falling back to cache):', err.message);
      }
    }

    // If it's Santos Family or demo mode, load from local storage or INITIAL_DEMO_DATA
    if (householdId === 'hh-santos-family' || isDemoMode) {
      let baseList = [...INITIAL_DEMO_DATA.members];
      const savedMembers = localStorage.getItem(`tipidlink_members_${householdId}`)
        || localStorage.getItem(`tipidlink_demo_members_${householdId}`);
      if (savedMembers) {
        try {
          baseList = JSON.parse(savedMembers);
        } catch (e) {
          console.error(e);
        }
      }

      // If a real registered user is logged in, ensure they are also included in the family members list
      if (user && user.id) {
        const alreadyIn = baseList.some(m => m.user_id === user.id || (user.email && m.email === user.email));
        if (!alreadyIn) {
          const currentFullName = user?.user_metadata?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'Family Member';
          const newMember = {
            id: `mem-${user.id}`,
            household_id: 'hh-santos-family',
            user_id: user.id,
            full_name: currentFullName,
            email: user.email || '',
            role: 'member',
            nickname: currentFullName.split(' ')[0] || 'Member',
            joined_at: new Date().toISOString(),
          };
          baseList = [...baseList, newMember];
        }
      }

      // CLOUD SYNC: Fetch all real registered users who joined SANTOS2026 from Supabase!
      // This ensures the Owner (Maria) and Admin (Juan) on PC can see all members who joined on mobile/other devices!
      if (isSupabaseConfigured) {
        try {
          const { data: joinedProfiles, error: fetchErr } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, phone, created_at')
            .ilike('phone', '%JOINED:SANTOS2026%');

          if (!fetchErr && joinedProfiles && joinedProfiles.length > 0) {
            for (const jp of joinedProfiles) {
              const alreadyIn = baseList.some(m => m.user_id === jp.id || (jp.email && m.email === jp.email));
              if (!alreadyIn) {
                const memberName = jp.full_name || jp.email?.split('@')[0] || 'Family Member';
                baseList.push({
                  id: `mem-${jp.id}`,
                  household_id: 'hh-santos-family',
                  user_id: jp.id,
                  full_name: memberName,
                  email: jp.email || '',
                  avatar_url: jp.avatar_url || '',
                  role: 'member',
                  nickname: memberName.split(' ')[0] || 'Member',
                  joined_at: jp.created_at || new Date().toISOString(),
                });
              }
            }
          }
        } catch (e) {
          console.warn('Error fetching joined members from Supabase:', e);
        }
      }

      setMembers(baseList);
      localStorage.setItem(`tipidlink_members_${householdId}`, JSON.stringify(baseList));
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
        phone: m.profiles?.phone || '',
      }));

      setMembers(formatted);

      // Check if the household Owner is Pro - keep household Pro state in sync!
      const ownerMember = formatted.find(m => m.role === 'owner');
      const isOwnerPro = Boolean(ownerMember?.phone && ownerMember.phone.includes('PREMIUM_STATUS:PRO'));
      const hhOverride = typeof localStorage !== 'undefined' ? localStorage.getItem(`tipidlink_household_tier_${householdId}`) : null;
      const codeOverride = (typeof localStorage !== 'undefined' && currentHousehold?.invite_code)
        ? localStorage.getItem(`tipidlink_code_tier_${currentHousehold.invite_code}`)
        : null;
      const isExplicitFree = hhOverride === 'FREE' || codeOverride === 'FREE';

      if (!isExplicitFree && isOwnerPro) {
        setCurrentHousehold(prev => prev ? { ...prev, is_premium: true, owner_is_pro: true } : prev);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`tipidlink_household_tier_${householdId}`, 'PRO');
          localStorage.setItem(`tipidlink_household_premium_${householdId}`, 'true');
          if (currentHousehold?.invite_code) {
            localStorage.setItem(`tipidlink_code_tier_${currentHousehold.invite_code}`, 'PRO');
            localStorage.setItem(`tipidlink_code_premium_${currentHousehold.invite_code}`, 'true');
          }
        }
      } else if (isExplicitFree) {
        setCurrentHousehold(prev => prev ? { ...prev, is_premium: false, owner_is_pro: false } : prev);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`tipidlink_household_tier_${householdId}`, 'FREE');
          localStorage.removeItem(`tipidlink_household_premium_${householdId}`);
          if (currentHousehold?.invite_code) {
            localStorage.setItem(`tipidlink_code_tier_${currentHousehold.invite_code}`, 'FREE');
            localStorage.removeItem(`tipidlink_code_premium_${currentHousehold.invite_code}`);
          }
        }
      }
    } catch (err) {
      console.error('Error loading household members:', err);
    }
  };

  const switchHousehold = (householdId) => {
    const target = households.find(h => h.id === householdId);
    if (target) {
      setCurrentHousehold(target);
      localStorage.setItem('tipidlink_active_household_id', target.id);
      if (user?.id) {
        localStorage.setItem(`tipidlink_active_household_${user.id}`, target.id);
      }
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

    const cleanUpper = rawCode.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');

    // Universal handling for Santos Family demo & presentation code SANTOS2026 across ALL accounts
    const SANTOS_UUID = '0d37e235-c9dd-4876-a54a-9acb36516599';
    if (cleanUpper === 'SANTOS2026') {
      const userId = user?.id || 'usr-registered-member';
      const userFullName = user?.user_metadata?.full_name || profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Family Member');
      const userEmail = profile?.email || user?.email || 'member@tipidlink.ph';

      let cloudHh = null;

      // Persist across devices to Supabase user metadata and profile!
      if (user && isSupabaseConfigured && !isDemoMode) {
        try {
          // 1. Check if user is already in household_members
          const { data: existingMember } = await supabase
            .from('household_members')
            .select('id')
            .eq('household_id', SANTOS_UUID)
            .eq('user_id', user.id)
            .maybeSingle();

          // 2. Insert membership cleanly without .select() to comply with RLS
          if (!existingMember) {
            const { error: insertErr } = await supabase
              .from('household_members')
              .insert({
                household_id: SANTOS_UUID,
                user_id: user.id,
                role: 'member',
                nickname: userFullName.split(' ')[0] || 'Member',
              });

            if (insertErr && insertErr.code !== '23505') {
              console.warn('Membership insert note:', insertErr.message);
            }
          }

          // 3. Query the real cloud household data (which user can now view as an authorized member)
          const { data: fetchedHh } = await supabase
            .from('households')
            .select('*')
            .eq('id', SANTOS_UUID)
            .maybeSingle();

          if (fetchedHh) {
            cloudHh = fetchedHh;
          }

          // 4. Update auth user metadata
          try {
            await supabase.auth.updateUser({
              data: { joined_santos: true }
            });
          } catch (authErr) {
            console.warn('Could not update auth metadata:', authErr);
          }

          // 5. Update profiles.phone with JOINED:SANTOS2026
          try {
            const { data: dbProf } = await supabase
              .from('profiles')
              .select('phone, full_name, email')
              .eq('id', user.id)
              .maybeSingle();

            const dbPhone = dbProf?.phone || profile?.phone || '';
            const updatedPhone = dbPhone.includes('JOINED:SANTOS2026')
              ? dbPhone
              : (dbPhone ? `${dbPhone}|JOINED:SANTOS2026` : 'JOINED:SANTOS2026');

            await supabase.from('profiles').update({
              phone: updatedPhone,
              full_name: user?.user_metadata?.full_name || profile?.full_name || dbProf?.full_name || userFullName,
              updated_at: new Date().toISOString(),
            }).eq('id', user.id);
          } catch (dbErr) {
            console.warn('Could not update profile join status:', dbErr);
          }
        } catch (cloudErr) {
          console.warn('Cloud join exception:', cloudErr);
        }
      }

      const savedTarget = localStorage.getItem(`tipidlink_household_target_${SANTOS_UUID}`)
        || localStorage.getItem('tipidlink_household_target_hh-santos-family')
        || localStorage.getItem('tipidlink_last_saved_target');

      const targetVal = (cloudHh?.monthly_budget_target !== undefined && cloudHh?.monthly_budget_target !== null)
        ? Number(cloudHh.monthly_budget_target)
        : (savedTarget ? Number(savedTarget) : 75000);

      const santosWithRole = {
        ...(cloudHh || INITIAL_DEMO_DATA.household),
        id: SANTOS_UUID,
        name: cloudHh?.name || 'Santos Family Household',
        monthly_budget_target: targetVal,
        invite_code: 'SANTOS2026',
        user_role: 'member',
      };

      // Set active household in all local storage caches
      localStorage.setItem('tipidlink_active_household_id', SANTOS_UUID);
      if (user?.id) {
        localStorage.setItem(`tipidlink_active_household_${user.id}`, SANTOS_UUID);
        localStorage.setItem(`tipidlink_user_joined_santos_${user.id}`, 'true');
      }
      localStorage.setItem(`tipidlink_household_target_${SANTOS_UUID}`, String(targetVal));
      localStorage.setItem('tipidlink_household_target_hh-santos-family', String(targetVal));
      localStorage.setItem('tipidlink_last_saved_target', String(targetVal));

      setCurrentHousehold(santosWithRole);
      setHouseholds(prev => {
        const filtered = prev.filter(h => h.id !== SANTOS_UUID && h.id !== 'hh-santos-family');
        return [santosWithRole, ...filtered];
      });

      // Reload cloud households and members list immediately
      await loadHouseholds(SANTOS_UUID);
      await loadMembers(SANTOS_UUID);

      // Broadcast sync event to all active units
      broadcastSyncEvent('member_joined', {
        householdId: SANTOS_UUID,
        user_id: userId,
        name: userFullName,
        email: userEmail,
      });

      return { success: true, household: santosWithRole };
    }

    if (isDemoMode) {
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
        return { success: false, error: 'Hindi nahanap ang household code na ito (o hindi pa nagagawa). Pakisuri ang tamang invite code mula sa household owner bago magpatuloy.' };
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
          if (joinedHH.monthly_budget_target !== undefined && joinedHH.monthly_budget_target !== null) {
            localStorage.setItem(`tipidlink_household_target_${targetHouseholdId}`, String(joinedHH.monthly_budget_target));
            localStorage.setItem('tipidlink_last_saved_target', String(joinedHH.monthly_budget_target));
          }
        }
        await loadMembers(targetHouseholdId);
        return { success: true, household: joinedHH, message: 'You are already a member of this household.' };
      }

      // Insert membership without .select() to respect RLS
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
        if (joinErr.code !== '23505') {
          throw joinErr;
        }
      }

      localStorage.setItem('tipidlink_active_household_id', targetHouseholdId);
      if (user?.id) {
        localStorage.setItem(`tipidlink_active_household_${user.id}`, targetHouseholdId);
      }
      const freshList = await loadHouseholds(targetHouseholdId);
      const joinedHH = freshList.find(h => h.id === targetHouseholdId);
      if (joinedHH) {
        setCurrentHousehold(joinedHH);
        if (joinedHH.monthly_budget_target !== undefined && joinedHH.monthly_budget_target !== null) {
          localStorage.setItem(`tipidlink_household_target_${targetHouseholdId}`, String(joinedHH.monthly_budget_target));
          localStorage.setItem('tipidlink_last_saved_target', String(joinedHH.monthly_budget_target));
        }
      }
      await loadMembers(targetHouseholdId);

      // Broadcast sync event to all active units
      broadcastSyncEvent('member_joined', {
        householdId: targetHouseholdId,
        user_id: user.id,
        name: memberNickname,
        email: user.email || '',
      });

      return { success: true, household: joinedHH };
    } catch (err) {
      console.error('Join household failed:', err);
      return { success: false, error: err.message };
    }
  };

  const updateHousehold = async (updates) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    // Prepare clean database payload (only real table columns)
    const dbPayload = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.currency !== undefined) dbPayload.currency = updates.currency;
    if (updates.monthly_budget_target !== undefined) dbPayload.monthly_budget_target = Number(updates.monthly_budget_target);
    if (updates.invite_code !== undefined) dbPayload.invite_code = updates.invite_code;

    // Handle tier tags in description
    if (updates.description !== undefined || updates.is_premium !== undefined) {
      const isPro = updates.is_premium !== undefined ? updates.is_premium : Boolean(currentHousehold.is_premium);
      const plan = updates.premium_plan || currentHousehold.premium_plan;
      const sponsor = updates.sponsor_details !== undefined ? updates.sponsor_details : currentHousehold.sponsor_details;
      const cleanDesc = (updates.clean_description || updates.description || currentHousehold.clean_description || currentHousehold.description || '')
        .replace(/\[TIER:[^\]]*\]/gi, '')
        .replace(/\[PRO[^\]]*\]/gi, '')
        .trim();

      const formattedDesc = formatHouseholdDescription(cleanDesc, isPro, plan, sponsor);
      dbPayload.description = formattedDesc;
      updates.description = cleanDesc;
      updates.clean_description = cleanDesc;
      updates.raw_description = formattedDesc;
      updates.is_premium = isPro;
      updates.premium_plan = plan;
      updates.sponsor_details = sponsor;
    }

    // Apply update locally and to persistent caches immediately
    const applyLocal = () => {
      const updated = { ...currentHousehold, ...updates, updated_at: new Date().toISOString() };
      setCurrentHousehold(updated);
      setHouseholds(prev => prev.map(h => h.id === currentHousehold.id ? { ...h, ...updates } : h));

      // Persist to all local storage caches
      try {
        if (updates.monthly_budget_target !== undefined) {
          localStorage.setItem(`tipidlink_household_target_${currentHousehold.id}`, String(updates.monthly_budget_target));
          localStorage.setItem('tipidlink_last_saved_target', String(updates.monthly_budget_target));
          if (currentHousehold.id === 'hh-santos-family') {
            localStorage.setItem(`tipidlink_household_target_${SANTOS_UUID}`, String(updates.monthly_budget_target));
          } else if (currentHousehold.id === SANTOS_UUID) {
            localStorage.setItem('tipidlink_household_target_hh-santos-family', String(updates.monthly_budget_target));
          }
        }
        if (updates.is_premium !== undefined) {
          const invCode = updates.invite_code || currentHousehold.invite_code;
          const isSantos = isSantosHouseholdId(currentHousehold.id) || invCode === 'SANTOS2026';
          if (updates.is_premium) {
            localStorage.setItem(`tipidlink_household_tier_${currentHousehold.id}`, 'PRO');
            localStorage.setItem(`tipidlink_household_premium_${currentHousehold.id}`, 'true');
            localStorage.setItem(`tipidlink_household_plan_${currentHousehold.id}`, updates.premium_plan || 'TipidLink Premium Plan (₱30/mo)');
            if (updates.sponsor_details) {
              localStorage.setItem(`tipidlink_household_sponsor_${currentHousehold.id}`, updates.sponsor_details);
            }
            if (invCode) {
              localStorage.setItem(`tipidlink_code_tier_${invCode}`, 'PRO');
              localStorage.setItem(`tipidlink_code_premium_${invCode}`, 'true');
            }
            if (isSantos) {
              localStorage.setItem(`tipidlink_household_tier_${SANTOS_UUID}`, 'PRO');
              localStorage.setItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`, 'PRO');
              localStorage.setItem('tipidlink_code_tier_SANTOS2026', 'PRO');
              localStorage.setItem(`tipidlink_household_premium_${SANTOS_UUID}`, 'true');
              localStorage.setItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`, 'true');
              localStorage.setItem('tipidlink_code_premium_SANTOS2026', 'true');
            }
          } else {
            localStorage.setItem(`tipidlink_household_tier_${currentHousehold.id}`, 'FREE');
            localStorage.removeItem(`tipidlink_household_premium_${currentHousehold.id}`);
            localStorage.removeItem(`tipidlink_household_plan_${currentHousehold.id}`);
            localStorage.removeItem(`tipidlink_household_sponsor_${currentHousehold.id}`);
            if (invCode) {
              localStorage.setItem(`tipidlink_code_tier_${invCode}`, 'FREE');
              localStorage.removeItem(`tipidlink_code_premium_${invCode}`);
            }
            if (isSantos) {
              localStorage.setItem(`tipidlink_household_tier_${SANTOS_UUID}`, 'FREE');
              localStorage.setItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`, 'FREE');
              localStorage.setItem('tipidlink_code_tier_SANTOS2026', 'FREE');
              localStorage.removeItem(`tipidlink_household_premium_${SANTOS_UUID}`);
              localStorage.removeItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
              localStorage.removeItem('tipidlink_code_premium_SANTOS2026');
            }
          }
        }
        const savedHH = localStorage.getItem('tipidlink_demo_households');
        if (savedHH) {
          const list = JSON.parse(savedHH);
          const updatedList = list.map(h => h.id === currentHousehold.id ? { ...h, ...updates } : h);
          localStorage.setItem('tipidlink_demo_households', JSON.stringify(updatedList));
        }
        if (user?.id) {
          const userKey = `tipidlink_user_households_${user.id}`;
          const savedUserHH = localStorage.getItem(userKey);
          if (savedUserHH) {
            const list = JSON.parse(savedUserHH);
            const updatedList = list.map(h => h.id === currentHousehold.id ? { ...h, ...updates } : h);
            localStorage.setItem(userKey, JSON.stringify(updatedList));
          }
        }
      } catch (e) {
        console.warn('Storage persist note:', e);
      }

      broadcastSyncEvent('household_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        updates,
      });

      if (updates.is_premium !== undefined) {
        broadcastSyncEvent('household_premium_updated', {
          householdId: currentHousehold.id,
          inviteCode: currentHousehold.invite_code,
          isPremium: updates.is_premium,
          plan: updates.premium_plan,
          sponsor: updates.sponsor_details,
        });
      }
    };

    const targetHhId = (typeof currentHousehold.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentHousehold.id))
      ? currentHousehold.id
      : (currentHousehold.id === 'hh-santos-family' ? SANTOS_UUID : null);

    if (isSupabaseConfigured && user && targetHhId && Object.keys(dbPayload).length > 0) {
      try {
        const { error: dbErr } = await supabase
          .from('households')
          .update(dbPayload)
          .eq('id', targetHhId);
        if (dbErr) {
          console.warn('Supabase household update notice:', dbErr.message);
        }
      } catch (err) {
        console.warn('Supabase household update notice (applying locally):', err.message);
      }
    }

    applyLocal();
    return { success: true };
  };

  const updateMemberRole = async (memberId, newRole) => {
    const isCreator = user?.id && currentHousehold?.created_by === user.id;
    const hasPermission = isOwnerOrAdmin || isCreator || currentHousehold?.user_role === 'owner' || currentHousehold?.user_role === 'admin';
    if (!hasPermission) {
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

    const isUuidMember = typeof memberId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);
    if (isSupabaseConfigured && user && isUuidMember) {
      try {
        const { error } = await supabase
          .from('household_members')
          .update({ role: newRole })
          .eq('id', memberId);

        if (error) console.warn('Supabase member role update notice:', error.message);
      } catch (err) {
        console.warn('Supabase member role update notice:', err.message);
      }
    }

    const updated = members.map(m => m.id === memberId ? { ...m, role: newRole } : m);
    setMembers(updated);
    broadcastSyncEvent('member_updated', { householdId: currentHousehold.id });
    return { success: true };
  };

  const removeMember = async (memberId) => {
    const isCreator = user?.id && currentHousehold?.created_by === user.id;
    const hasPermission = isOwnerOrAdmin || isCreator || currentHousehold?.user_role === 'owner' || currentHousehold?.user_role === 'admin';
    if (!hasPermission) {
      return { success: false, error: 'Only owners and admins can remove members.' };
    }
    const targetMember = members.find(m => m.id === memberId);
    if (targetMember?.role === 'owner') {
      return { success: false, error: 'The household owner cannot be removed.' };
    }
    if (currentUserRole === 'admin' && targetMember?.role === 'admin') {
      return { success: false, error: 'Admins cannot remove other admins. Only the owner can.' };
    }

    const isUuidMember = typeof memberId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);
    if (isSupabaseConfigured && user && isUuidMember) {
      try {
        const { error } = await supabase
          .from('household_members')
          .delete()
          .eq('id', memberId);

        if (error) console.warn('Supabase remove member notice:', error.message);
      } catch (err) {
        console.warn('Supabase remove member notice:', err.message);
      }
    }

    const updated = members.filter(m => m.id !== memberId);
    setMembers(updated);
    broadcastSyncEvent('member_updated', { householdId: currentHousehold.id });
    return { success: true };
  };

  const deleteHousehold = async (householdId) => {
    if (!householdId) return { success: false, error: 'No household ID provided' };
    const isCreator = user?.id && currentHousehold?.created_by === user.id;
    if (currentUserRole !== 'owner' && !isCreator) {
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

    if (householdId === 'hh-santos-family') {
      localStorage.removeItem(`tipidlink_user_joined_santos_${user.id}`);
      if (localStorage.getItem('tipidlink_active_household_id') === 'hh-santos-family') {
        localStorage.removeItem('tipidlink_active_household_id');
      }
      if (localStorage.getItem(`tipidlink_active_household_${user.id}`) === 'hh-santos-family') {
        localStorage.removeItem(`tipidlink_active_household_${user.id}`);
      }

      if (user && isSupabaseConfigured && !isDemoMode) {
        try {
          await supabase.auth.updateUser({
            data: { joined_santos: false }
          });
          const cleanPhone = (profile?.phone || '').replace(/\|?JOINED:SANTOS2026/g, '');
          await supabase.from('profiles').update({ phone: cleanPhone }).eq('id', user.id);
        } catch (e) {
          console.warn('Reset metadata on leave:', e);
        }
      }

      const remaining = households.filter(h => h.id !== householdId);
      setHouseholds(remaining);
      const nextActive = remaining[0] || null;
      setCurrentHousehold(nextActive);
      return { success: true };
    }

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
        loadHouseholds(currentHousehold.id);
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

  // Universal Realtime cross-unit sync (multi-device, cross-tab, cross-window)
  useEffect(() => {
    if (!currentHousehold?.id) return;
    const householdId = currentHousehold.id;

    // 1. Universal Realtime Sync Listener (Supabase WebSocket + BroadcastChannel + Storage fallback)
    const unsubscribe = subscribeToSyncEvents((event, payload) => {
      const matchesCurrent = isMatchingHouseholdId(payload.householdId, householdId, payload.inviteCode, currentHousehold?.invite_code);
      if (event === 'household_updated' && matchesCurrent) {
        if (payload.updates) {
          setCurrentHousehold(prev => prev ? { ...prev, ...payload.updates } : prev);
          setHouseholds(prev => prev.map(h => isMatchingHouseholdId(h.id, payload.householdId, h.invite_code, payload.inviteCode) ? { ...h, ...payload.updates } : h));
          if (payload.updates.monthly_budget_target !== undefined) {
            const targetVal = String(payload.updates.monthly_budget_target);
            localStorage.setItem(`tipidlink_household_target_${householdId}`, targetVal);
            localStorage.setItem('tipidlink_last_saved_target', targetVal);
            if (householdId === 'hh-santos-family') {
              localStorage.setItem(`tipidlink_household_target_${SANTOS_UUID}`, targetVal);
            } else if (householdId === SANTOS_UUID) {
              localStorage.setItem('tipidlink_household_target_hh-santos-family', targetVal);
            }
          }
        }
        loadHouseholds(householdId);
      } else if (event === 'household_premium_updated' && matchesCurrent) {
        const isPro = Boolean(payload.isPremium);
        const plan = payload.plan || (isPro ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');
        const sponsor = payload.sponsor || null;

        setCurrentHousehold(prev => prev ? {
          ...prev,
          is_premium: isPro,
          premium_plan: plan,
          sponsor_details: sponsor,
        } : prev);

        setHouseholds(prev => prev.map(h => {
          if (isMatchingHouseholdId(h.id, payload.householdId, h.invite_code, payload.inviteCode)) {
            return {
              ...h,
              is_premium: isPro,
              premium_plan: plan,
              sponsor_details: sponsor,
            };
          }
          return h;
        }));

        const invCode = payload.inviteCode || currentHousehold?.invite_code;
        const isSantos = isSantosHouseholdId(householdId) || invCode === 'SANTOS2026';
        if (isPro) {
          localStorage.setItem(`tipidlink_household_tier_${householdId}`, 'PRO');
          localStorage.setItem(`tipidlink_household_premium_${householdId}`, 'true');
          localStorage.setItem(`tipidlink_household_plan_${householdId}`, plan);
          if (sponsor) localStorage.setItem(`tipidlink_household_sponsor_${householdId}`, sponsor);
          if (invCode) {
            localStorage.setItem(`tipidlink_code_tier_${invCode}`, 'PRO');
            localStorage.setItem(`tipidlink_code_premium_${invCode}`, 'true');
          }
          if (isSantos) {
            localStorage.setItem(`tipidlink_household_tier_${SANTOS_UUID}`, 'PRO');
            localStorage.setItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`, 'PRO');
            localStorage.setItem('tipidlink_code_tier_SANTOS2026', 'PRO');
            localStorage.setItem(`tipidlink_household_premium_${SANTOS_UUID}`, 'true');
            localStorage.setItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`, 'true');
            localStorage.setItem('tipidlink_code_premium_SANTOS2026', 'true');
            localStorage.setItem(`tipidlink_household_plan_${SANTOS_UUID}`, plan);
            localStorage.setItem(`tipidlink_household_plan_${SANTOS_DEMO_ID}`, plan);
          }
        } else {
          localStorage.setItem(`tipidlink_household_tier_${householdId}`, 'FREE');
          localStorage.removeItem(`tipidlink_household_premium_${householdId}`);
          localStorage.removeItem(`tipidlink_household_plan_${householdId}`);
          localStorage.removeItem(`tipidlink_household_sponsor_${householdId}`);
          if (invCode) {
            localStorage.setItem(`tipidlink_code_tier_${invCode}`, 'FREE');
            localStorage.removeItem(`tipidlink_code_premium_${invCode}`);
          }
          if (isSantos) {
            localStorage.setItem(`tipidlink_household_tier_${SANTOS_UUID}`, 'FREE');
            localStorage.setItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`, 'FREE');
            localStorage.setItem('tipidlink_code_tier_SANTOS2026', 'FREE');
            localStorage.removeItem(`tipidlink_household_premium_${SANTOS_UUID}`);
            localStorage.removeItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
            localStorage.removeItem('tipidlink_code_premium_SANTOS2026');
            localStorage.removeItem(`tipidlink_household_plan_${SANTOS_UUID}`);
            localStorage.removeItem(`tipidlink_household_plan_${SANTOS_DEMO_ID}`);
            localStorage.removeItem(`tipidlink_household_sponsor_${SANTOS_UUID}`);
            localStorage.removeItem(`tipidlink_household_sponsor_${SANTOS_DEMO_ID}`);
          }
        }
      } else if ((event === 'member_joined' || event === 'member_updated') && matchesCurrent) {
        loadMembers(householdId);
        if (event === 'member_joined') {
          loadHouseholds(householdId);
        }
      }
    });

    // 2. Direct PostgreSQL table changes if UUID household
    let pgChannel = null;
    if (isSupabaseConfigured) {
      const isUuidId = typeof householdId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(householdId);
      const targetHhId = isUuidId ? householdId : (householdId === 'hh-santos-family' ? '0d37e235-c9dd-4876-a54a-9acb36516599' : null);
      if (targetHhId) {
        pgChannel = supabase.channel(`tipidlink-pg-sync-${targetHhId}`);
        pgChannel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${targetHhId}` }, () => {
            loadMembers(householdId);
            loadHouseholds(householdId);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'households', filter: `id=eq.${targetHhId}` }, (change) => {
            if (change.new) {
              const tier = parseHouseholdTier(change.new.description);
              const isPro = tier.isPremium;
              const plan = tier.plan;
              const sponsor = tier.sponsor;

              setCurrentHousehold(prev => prev ? {
                ...prev,
                ...change.new,
                description: tier.cleanDescription || change.new.description,
                clean_description: tier.cleanDescription || change.new.description,
                raw_description: change.new.description,
                is_premium: isPro,
                premium_plan: plan,
                sponsor_details: sponsor,
              } : {
                ...change.new,
                description: tier.cleanDescription || change.new.description,
                clean_description: tier.cleanDescription || change.new.description,
                raw_description: change.new.description,
                is_premium: isPro,
                premium_plan: plan,
                sponsor_details: sponsor,
              });

              const invCode = change.new.invite_code || currentHousehold?.invite_code;
              if (isPro) {
                localStorage.setItem(`tipidlink_household_tier_${targetHhId}`, 'PRO');
                localStorage.setItem(`tipidlink_household_premium_${targetHhId}`, 'true');
                localStorage.setItem(`tipidlink_household_plan_${targetHhId}`, plan);
                if (sponsor) localStorage.setItem(`tipidlink_household_sponsor_${targetHhId}`, sponsor);
                if (invCode) {
                  localStorage.setItem(`tipidlink_code_tier_${invCode}`, 'PRO');
                  localStorage.setItem(`tipidlink_code_premium_${invCode}`, 'true');
                }
              } else {
                localStorage.setItem(`tipidlink_household_tier_${targetHhId}`, 'FREE');
                localStorage.removeItem(`tipidlink_household_premium_${targetHhId}`);
                localStorage.removeItem(`tipidlink_household_plan_${targetHhId}`);
                localStorage.removeItem(`tipidlink_household_sponsor_${targetHhId}`);
                if (invCode) {
                  localStorage.setItem(`tipidlink_code_tier_${invCode}`, 'FREE');
                  localStorage.removeItem(`tipidlink_code_premium_${invCode}`);
                }
              }

              if (change.new.monthly_budget_target !== undefined) {
                const targetVal = String(change.new.monthly_budget_target);
                localStorage.setItem(`tipidlink_household_target_${targetHhId}`, targetVal);
                localStorage.setItem('tipidlink_last_saved_target', targetVal);
              }
            }
            loadHouseholds(householdId);
          })
          .subscribe();
      }
    }

    // 3. Light auto-sync heartbeat every 8 seconds so no unit is ever stale
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadHouseholds(householdId);
        loadMembers(householdId);
      }
    }, 8000);

    return () => {
      unsubscribe();
      if (pgChannel) supabase.removeChannel(pgChannel);
      clearInterval(interval);
    };
  }, [currentHousehold?.id]);

  // Comprehensive and resilient role resolution for owner, admin, and member
  const currentMember = members.find(m =>
    (user?.id && m.user_id === user.id) ||
    (user?.email && m.email && m.email.toLowerCase() === user.email.toLowerCase())
  );

  // First: use the member record's role if found
  let resolvedRole = currentMember?.role;

  // Second: fallback heuristics when member matching fails (async load, demo data, etc.)
  if (!resolvedRole) {
    if (currentHousehold?.user_role) {
      resolvedRole = currentHousehold.user_role;
    } else if (currentHousehold?.created_by === user?.id) {
      resolvedRole = 'owner';
    } else {
      const userEmail = (user?.email || profile?.email || '').toLowerCase();
      if (userEmail === 'maria.santos@tipidlink.ph' || userEmail.includes('maria')) {
        resolvedRole = 'owner';
      } else if (userEmail === 'juan.santos@tipidlink.ph' || userEmail.includes('juan')) {
        resolvedRole = 'admin';
      } else {
        resolvedRole = 'member';
      }
    }
  }

  const currentUserRole = resolvedRole || 'owner';
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
