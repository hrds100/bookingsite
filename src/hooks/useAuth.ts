import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  operatorId: string | null;
}

const ADMIN_EMAILS = ["admin@hub.nfstay.com", "hugo@nfstay.com"];

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
    isOperator: false,
    operatorId: null,
  });

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
        setState(prev => ({ ...prev, user, session, loading: false, isAdmin }));

        // Check operator status in background (don't block auth)
        if (user) {
          supabase
            .from("nfs_operators")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle()
            .then(({ data }) => {
              setState(prev => ({
                ...prev,
                isOperator: !!data,
                operatorId: data?.id ?? null,
              }));
            });
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
      setState(prev => ({ ...prev, user, session, loading: false, isAdmin }));

      if (user) {
        supabase
          .from("nfs_operators")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            setState(prev => ({
              ...prev,
              isOperator: !!data,
              operatorId: data?.id ?? null,
            }));
          });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      loading: false,
      isAdmin: false,
      isOperator: false,
      operatorId: null,
    });
  }, []);

  const setSession = useCallback(async (accessToken: string, refreshToken: string) => {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return { data, error };
  }, []);

  return { ...state, signUp, signIn, signOut, setSession };
}
