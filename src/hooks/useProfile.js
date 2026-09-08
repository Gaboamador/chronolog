import { useCallback, useEffect, useState } from 'react';
import { obtenerDatosPerfil } from '@/services/firebase/profileService';
import { isProfileComplete, normalizeProfile } from '@/utils/profile';

export function useProfile(user, authLoading) {
  const [profile, setProfileState] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileCheckedUid, setProfileCheckedUid] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setProfileState(null);
      setProfileLoading(false);
      setProfileError(null);
      setProfileCheckedUid(null);
      return undefined;
    }

    let active = true;
    setProfileLoading(true);
    setProfileError(null);
    obtenerDatosPerfil(user.uid)
      .then((result) => {
        if (active) {
          setProfileState(normalizeProfile(result));
          setProfileCheckedUid(user.uid);
        }
      })
      .catch((error) => {
        if (!active) return;
        console.error('Error cargando el perfil:', error);
        setProfileError(error);
        setProfileCheckedUid(user.uid);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, user, reloadToken]);

  const setProfile = useCallback((nextProfile) => {
    setProfileState(normalizeProfile(nextProfile));
    setProfileError(null);
    setProfileCheckedUid(user?.uid || null);
  }, [user]);

  const retryProfileLoad = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return {
    profile,
    profileComplete: isProfileComplete(profile),
    profileLoading: profileLoading || Boolean(user && profileCheckedUid !== user.uid),
    profileError,
    setProfile,
    retryProfileLoad,
  };
}
