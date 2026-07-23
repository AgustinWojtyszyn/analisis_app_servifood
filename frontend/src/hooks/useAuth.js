import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const PROFILE_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  EXISTING: 'existing',
  CREATED: 'created',
  INACTIVE: 'inactive',
  MISSING: 'missing',
  ERROR: 'error'
};

const PROFILE_ERROR_MESSAGES = {
  load: 'No pudimos cargar tu perfil. Revisá tu conexión e intentá nuevamente.',
  create: 'Tu cuenta existe, pero no pudimos preparar tu perfil. Intentá cerrar sesión e ingresar nuevamente.',
  missing: 'Tu cuenta existe, pero no encontramos un perfil habilitado para usar la aplicación.',
  inactive: 'Tu usuario está inactivo. Contactá a un administrador para recuperar el acceso.'
};

function createProfileError(reason, error = null) {
  const profileError = new Error(PROFILE_ERROR_MESSAGES[reason] || PROFILE_ERROR_MESSAGES.load);
  profileError.reason = reason;
  profileError.publicMessage = profileError.message;
  profileError.code = error?.code || null;
  profileError.status = error?.status || null;
  return profileError;
}

function logProfileError(event, error) {
  console.warn(`[auth] ${event}`, {
    reason: error?.reason || 'unknown',
    code: error?.code || null,
    status: error?.status || null
  });
}

function resolveExistingProfileStatus(profile) {
  return profile?.is_active === false ? PROFILE_STATUS.INACTIVE : PROFILE_STATUS.EXISTING;
}

function mapSupabaseUser(user, profile = null) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  const profileName = String(profile?.full_name || '').trim();
  const metadataName = String(metadata.full_name || metadata.name || '').trim();

  return {
    id: user.id,
    email: user.email,
    name: profileName || metadataName || user.email,
    role: profile?.role || appMetadata.role || null
  };
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [profileStatus, setProfileStatus] = useState(PROFILE_STATUS.IDLE);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let authRequestId = 0;

    async function ensureProfileFromAuthUser(authUser) {
      if (!authUser?.id) return null;

      const metadata = authUser.user_metadata || {};
      const metadataName = String(metadata.full_name || metadata.name || '').trim();

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        throw createProfileError('load', profileError);
      }

      if (!existingProfile) {
        const insertPayload = {
          id: authUser.id,
          email: authUser.email || null,
          full_name: metadataName || null,
          role: 'user',
          is_active: true
        };
        const { data: insertedProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(insertPayload)
          .select('id, email, full_name, role, is_active')
          .maybeSingle();

        if (insertError) {
          const { data: recoveredProfile } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, is_active')
            .eq('id', authUser.id)
            .maybeSingle();

          if (recoveredProfile) {
            return {
              profile: recoveredProfile,
              status: resolveExistingProfileStatus(recoveredProfile)
            };
          }

          throw createProfileError('create', insertError);
        }

        if (!insertedProfile) {
          throw createProfileError('missing');
        }

        return { profile: insertedProfile, status: PROFILE_STATUS.CREATED };
      }

      if (resolveExistingProfileStatus(existingProfile) === PROFILE_STATUS.INACTIVE) {
        return { profile: existingProfile, status: PROFILE_STATUS.INACTIVE };
      }

      const profileName = String(existingProfile.full_name || '').trim();
      if (!profileName && metadataName) {
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: metadataName })
          .eq('id', authUser.id)
          .select('id, email, full_name, role, is_active')
          .maybeSingle();

        if (updateError) {
          logProfileError('profile_name_update_failed', createProfileError('load', updateError));
          return { profile: existingProfile, status: PROFILE_STATUS.EXISTING };
        }

        return { profile: updatedProfile || existingProfile, status: PROFILE_STATUS.EXISTING };
      }

      return { profile: existingProfile, status: PROFILE_STATUS.EXISTING };
    }

    async function applySession(session) {
      const requestId = ++authRequestId;
      const authUser = session?.user || null;

      if (!authUser) {
        if (!mounted || requestId !== authRequestId) return;
        setUser(null);
        setProfileStatus(PROFILE_STATUS.IDLE);
        setProfileError(null);
        return;
      }

      if (mounted && requestId === authRequestId) {
        setProfileStatus(PROFILE_STATUS.LOADING);
        setProfileError(null);
      }

      try {
        const { profile, status } = await ensureProfileFromAuthUser(authUser);
        const currentUser = mapSupabaseUser(authUser, profile);

        if (!mounted || requestId !== authRequestId) return;

        setUser(currentUser);
        setProfileStatus(status);
        setProfileError(status === PROFILE_STATUS.INACTIVE ? PROFILE_ERROR_MESSAGES.inactive : null);
      } catch (error) {
        const controlledError = error?.publicMessage ? error : createProfileError('load', error);

        if (!mounted || requestId !== authRequestId) return;

        logProfileError('profile_load_failed', controlledError);

        setUser(mapSupabaseUser(authUser, null));
        setProfileStatus(controlledError.reason === 'missing' ? PROFILE_STATUS.MISSING : PROFILE_STATUS.ERROR);
        setProfileError(controlledError.publicMessage);
      }
    }

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      await applySession(data?.session || null);
      if (!mounted) return;
      setLoading(false);
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsPasswordRecovery(event === 'PASSWORD_RECOVERY');
      void applySession(session || null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    setProfileStatus(PROFILE_STATUS.LOADING);
    setProfileError(null);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfileStatus(PROFILE_STATUS.IDLE);
    setProfileError(null);
    setIsPasswordRecovery(false);
  };

  return { user, login, logout, loading, isPasswordRecovery, profileStatus, profileError };
}

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
