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
  const inviteCode = currentHousehold?.invite_code;

  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState('Free Household Plan');
  const [sponsorDetails, setSponsorDetails] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Cross-device and universal household tier persistence helper
  const saveHouseholdPremiumState = useCallback(async (targetHouseholdId, newIsPremium, newPlan, newSponsor) => {
    if (!targetHouseholdId) return;

    const planTag = newPlan || (newIsPremium ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');
    const isSantos = isSantosHouseholdId(targetHouseholdId) || inviteCode === 'SANTOS2026';

    // 1. LocalStorage caches for householdId, inviteCode, and Santos aliases
    if (newIsPremium) {
      localStorage.setItem(`tipidlink_household_tier_${targetHouseholdId}`, 'PRO');
      localStorage.setItem(`tipidlink_household_premium_${targetHouseholdId}`, 'true');
      localStorage.setItem(`tipidlink_household_plan_${targetHouseholdId}`, planTag);
      if (newSponsor) {
        localStorage.setItem(`tipidlink_household_sponsor_${targetHouseholdId}`, newSponsor);
      } else {
        localStorage.removeItem(`tipidlink_household_sponsor_${targetHouseholdId}`);
      }
      if (inviteCode) {
        localStorage.setItem(`tipidlink_code_tier_${inviteCode}`, 'PRO');
        localStorage.setItem(`tipidlink_code_premium_${inviteCode}`, 'true');
      }
      if (isSantos) {
        localStorage.setItem(`tipidlink_household_tier_${SANTOS_UUID}`, 'PRO');
        localStorage.setItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`, 'PRO');
        localStorage.setItem('tipidlink_code_tier_SANTOS2026', 'PRO');
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
      // EXPLICIT FREE OVERRIDE
      localStorage.setItem(`tipidlink_household_tier_${targetHouseholdId}`, 'FREE');
      localStorage.removeItem(`tipidlink_household_premium_${targetHouseholdId}`);
      localStorage.removeItem(`tipidlink_household_plan_${targetHouseholdId}`);
      localStorage.removeItem(`tipidlink_household_sponsor_${targetHouseholdId}`);
      if (inviteCode) {
        localStorage.setItem(`tipidlink_code_tier_${inviteCode}`, 'FREE');
        localStorage.removeItem(`tipidlink_code_premium_${inviteCode}`);
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

    // 2. Broadcast realtime sync event to ALL member devices!
    broadcastSyncEvent('household_premium_updated', {
      householdId: targetHouseholdId,
      inviteCode,
      isPremium: newIsPremium,
      plan: planTag,
      sponsor: newSponsor,
      ownerId: user?.id,
    });

    // 3. Supabase Cloud Sync
    if (isSupabaseConfigured && !isDemoMode && user?.id) {
      // Sync Owner's profile phone with PREMIUM_STATUS:PRO or strip it
      await syncOwnerProfilePremium(supabase, user.id, newIsPremium, planTag, newSponsor);

      // Update households.description in cloud
      const isUuid = typeof targetHouseholdId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetHouseholdId);
      const cloudTargetId = isUuid ? targetHouseholdId : (isSantos ? SANTOS_UUID : null);

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
  }, [currentHousehold, isDemoMode, user?.id, inviteCode]);

  // Sync premium status per authenticated user and active household
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setPremiumPlan('Free Household Plan');
      setSponsorDetails(null);
      return;
    }

    // 1. Resolve household-specific premium status (Pro covers the entire household!)
    const hhTier = resolveHouseholdPremiumState(currentHousehold, userKey, members);
    setIsPremium(prev => prev === hhTier.isPremium ? prev : hhTier.isPremium);
    setPremiumPlan(prev => prev === hhTier.plan ? prev : hhTier.plan);
    setSponsorDetails(prev => prev === hhTier.sponsor ? prev : hhTier.sponsor);
  }, [
    user?.id,
    currentHousehold?.id,
    currentHousehold?.is_premium,
    currentHousehold?.description,
    currentHousehold?.raw_description,
    currentHousehold?.premium_plan,
    currentHousehold?.sponsor_details,
    members,
    isDemoMode,
    userKey,
    hhId,
    inviteCode,
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

          setIsPremium(prev => prev === newIsPremium ? prev : newIsPremium);
          setPremiumPlan(prev => prev === newPlan ? prev : newPlan);
          setSponsorDetails(prev => prev === newSponsor ? prev : newSponsor);

          if (hhId) {
            if (newIsPremium) {
              localStorage.setItem(`tipidlink_household_tier_${hhId}`, 'PRO');
              localStorage.setItem(`tipidlink_household_premium_${hhId}`, 'true');
              localStorage.setItem(`tipidlink_household_plan_${hhId}`, newPlan);
              if (newSponsor) {
                localStorage.setItem(`tipidlink_household_sponsor_${hhId}`, newSponsor);
              }
              if (payload.inviteCode || inviteCode) {
                localStorage.setItem(`tipidlink_code_tier_${payload.inviteCode || inviteCode}`, 'PRO');
                localStorage.setItem(`tipidlink_code_premium_${payload.inviteCode || inviteCode}`, 'true');
              }
              if (isSantosHouseholdId(hhId)) {
                localStorage.setItem(`tipidlink_household_tier_${SANTOS_UUID}`, 'PRO');
                localStorage.setItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`, 'PRO');
                localStorage.setItem('tipidlink_code_tier_SANTOS2026', 'PRO');
                localStorage.setItem(`tipidlink_household_premium_${SANTOS_UUID}`, 'true');
                localStorage.setItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`, 'true');
                localStorage.setItem('tipidlink_code_premium_SANTOS2026', 'true');
              }
            } else {
              localStorage.setItem(`tipidlink_household_tier_${hhId}`, 'FREE');
              localStorage.removeItem(`tipidlink_household_premium_${hhId}`);
              localStorage.removeItem(`tipidlink_household_plan_${hhId}`);
              localStorage.removeItem(`tipidlink_household_sponsor_${hhId}`);
              if (payload.inviteCode || inviteCode) {
                localStorage.setItem(`tipidlink_code_tier_${payload.inviteCode || inviteCode}`, 'FREE');
                localStorage.removeItem(`tipidlink_code_premium_${payload.inviteCode || inviteCode}`);
              }
              if (isSantosHouseholdId(hhId)) {
                localStorage.setItem(`tipidlink_household_tier_${SANTOS_UUID}`, 'FREE');
                localStorage.setItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`, 'FREE');
                localStorage.setItem('tipidlink_code_tier_SANTOS2026', 'FREE');
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
  }, [hhId, currentHousehold?.invite_code, inviteCode]);

  const saveUserState = (newIsPremium, newPlan, newSponsor) => {
    if (!user) return;

    if (user.user_metadata) {
      user.user_metadata.is_premium = newIsPremium;
      user.user_metadata.premium_plan = newPlan;
      user.user_metadata.sponsor_details = newSponsor;
    }

    if (newIsPremium) {
      localStorage.setItem(
        `tipidlink_premium_${userKey}`,
        JSON.stringify({
          isPremium: true,
          premiumPlan: newPlan,
          sponsorDetails: newSponsor,
        })
      );
    } else {
      localStorage.removeItem(`tipidlink_premium_${userKey}`);
    }

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
  const activatePremium = async (planName = 'TipidLink Premium Plan (₱30/mo)') => {
    setIsPremium(true);
    setPremiumPlan(planName);
    setSponsorDetails(null);
    saveUserState(true, planName, null);

    if (hhId) {
      await saveHouseholdPremiumState(hhId, true, planName, null);
    }

    if (updateHousehold) {
      updateHousehold({ is_premium: true, premium_plan: planName, sponsor_details: null });
    }
  };

  // Activate Community / Sponsored Access (Cooperatives, Schools, Barangays, LGUs, NGOs)
  const activateSponsoredAccess = async (sponsorName = 'Barangay Community Partner') => {
    setIsPremium(true);
    setPremiumPlan('Sponsored Community Access');
    setSponsorDetails(sponsorName);
    saveUserState(true, 'Sponsored Community Access', sponsorName);

    if (hhId) {
      await saveHouseholdPremiumState(hhId, true, 'Sponsored Community Access', sponsorName);
    }

    if (updateHousehold) {
      updateHousehold({ is_premium: true, premium_plan: 'Sponsored Community Access', sponsor_details: sponsorName });
    }
  };

  // Reset back to Free
  const resetToFree = async () => {
    setIsPremium(false);
    setPremiumPlan('Free Household Plan');
    setSponsorDetails(null);
    saveUserState(false, 'Free Household Plan', null);

    if (hhId) {
      await saveHouseholdPremiumState(hhId, false, 'Free Household Plan', null);
    }

    if (updateHousehold) {
      updateHousehold({ is_premium: false, premium_plan: 'Free Household Plan', sponsor_details: null });
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
