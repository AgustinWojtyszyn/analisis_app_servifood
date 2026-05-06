import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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
    role: profile?.role || appMetadata.role || 'user'
  };
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function ensureProfileFromAuthUser(authUser) {
      if (!authUser?.id) return null;

      const metadata = authUser.user_metadata || {};
      const metadataName = String(metadata.full_name || metadata.name || '').trim();

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        return null;
      }

      if (!existingProfile) {
        const insertPayload = {
          id: authUser.id,
          email: authUser.email || null,
          full_name: metadataName || null,
          role: 'user',
          is_active: true
        };
        const { data: insertedProfile } = await supabase
          .from('profiles')
          .insert(insertPayload)
          .select('id, email, full_name, role')
          .maybeSingle();
        return insertedProfile || null;
      }

      const profileName = String(existingProfile.full_name || '').trim();
      if (!profileName && metadataName) {
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update({ full_name: metadataName })
          .eq('id', authUser.id)
          .select('id, email, full_name, role')
          .maybeSingle();
        return updatedProfile || existingProfile;
      }

      return existingProfile;
    }

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      const authUser = data?.session?.user || null;
      const profile = authUser ? await ensureProfileFromAuthUser(authUser) : null;
      const currentUser = mapSupabaseUser(authUser, profile);

      if (!mounted) return;

      setUser(currentUser);
      if (data?.session?.access_token) {
        localStorage.setItem('supabase_access_token', data.session.access_token);
      } else {
        localStorage.removeItem('supabase_access_token');
      }
      setLoading(false);
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;

      void (async () => {
        const profile = authUser ? await ensureProfileFromAuthUser(authUser) : null;
        const nextUser = mapSupabaseUser(authUser, profile);
        setUser(nextUser);
      })();

      if (session?.access_token) {
        localStorage.setItem('supabase_access_token', session.access_token);
      } else {
        localStorage.removeItem('supabase_access_token');
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('supabase_access_token');
  };

  return { user, login, logout, loading };
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
