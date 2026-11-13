import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PremiumContext = createContext();

export const PremiumProvider = ({ children }) => {
  const { user, isDemoMode } = useAuth();
  const userKey = isDemoMode ? 'demo' : (user?.id || 'guest');

  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState('Free Household Plan');
  const [sponsorDetails, setSponsorDetails] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Sync premium status per authenticated user
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setPremiumPlan('Free Household Plan');
      setSponsorDetails(null);
      return;
    }

    const saved = localStorage.getItem(`tipidlink_premium_${userKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setIsPremium(Boolean(parsed.isPremium));
        setPremiumPlan(parsed.premiumPlan || 'Free Household Plan');
        setSponsorDetails(parsed.sponsorDetails || null);
        return;
      } catch (e) {
        console.error('Failed to parse user premium state:', e);
      }
    }

    // Default: Every new user starts on the clean Free Household Plan
    setIsPremium(false);
    setPremiumPlan('Free Household Plan');
    setSponsorDetails(null);
  }, [user?.id, isDemoMode]);

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
  };

  // Activate ₱30 Direct Plan
  const activatePremium = (planName = 'TipidLink Premium Plan (₱30/mo)') => {
    setIsPremium(true);
    setPremiumPlan(planName);
    setSponsorDetails(null);
    saveUserState(true, planName, null);
  };

  // Activate Community / Sponsored Access (Cooperatives, Schools, Barangays, LGUs, NGOs)
  const activateSponsoredAccess = (sponsorName = 'Barangay Community Partner') => {
    setIsPremium(true);
    setPremiumPlan('Sponsored Community Access');
    setSponsorDetails(sponsorName);
    saveUserState(true, 'Sponsored Community Access', sponsorName);
  };

  // Reset back to Free
  const resetToFree = () => {
    setIsPremium(false);
    setPremiumPlan('Free Household Plan');
    setSponsorDetails(null);
    if (user) {
      localStorage.removeItem(`tipidlink_premium_${userKey}`);
    }
  };

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
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
