import React, { createContext, useContext, useState, useEffect } from 'react';

const PremiumContext = createContext();

export const PremiumProvider = ({ children }) => {
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('tipidlink_is_premium') === 'true';
  });

  const [premiumPlan, setPremiumPlan] = useState(() => {
    return localStorage.getItem('tipidlink_premium_plan') || 'Free Household Plan';
  });

  const [sponsorDetails, setSponsorDetails] = useState(() => {
    return localStorage.getItem('tipidlink_premium_sponsor') || null;
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('tipidlink_is_premium', isPremium ? 'true' : 'false');
    localStorage.setItem('tipidlink_premium_plan', premiumPlan);
    if (sponsorDetails) {
      localStorage.setItem('tipidlink_premium_sponsor', sponsorDetails);
    } else {
      localStorage.removeItem('tipidlink_premium_sponsor');
    }
  }, [isPremium, premiumPlan, sponsorDetails]);

  // Activate ₱30 Direct Plan
  const activatePremium = (planName = 'TipidLink Premium Plan (₱30/mo)') => {
    setIsPremium(true);
    setPremiumPlan(planName);
    setSponsorDetails(null);
  };

  // Activate Community / Sponsored Access (Cooperatives, Schools, Barangays, LGUs, NGOs)
  const activateSponsoredAccess = (sponsorName = 'Barangay Community Partner') => {
    setIsPremium(true);
    setPremiumPlan('Sponsored Community Access');
    setSponsorDetails(sponsorName);
  };

  // Reset back to Free
  const resetToFree = () => {
    setIsPremium(false);
    setPremiumPlan('Free Household Plan');
    setSponsorDetails(null);
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
