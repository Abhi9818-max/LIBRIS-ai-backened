
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithRedirect, GoogleAuthProvider, type User, signOut } from 'firebase/auth';
import { auth, missingConfig } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  missingConfigKeys: string[];
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  signOutUser: () => Promise<void>;
  exitGuestModeAndSignIn: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const isFirebaseConfigured = missingConfig.length === 0;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem('isGuest') === 'true') {
        setIsGuest(true);
        setUser(null);
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        sessionStorage.removeItem('isGuest');
      }
      setLoading(false);
    }, (error) => {
        console.error('onAuthStateChanged error:', error);
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'There was a problem with your session. Please try refreshing.',
        });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured, toast]);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
        toast({
            variant: 'destructive',
            title: 'Firebase Not Configured',
            description: 'Cannot sign in. Please complete the setup instructions.',
        });
        return;
    }
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      let description = `Could not start sign-in process. (${error.code || 'Unknown error'})`;
      toast({
          variant: 'destructive',
          title: 'Sign-In Failed',
          description,
          duration: 9000,
      });
      setLoading(false);
    }
  };

  const signInAsGuest = () => {
    setLoading(true);
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('isGuest', 'true');
    }
    setIsGuest(true);
    setUser(null);
    setLoading(false);
    router.push('/');
  };

  const exitGuestModeAndSignIn = () => {
    sessionStorage.removeItem('isGuest');
    setIsGuest(false);
    signInWithGoogle();
  };

  const signOutUser = async () => {
    if (!isFirebaseConfigured) return;
    setLoading(true);
    if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (error: any) {
          console.error("Sign-out failed:", error);
          toast({
              variant: 'destructive',
              title: 'Sign-Out Error',
              description: `Could not sign out. (${error.code})`,
          });
        }
    }
    setIsGuest(false);
    setUser(null);
    if(typeof window !== 'undefined') {
        sessionStorage.removeItem('isGuest');
    }
    setLoading(false);
    router.push('/auth');
  };

  const value = {
    user,
    isGuest,
    loading,
    isFirebaseConfigured,
    missingConfigKeys: missingConfig.map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`),
    signInWithGoogle,
    signInAsGuest,
    signOutUser,
    exitGuestModeAndSignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
