import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { broadcastSyncEvent, subscribeToSyncEvents, isMatchingHouseholdId } from '../lib/realtimeSync';
import {
  parseHouseholdTier,
  formatHouseholdDescription,
  resolveHouseholdPremiumState,
  isSantosHouseholdId,
  SANTOS_UUID,
  SANTOS_DEMO_ID
} from '../lib/premiumTier';

const PremiumContext = createContext();

export const PremiumProvider = ({ children }) => {
  const { user, isDemoMode } = useAuth();
  const { currentHousehold, updateHousehold } = useHousehold();
  const userKey = isDemoMode ? 'demo' : (user?.id || 'guest');
  const hhId = currentHousehold?.id;

  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState('Free Household Plan');
  const [sponsorDetails, setSponsorDetails] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Cross-device and universal household tier persistence helper
  const saveHouseholdPremiumState = useCallback(async (targetHouseholdId, newIsPremium, newPlan, newSponsor) => {
    if (!targetHouseholdId) return;

    // 1. LocalStorage for householdId and Santos aliases
    if (newIsPremium) {
      localStorage.setItem(`tipidlink_household_premium_${targetHouseholdId}`, 'true');
      localStorage.setItem(`tipidlink_household_plan_${targetHouseholdId}`, newPlan);
      if (newSponsor) {
        localStorage.setItem(`tipidlink_household_sponsor_${targetHouseholdId}`, newSponsor);
      } else {
        localStorage.removeItem(`tipidlink_household_sponsor_${targetHouseholdId}`);
      }
      if (isSantosHouseholdId(targetHouseholdId)) {
        localStorage.setItem(`tipidlink_household_premium_${SANTOS_UUID}`, 'true');
        localStorage.setItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`, 'true');
        localStorage.setItem(`tipidlink_household_plan_${SANTOS_UUID}`, newPlan);
        localStorage.setItem(`tipidlink_household_plan_${SANTOS_DEMO_ID}`, newPlan);
        if (newSponsor) {
          localStorage.setItem(`tipidlink_household_sponsor_${SANTOS_UUID}`, newSponsor);
          localStorage.setItem(`tipidlink_household_sponsor_${SANTOS_DEMO_ID}`, newSponsor);
        }
      }
    } else {
      localStorage.removeItem(`tipidlink_household_premium_${targetHouseholdId}`);
      localStorage.removeItem(`tipidlink_household_plan_${targetHouseholdId}`);
      localStorage.removeItem(`tipidlink_household_sponsor_${targetHouseholdId}`);
      if (isSantosHouseholdId(targetHouseholdId)) {
        localStorage.removeItem(`tipidlink_household_premium_${SANTOS_UUID}`);
        localStorage.removeItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
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
      plan: newPlan,
      sponsor: newSponsor,
    });

    // 3. Supabase Cloud update to households table
    if (isSupabaseConfigured && !isDemoMode) {
      const isUuid = typeof targetHouseholdId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetHouseholdId);
      const cloudTargetId = isUuid ? targetHouseholdId : (targetHouseholdId === SANTOS_DEMO_ID ? SANTOS_UUID : null);

      if (cloudTargetId) {
        try {
          const rawDesc = currentHousehold?.raw_description || currentHousehold?.description || '';
          const cleanDesc = (currentHousehold?.clean_description || rawDesc).replace(/\[TIER:[^\]]*\]/gi, '').replace(/\[PRO[^\]]*\]/gi, '').trim();
          const formatted = formatHouseholdDescription(cleanDesc, newIsPremium, newPlan, newSponsor);

          const { error } = await supabase
            .from('households')
            .update({
              description: formatted,
              updated_at: new Date().toISOString(),
            })
            .eq('id', cloudTargetId);

          if (error) {
            console.warn('Supabase household description tier update note:', error.message);
          }
        } catch (err) {
          console.warn('Cloud household tier sync note:', err.message);
        }
      }
    }
  }, [currentHousehold, isDemoMode]);

  // Sync premium status per authenticated user and active household
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setPremiumPlan('Free Household Plan');
      setSponsorDetails(null);
      return;
    }

    // 1. Check household-specific premium status (Pro covers the entire household!)
    const hhTier = resolveHouseholdPremiumState(currentHousehold, userKey);
    if (hhTier.isPremium) {
      setIsPremium(true);
      setPremiumPlan(hhTier.plan);
      setSponsorDetails(hhTier.sponsor);
      return;
    }

    // 2. Check cloud user_metadata for personal/owner status
    const cloudPremium = Boolean(user?.user_metadata?.is_premium);
    const cloudPlan = user?.user_metadata?.premium_plan || 'TipidLink Premium Plan (₱30/mo)';
    const cloudSponsor = user?.user_metadata?.sponsor_details || null;

    if (cloudPremium) {
      setIsPremium(true);
      setPremiumPlan(cloudPlan);
      setSponsorDetails(cloudSponsor);

      // If user is Owner or creator of current household, propagate Pro to the whole household in the cloud!
      if (currentHousehold?.id && !currentHousehold.is_premium) {
        saveHouseholdPremiumState(currentHousehold.id, true, cloudPlan, cloudSponsor);
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

    // 4. Default: Every new user and free household starts on the clean Free Household Plan
    setIsPremium(false);
    setPremiumPlan('Free Household Plan');
    setSponsorDetails(null);
  }, [
    user?.id,
    user?.user_metadata?.is_premium,
    currentHousehold?.id,
    currentHousehold?.is_premium,
    currentHousehold?.description,
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
              if (isSantosHouseholdId(hhId)) {
                localStorage.setItem(`tipidlink_household_premium_${SANTOS_UUID}`, 'true');
                localStorage.setItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`, 'true');
              }
            } else {
              localStorage.removeItem(`tipidlink_household_premium_${hhId}`);
              localStorage.removeItem(`tipidlink_household_plan_${hhId}`);
              localStorage.removeItem(`tipidlink_household_sponsor_${hhId}`);
              if (isSantosHouseholdId(hhId)) {
                localStorage.removeItem(`tipidlink_household_premium_${SANTOS_UUID}`);
                localStorage.removeItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
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

    // Persist to Supabase Auth cloud so user's own profile remembers Pro across devices
    if (!isDemoMode && isSupabaseConfigured && supabase?.auth?.updateUser) {
      supabase.auth.updateUser({
        data: {
          is_premium: newIsPremium,
          premium_plan: newPlan,
          sponsor_details: newSponsor,
        },
      }).catch(err => console.warn('Cloud premium metadata sync note:', err));
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
    if (user) {
      localStorage.removeItem(`tipidlink_premium_${userKey}`);
    }
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
