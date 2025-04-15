// app/_layout.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabaseClient';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider defined in app/_layout.tsx');
  }
  return context;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(error => {
      console.error("Error fetching initial session:", error);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

   // În app/_layout.tsx, în useEffect pentru protejarea rutelor

if (!session && !inAuthGroup) {
  console.log('No session, redirecting to login...');
  // --- MODIFICARE NECESARĂ AICI ---
  // Schimbă '/(auth)/login' cu '/login' dacă fișierul tău este app/login.tsx
  router.replace({ pathname: '/login' });
  // ------------------------------
} else if (session && inAuthGroup) {
  // ... (redirecționarea spre '/' probabil rămâne la fel)
   router.replace({ pathname: '/' });
}
  }, [session, loading, segments, router]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
    </View>
  )
}