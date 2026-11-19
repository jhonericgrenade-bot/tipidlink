/**
 * TipidLink Household Tier & Premium Synchronization Helper
 *
 * Implements ISO/IEC 25010 functional correctness and cross-device consistency:
 * - A single ₱30 Pro subscription or Sponsored Community Access covers the ENTIRE household.
 * - When the household owner (or any member) upgrades or restores Pro, ALL members of that household
 *   across all devices (mobile, desktop, tablet) inherit Pro access.
 * - When reverted to Free, all members revert to Free.
 */

export const SANTOS_UUID = '0d37e235-c9dd-4876-a54a-9acb36516599';
export const SANTOS_DEMO_ID = 'hh-santos-family';

/**
 * Check if an ID belongs to the Santos Family Household (demo or cloud UUID)
 */
export const isSantosHouseholdId = (id) => {
  if (!id) return false;
  return id === SANTOS_UUID || id === SANTOS_DEMO_ID;
};

/**
 * Parse tier metadata embedded in household description
 * Supports:
 * - [TIER:PRO|PLAN:TipidLink Premium Plan (₱30/mo)|SPONSOR:None]
 * - [TIER:FREE]
 * - [PRO:SPONSOR:Barangay Partner]
 * - [PRO:₱30] or [PRO]
 */
export const parseHouseholdTier = (description = '') => {
  if (!description || typeof description !== 'string') {
    return {
      isPremium: false,
      plan: 'Free Household Plan',
      sponsor: null,
      cleanDescription: '',
    };
  }

  // Pattern 1: [TIER:PRO...] or [TIER:FREE...]
  const tierMatch = description.match(/\[TIER:(PRO|FREE)(?:\|PLAN:([^|\]]+))?(?:\|SPONSOR:([^|\]]+))?\]/i);
  if (tierMatch) {
    const isPro = tierMatch[1].toUpperCase() === 'PRO';
    const plan = tierMatch[2] || (isPro ? 'TipidLink Premium Plan (₱30/mo)' : 'Free Household Plan');
    const sponsor = tierMatch[3] && tierMatch[3] !== 'None' ? tierMatch[3] : null;
    const cleanDescription = description.replace(tierMatch[0], '').trim();
    return {
      isPremium: isPro,
      plan,
      sponsor,
      cleanDescription,
    };
  }

  // Pattern 2: [PRO:SPONSOR:...] or [PRO:₱30] or [PRO]
  const proMatch = description.match(/\[PRO(?::([^\]]+))?\]/i);
  if (proMatch) {
    const detail = proMatch[1] || '';
    const isSponsored = detail.toUpperCase().includes('SPONSOR');
    let sponsor = null;
    let plan = 'TipidLink Premium Plan (₱30/mo)';
    if (isSponsored) {
      plan = 'Sponsored Community Access';
      const parts = detail.split(':');
      sponsor = parts.length > 1 ? parts.slice(1).join(':').trim() : 'Community Partner';
    }
    const cleanDescription = description.replace(proMatch[0], '').trim();
    return {
      isPremium: true,
      plan,
      sponsor,
      cleanDescription,
    };
  }

  return {
    isPremium: false,
    plan: 'Free Household Plan',
    sponsor: null,
    cleanDescription: description.trim(),
  };
};

/**
 * Encode tier metadata into household description for seamless cloud persistence in Supabase
 */
export const formatHouseholdDescription = (cleanDescription = '', isPremium = false, plan = '', sponsor = null) => {
  // Strip any existing tags
  const base = (cleanDescription || '')
    .replace(/\[TIER:(?:PRO|FREE)[^\]]*\]/gi, '')
    .replace(/\[PRO[^\]]*\]/gi, '')
    .trim();

  if (!isPremium) {
    return base;
  }

  const tag = sponsor
    ? `[TIER:PRO|PLAN:${plan || 'Sponsored Community Access'}|SPONSOR:${sponsor}]`
    : `[TIER:PRO|PLAN:${plan || 'TipidLink Premium Plan (₱30/mo)'}]`;

  return base ? `${base} ${tag}` : tag;
};

/**
 * Resolve household premium state across all storage layers (cloud, cache, aliases)
 */
export const resolveHouseholdPremiumState = (household, userKey = null) => {
  if (!household) {
    return {
      isPremium: false,
      plan: 'Free Household Plan',
      sponsor: null,
    };
  }

  const hhId = household.id;
  const isSantos = isSantosHouseholdId(hhId) || household.invite_code === 'SANTOS2026';

  // 1. Direct explicit boolean on household object
  if (household.is_premium === true) {
    return {
      isPremium: true,
      plan: household.premium_plan || 'TipidLink Premium Plan (₱30/mo)',
      sponsor: household.sponsor_details || null,
    };
  }

  // 2. Parse from description
  const parsed = parseHouseholdTier(household.raw_description || household.description);
  if (parsed.isPremium) {
    return {
      isPremium: true,
      plan: parsed.plan,
      sponsor: parsed.sponsor,
    };
  }

  // 3. LocalStorage household cache
  if (typeof localStorage !== 'undefined' && hhId) {
    const hhCache = localStorage.getItem(`tipidlink_household_premium_${hhId}`);
    if (hhCache === 'true') {
      return {
        isPremium: true,
        plan: localStorage.getItem(`tipidlink_household_plan_${hhId}`) || 'TipidLink Premium Plan (₱30/mo)',
        sponsor: localStorage.getItem(`tipidlink_household_sponsor_${hhId}`) || null,
      };
    }

    // Santos aliases cross-check
    if (isSantos) {
      const alias1 = localStorage.getItem(`tipidlink_household_premium_${SANTOS_UUID}`);
      const alias2 = localStorage.getItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
      if (alias1 === 'true' || alias2 === 'true') {
        const plan = localStorage.getItem(`tipidlink_household_plan_${SANTOS_UUID}`)
          || localStorage.getItem(`tipidlink_household_plan_${SANTOS_DEMO_ID}`)
          || 'TipidLink Premium Plan (₱30/mo)';
        const sponsor = localStorage.getItem(`tipidlink_household_sponsor_${SANTOS_UUID}`)
          || localStorage.getItem(`tipidlink_household_sponsor_${SANTOS_DEMO_ID}`)
          || null;
        return {
          isPremium: true,
          plan,
          sponsor,
        };
      }
    }
  }

  return {
    isPremium: false,
    plan: 'Free Household Plan',
    sponsor: null,
  };
};
