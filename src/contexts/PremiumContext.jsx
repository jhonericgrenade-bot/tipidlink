import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { broadcastSyncEvent, subscribeToSyncEvents, isMatchingHouseholdId } from '../lib/realtimeSync';
import {
  parseHouseholdTier,
  formatHouseholdDescription,
  syncOwnerProfilePremium,
  resolveHouseholdPremiumState,
  isSantosHouseholdId,
  SANTOS_UUID,
  SANTOS_DEMO_ID
} from '../lib/premiumTier';

const PremiumContext = createContext();

export const PremiumProvider = ({ children }) => {
  const { user, isDemoMode } = useAuth();
  const { currentHousehold, updateHousehold, members, currentUserRole } = useHousehold();
  const userKey = isDemoMode ? 'demo' : (user?.id || 'guest');
  const hhId = currentHousehold?.id;

  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState('Free Household Plan');
  const [sponsorDetails, setSponsorDetails] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Cross-device and universal household tier persistence helper
  const saveHouseholdPremiumState = useCallback(async (targetHouseholdId, newIsPremium, newPlan, newSponsor) => {
    if (!targetHouseholdId) return;

    const planTag = newPlan || (newIsPremium ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');

    // 1. LocalStorage caches for householdId, inviteCode, and Santos aliases
    if (newIsPremium) {
      localStorage.setItem(`tipidlink_household_premium_${targetHouseholdId}`, 'true');
      localStorage.setItem(`tipidlink_household_plan_${targetHouseholdId}`, planTag);
      if (newSponsor) {
        localStorage.setItem(`tipidlink_household_sponsor_${targetHouseholdId}`, newSponsor);
      } else {
        localStorage.removeItem(`tipidlink_household_sponsor_${targetHouseholdId}`);
      }
      if (currentHousehold?.invite_code) {
        localStorage.setItem(`tipidlink_code_premium_${currentHousehold.invite_code}`, 'true');
      }
      if (isSantosHouseholdId(targetHouseholdId)) {
        localStorage.setItem(`tipidlink_household_premium_${SANTOS_UUID}`, 'true');
        localStorage.setItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`, 'true');
        localStorage.setItem('tipidlink_code_premium_SANTOS2026', 'true');
        localStorage.setItem(`tipidlink_household_plan_${SANTOS_UUID}`, planTag);
        localStorage.setItem(`tipidlink_household_plan_${SANTOS_DEMO_ID}`, planTag);
        if (newSponsor) {
          localStorage.setItem(`tipidlink_household_sponsor_${SANTOS_UUID}`, newSponsor);
          localStorage.setItem(`tipidlink_household_sponsor_${SANTOS_DEMO_ID}`, newSponsor);
        }
      }
    } else {
      localStorage.removeItem(`tipidlink_household_premium_${targetHouseholdId}`);
      localStorage.removeItem(`tipidlink_household_plan_${targetHouseholdId}`);
      localStorage.removeItem(`tipidlink_household_sponsor_${targetHouseholdId}`);
      if (currentHousehold?.invite_code) {
        localStorage.removeItem(`tipidlink_code_premium_${currentHousehold.invite_code}`);
      }
      if (isSantosHouseholdId(targetHouseholdId)) {
        localStorage.removeItem(`tipidlink_household_premium_${SANTOS_UUID}`);
        localStorage.removeItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
        localStorage.removeItem('tipidlink_code_premium_SANTOS2026');
        localStorage.removeItem(`tipidlink_household_plan_${SANTOS_UUID}`);
        localStorage.removeItem(`tipidlink_household_plan_${SANTOS_DEMO_ID}`);
        localStorage.removeItem(`tipidlink_household_sponsor_${SANTOS_UUID}`);
        localStorage.removeItem(`tipidlink_household_sponsor_${SANTOS_DEMO_ID}`);
      }
    }

    // 2. Broadcast realtime sync event to ALL member devices!
    broadcastSyncEvent('household_premium_updated', {
      householdId: targetHouseholdId,
      inviteCode: currentHousehold?.invite_code,
      isPremium: newIsPremium,
      plan: planTag,
      sponsor: newSponsor,
      ownerId: user?.id,
    });

    // 3. Supabase Cloud Sync
    if (isSupabaseConfigured && !isDemoMode && user?.id) {
      // Sync Owner's profile with PREMIUM_STATUS:PRO (100% permitted by RLS 'auth.uid() = id')
      // This allows ANY member who queries the owner's profile to instantly inherit Pro!
      await syncOwnerProfilePremium(supabase, user.id, newIsPremium, planTag, newSponsor);

      // Also attempt updating households.description in cloud
      const isUuid = typeof targetHouseholdId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetHouseholdId);
      const cloudTargetId = isUuid ? targetHouseholdId : (targetHouseholdId === SANTOS_DEMO_ID ? SANTOS_UUID : null);

      if (cloudTargetId) {
        try {
          const rawDesc = currentHousehold?.raw_description || currentHousehold?.description || '';
          const cleanDesc = (currentHousehold?.clean_description || rawDesc).replace(/\[TIER:[^\]]*\]/gi, '').replace(/\[PRO[^\]]*\]/gi, '').trim();
          const formatted = formatHouseholdDescription(cleanDesc, newIsPremium, planTag, newSponsor);

          await supabase
            .from('households')
            .update({
              description: formatted,
              updated_at: new Date().toISOString(),
            })
            .eq('id', cloudTargetId);
        } catch (err) {
          console.warn('Cloud household description tier update note:', err);
        }
      }
    }
  }, [currentHousehold, isDemoMode, user?.id]);

  // Sync premium status per authenticated user and active household
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setPremiumPlan('Free Household Plan');
      setSponsorDetails(null);
      return;
    }

    // 1. Check household-specific premium status (Pro covers the entire household!)
    const hhTier = resolveHouseholdPremiumState(currentHousehold, userKey, members);
    if (hhTier.isPremium) {
      setIsPremium(true);
      setPremiumPlan(hhTier.plan);
      setSponsorDetails(hhTier.sponsor);
      return;
    }

    // 2. Check if current user is an Owner who is Pro in auth metadata or personal cache
    const cloudPremium = Boolean(user?.user_metadata?.is_premium);
    const cloudPlan = user?.user_metadata?.premium_plan || 'TipidLink Premium Plan (₱30/mo)';
    const cloudSponsor = user?.user_metadata?.sponsor_details || null;

    if (cloudPremium) {
      setIsPremium(true);
      setPremiumPlan(cloudPlan);
      setSponsorDetails(cloudSponsor);

      // Auto-heal / sync Owner Pro status to public profile and household so members inherit it!
      if (user?.id && isSupabaseConfigured && !isDemoMode) {
        syncOwnerProfilePremium(supabase, user.id, true, cloudPlan, cloudSponsor);
        if (currentHousehold?.id && !currentHousehold.is_premium) {
          saveHouseholdPremiumState(currentHousehold.id, true, cloudPlan, cloudSponsor);
        }
      }
      return;
    }

    // 3. Check user-specific localStorage cache
    const saved = localStorage.getItem(`tipidlink_premium_${userKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isPremium) {
          setIsPremium(true);
          setPremiumPlan(parsed.premiumPlan || 'TipidLink Premium Plan (₱30/mo)');
          setSponsorDetails(parsed.sponsorDetails || null);
          return;
        }
      } catch (e) {
        console.error('Failed to parse user premium state:', e);
      }
    }

    // 4. For Members & Admins: Query whether the Owner of this household is Pro in Supabase
    if (isSupabaseConfigured && !isDemoMode && currentHousehold?.id) {
      const isUuid = typeof currentHousehold.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentHousehold.id);
      const queryId = isUuid ? currentHousehold.id : (isSantosHouseholdId(currentHousehold.id) ? SANTOS_UUID : null);

      if (queryId) {
        supabase
          .from('household_members')
          .select(`
            user_id,
            role,
            profiles:user_id (
              id,
              phone
            )
          `)
          .eq('household_id', queryId)
          .eq('role', 'owner')
          .maybeSingle()
          .then(({ data: ownerData }) => {
            if (ownerData?.profiles?.phone && ownerData.profiles.phone.includes('PREMIUM_STATUS:PRO')) {
              const match = ownerData.profiles.phone.match(/PLAN:([^|]+)/i);
              const sponsorMatch = ownerData.profiles.phone.match(/SPONSOR:([^|]+)/i);
              const resolvedPlan = match ? match[1] : 'TipidLink Premium Plan (₱30/mo)';
              const resolvedSponsor = sponsorMatch && sponsorMatch[1] !== 'none' ? sponsorMatch[1] : null;

              setIsPremium(true);
              setPremiumPlan(resolvedPlan);
              setSponsorDetails(resolvedSponsor);

              localStorage.setItem(`tipidlink_household_premium_${currentHousehold.id}`, 'true');
              localStorage.setItem(`tipidlink_household_plan_${currentHousehold.id}`, resolvedPlan);
              if (currentHousehold.invite_code) {
                localStorage.setItem(`tipidlink_code_premium_${currentHousehold.invite_code}`, 'true');
              }
            }
          })
          .catch(() => {});
      }
    }

    // 5. Default: Every new user and free household starts on the clean Free Household Plan
    setIsPremium(false);
    setPremiumPlan('Free Household Plan');
    setSponsorDetails(null);
  }, [
    user?.id,
    user?.user_metadata?.is_premium,
    currentHousehold?.id,
    currentHousehold?.is_premium,
    currentHousehold?.description,
    members,
    isDemoMode,
    userKey,
    saveHouseholdPremiumState,
  ]);

  // Listen for realtime household_premium_updated broadcasts from other units (CP, PC, other devices)
  useEffect(() => {
    const unsubscribe = subscribeToSyncEvents((event, payload) => {
      if (event === 'household_premium_updated') {
        const matches = isMatchingHouseholdId(
          payload.householdId,
          hhId,
          payload.inviteCode,
          currentHousehold?.invite_code
        );

        if (matches) {
          const newIsPremium = Boolean(payload.isPremium);
          const newPlan = payload.plan || (newIsPremium ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');
          const newSponsor = payload.sponsor || null;

          setIsPremium(newIsPremium);
          setPremiumPlan(newPlan);
          setSponsorDetails(newSponsor);

          if (hhId) {
            if (newIsPremium) {
              localStorage.setItem(`tipidlink_household_premium_${hhId}`, 'true');
              localStorage.setItem(`tipidlink_household_plan_${hhId}`, newPlan);
              if (newSponsor) {
                localStorage.setItem(`tipidlink_household_sponsor_${hhId}`, newSponsor);
              }
              if (payload.inviteCode || currentHousehold?.invite_code) {
                localStorage.setItem(`tipidlink_code_premium_${payload.inviteCode || currentHousehold?.invite_code}`, 'true');
              }
              if (isSantosHouseholdId(hhId)) {
                localStorage.setItem(`tipidlink_household_premium_${SANTOS_UUID}`, 'true');
                localStorage.setItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`, 'true');
                localStorage.setItem('tipidlink_code_premium_SANTOS2026', 'true');
              }
            } else {
              localStorage.removeItem(`tipidlink_household_premium_${hhId}`);
              localStorage.removeItem(`tipidlink_household_plan_${hhId}`);
              localStorage.removeItem(`tipidlink_household_sponsor_${hhId}`);
              if (payload.inviteCode || currentHousehold?.invite_code) {
                localStorage.removeItem(`tipidlink_code_premium_${payload.inviteCode || currentHousehold?.invite_code}`);
              }
              if (isSantosHouseholdId(hhId)) {
                localStorage.removeItem(`tipidlink_household_premium_${SANTOS_UUID}`);
                localStorage.removeItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
                localStorage.removeItem('tipidlink_code_premium_SANTOS2026');
              }
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [hhId, currentHousehold?.invite_code]);

  const saveUserState = (newIsPremium, newPlan, newSponsor) => {
    if (!user) return;
    localStorage.setItem(
      `tipidlink_premium_${userKey}`,
      JSON.stringify({
        isPremium: newIsPremium,
        premiumPlan: newPlan,
        sponsorDetails: newSponsor,
      })
    );

    // Persist to Supabase Auth cloud
    if (!isDemoMode && isSupabaseConfigured && supabase?.auth?.updateUser) {
      supabase.auth.updateUser({
        data: {
          is_premium: newIsPremium,
          premium_plan: newPlan,
          sponsor_details: newSponsor,
        },
      }).catch(err => console.warn('Cloud premium metadata sync note:', err));
    }

    // Persist to Supabase public profiles table
    if (!isDemoMode && isSupabaseConfigured && user?.id) {
      syncOwnerProfilePremium(supabase, user.id, newIsPremium, newPlan, newSponsor);
    }
  };

  // Activate ₱30 Direct Plan (Owner or member upgrading the household)
  const activatePremium = (planName = 'TipidLink Premium Plan (₱30/mo)') => {
    setIsPremium(true);
    setPremiumPlan(planName);
    setSponsorDetails(null);
    saveUserState(true, planName, null);

    if (hhId) {
      saveHouseholdPremiumState(hhId, true, planName, null);
    }
  };

  // Activate Community / Sponsored Access (Cooperatives, Schools, Barangays, LGUs, NGOs)
  const activateSponsoredAccess = (sponsorName = 'Barangay Community Partner') => {
    setIsPremium(true);
    setPremiumPlan('Sponsored Community Access');
    setSponsorDetails(sponsorName);
    saveUserState(true, 'Sponsored Community Access', sponsorName);

    if (hhId) {
      saveHouseholdPremiumState(hhId, true, 'Sponsored Community Access', sponsorName);
    }
  };

  // Reset back to Free
  const resetToFree = () => {
    setIsPremium(false);
    setPremiumPlan('Free Household Plan');
    setSponsorDetails(null);
    saveUserState(false, 'Free Household Plan', null);

    if (hhId) {
      saveHouseholdPremiumState(hhId, false, 'Free Household Plan', null);
    }

    if (!isDemoMode && isSupabaseConfigured && supabase?.auth?.updateUser) {
      supabase.auth.updateUser({
        data: {
          is_premium: false,
          premium_plan: 'Free Household Plan',
          sponsor_details: null,
        },
      }).catch(err => console.warn('Cloud premium metadata reset note:', err));
    }
  };

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isPro: isPremium,
        premiumPlan,
        sponsorDetails,
        isUpgradeModalOpen,
        openUpgradeModal: () => setIsUpgradeModalOpen(true),
        closeUpgradeModal: () => setIsUpgradeModalOpen(false),
        activatePremium,
        activateSponsoredAccess,
        resetToFree,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};
