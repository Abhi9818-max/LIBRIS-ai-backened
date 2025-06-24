'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, type User, signOut } from 'firebase/auth';
import { auth, missingConfig } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isFirebaseConfigured = missingConfig.length === 0;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    // Check for guest status first on client-side
    if (typeof window !== 'undefined') {
        const guestStatus = sessionStorage.getItem('isGuest') === 'true';
        if (guestStatus) {
            setIsGuest(true);
            setLoading(false);
            return; // Don't setup firebase listener for guests
        }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsGuest(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isGuest');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured]);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

  const signInAsGuest = () => {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('isGuest', 'true');
    }
    setIsGuest(true);
    setUser(null);
    router.push('/');
  };

  const signOutUser = async () => {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isGuest');
    }
    setIsGuest(false);

    if (!isFirebaseConfigured || !auth.currentUser) {
        router.push('/auth');
        return;
    };
    
    try {
      await signOut(auth);
      router.push('/auth');
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  const value = {
    user,
    isGuest,
    loading,
    isFirebaseConfigured,
    signInWithGoogle,
    signInAsGuest,
    signOutUser,
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
