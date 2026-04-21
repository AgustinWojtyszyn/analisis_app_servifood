import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapSupabaseUser(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};

  return {
    id: user.id,
    email: user.email,
    name: metadata.name || metadata.full_name || user.email,
    role: appMetadata.role || 'user'
  };
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      const currentUser = mapSupabaseUser(data?.session?.user || null);

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
      const nextUser = mapSupabaseUser(session?.user || null);
      setUser(nextUser);

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
