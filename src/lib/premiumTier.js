/**
 * TipidLink Household Tier & Premium Synchronization Helper
 *
 * Implements ISO/IEC 25010 functional correctness and cross-device consistency:
 * - A single ₱30 Pro subscription or Sponsored Community Access covers the ENTIRE household.
 * - When the household owner (or any member) upgrades or restores Pro, ALL members and admins of that household
 *   across all devices (mobile, desktop, tablet) inherit Pro access.
 * - When reverted to Free by the owner, all members and admins revert to Free.
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

  // Explicit FREE tag
  if (description.includes('[TIER:FREE]')) {
    return {
      isPremium: false,
      plan: 'Free Household Plan',
      sponsor: null,
      cleanDescription: description.replace(/\[TIER:FREE\]/gi, '').trim(),
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
 * Update the user's public profile in Supabase to record their Pro status.
 * Standard Supabase RLS ('auth.uid() = id') ALWAYS allows users to update their own profile.
 * Public profiles are viewable by all authenticated users, allowing all members to inherit Pro.
 */
export const syncOwnerProfilePremium = async (supabase, userId, isPremium, plan = '', sponsor = null) => {
  if (!supabase || !userId) return;

  try {
    const { data: currentP } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle();

    const rawPhone = currentP?.phone || '';
    // Strip existing PREMIUM_STATUS tags
    const cleanPhone = rawPhone
      .replace(/\|?PREMIUM_STATUS:[^|]+/gi, '')
      .replace(/\|?PLAN:[^|]+/gi, '')
      .replace(/\|?SPONSOR:[^|]+/gi, '')
      .trim();

    let newPhone = cleanPhone;
    if (isPremium) {
      const planTag = plan || 'TipidLink Premium Plan (₱30/mo)';
      const sponsorTag = sponsor || 'none';
      const proTag = `PREMIUM_STATUS:PRO|PLAN:${planTag}|SPONSOR:${sponsorTag}`;
      newPhone = cleanPhone ? `${cleanPhone}|${proTag}` : proTag;
    }

    await supabase
      .from('profiles')
      .update({
        phone: newPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (err) {
    console.warn('syncOwnerProfilePremium note:', err);
  }
};

/**
 * Resolve household premium state across all storage layers (cloud, cache, owner status, aliases)
 */
export const resolveHouseholdPremiumState = (household, userKey = null, members = []) => {
  if (!household) {
    return {
      isPremium: false,
      plan: 'Free Household Plan',
      sponsor: null,
    };
  }

  const hhId = household.id;
  const isSantos = isSantosHouseholdId(hhId) || household.invite_code === 'SANTOS2026';

  // 1. Explicit local override check: If marked FREE, respect FREE!
  if (typeof localStorage !== 'undefined' && hhId) {
    const tierOverride = localStorage.getItem(`tipidlink_household_tier_${hhId}`);
    if (tierOverride === 'FREE') {
      return {
        isPremium: false,
        plan: 'Free Household Plan',
        sponsor: null,
      };
    }
    if (household.invite_code && localStorage.getItem(`tipidlink_code_tier_${household.invite_code}`) === 'FREE') {
      return {
        isPremium: false,
        plan: 'Free Household Plan',
        sponsor: null,
      };
    }
  }

  // 2. Direct explicit boolean on household object
  if (household.is_premium === true) {
    return {
      isPremium: true,
      plan: household.premium_plan || 'TipidLink Premium Plan (₱30/mo)',
      sponsor: household.sponsor_details || null,
    };
  }

  // 3. Parse from description
  const parsed = parseHouseholdTier(household.raw_description || household.description);
  if (parsed.isPremium) {
    return {
      isPremium: true,
      plan: parsed.plan,
      sponsor: parsed.sponsor,
    };
  }

  // 4. Inspect members list for a Pro Owner
  if (Array.isArray(members) && members.length > 0) {
    const ownerMember = members.find(m => m.role === 'owner' || (household.created_by && m.user_id === household.created_by));
    if (ownerMember?.phone && ownerMember.phone.includes('PREMIUM_STATUS:PRO')) {
      const match = ownerMember.phone.match(/PLAN:([^|]+)/i);
      const sponsorMatch = ownerMember.phone.match(/SPONSOR:([^|]+)/i);
      const plan = match ? match[1] : 'TipidLink Premium Plan (₱30/mo)';
      const sponsor = sponsorMatch && sponsorMatch[1] !== 'none' ? sponsorMatch[1] : null;
      return {
        isPremium: true,
        plan,
        sponsor,
      };
    }
  }

  // 5. LocalStorage household and invite code caches
  if (typeof localStorage !== 'undefined' && hhId) {
    const hhTier = localStorage.getItem(`tipidlink_household_tier_${hhId}`);
    const hhCache = localStorage.getItem(`tipidlink_household_premium_${hhId}`);
    if (hhTier === 'PRO' || hhCache === 'true') {
      return {
        isPremium: true,
        plan: localStorage.getItem(`tipidlink_household_plan_${hhId}`) || 'TipidLink Premium Plan (₱30/mo)',
        sponsor: localStorage.getItem(`tipidlink_household_sponsor_${hhId}`) || null,
      };
    }

    if (household.invite_code && (
      localStorage.getItem(`tipidlink_code_tier_${household.invite_code}`) === 'PRO' ||
      localStorage.getItem(`tipidlink_code_premium_${household.invite_code}`) === 'true'
    )) {
      return {
        isPremium: true,
        plan: localStorage.getItem(`tipidlink_household_plan_${hhId}`) || 'TipidLink Premium Plan (₱30/mo)',
        sponsor: localStorage.getItem(`tipidlink_household_sponsor_${hhId}`) || null,
      };
    }

    // Santos aliases cross-check
    if (isSantos) {
      const aliasTier = localStorage.getItem(`tipidlink_household_tier_${SANTOS_UUID}`)
        || localStorage.getItem(`tipidlink_household_tier_${SANTOS_DEMO_ID}`)
        || localStorage.getItem('tipidlink_code_tier_SANTOS2026');

      if (aliasTier === 'FREE') {
        return { isPremium: false, plan: 'Free Household Plan', sponsor: null };
      }

      const alias1 = localStorage.getItem(`tipidlink_household_premium_${SANTOS_UUID}`);
      const alias2 = localStorage.getItem(`tipidlink_household_premium_${SANTOS_DEMO_ID}`);
      const alias3 = localStorage.getItem('tipidlink_code_premium_SANTOS2026');

      if (alias1 === 'true' || alias2 === 'true' || alias3 === 'true' || aliasTier === 'PRO') {
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
