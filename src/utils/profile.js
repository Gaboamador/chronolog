export function normalizeProfile(profile) {
  return {
    firstName: typeof profile?.firstName === 'string' ? profile.firstName.trim() : '',
    lastName: typeof profile?.lastName === 'string' ? profile.lastName.trim() : '',
  };
}

export function isProfileComplete(profile) {
  const normalized = normalizeProfile(profile);
  return Boolean(normalized.firstName && normalized.lastName);
}
