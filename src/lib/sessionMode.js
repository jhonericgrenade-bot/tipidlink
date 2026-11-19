// A real authenticated session always takes precedence over local demo cache.
// Email domains are deliberately not part of this decision: they do not prove
// whether an account is demo-only or a real cloud user.
export const resolveSessionMode = ({ hasCloudSession, demoActive, savedDemoUser }) => {
  if (hasCloudSession) return 'cloud';
  return demoActive === 'true' && Boolean(savedDemoUser) ? 'demo' : 'signed_out';
};
