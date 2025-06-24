
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, type User, signOut } from 'firebase/auth';
import { auth, missingConfig } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
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

    // On initial load, check for guest status from session storage.
    if (typeof window !== 'undefined') {
        const guestStatus = sessionStorage.getItem('isGuest') === 'true';
        if (guestStatus) {
            setIsGuest(true);
            setLoading(false);
            return; // Don't attach Firebase listener for guests.
        }
    }

    // If not a guest, listen for Firebase auth changes.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsGuest(false); // A logged-in user or a logged-out user is not a guest.
      if (currentUser) {
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
            description: 'Cannot sign in. Please check your .env.local file.',
        });
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Redirection is handled by useEffect hooks in pages based on auth state.
    } catch (error: any) {
      console.error("Google sign-in failed:", error);
      let description = `Could not sign in with Google. (${error.code || 'Unknown error'})`;

      if (error.code === 'auth/internal-error') {
        description = `An internal authentication error occurred. This is often due to project configuration. Please check the following in your Firebase project:
        1. Ensure your .env.local file has the correct Firebase credentials.
        2. Go to Authentication -> Settings -> Authorized Domains and add '${window.location.hostname}'.
        3. In Google Cloud Console, ensure the "Identity Platform" API is enabled for your project.`;
      }

      toast({
          variant: 'destructive',
          title: 'Sign-In Failed',
          description,
          duration: 15000,
      });
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

  const exitGuestModeAndSignIn = () => {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isGuest');
        // A full page reload is the most robust way to transition from a non-listener
        // state (guest) to a listener state (auth page), ensuring a clean start.
        window.location.href = '/auth';
    }
  };

  const signOutUser = async () => {
    if (!isFirebaseConfigured) return;
    
    if (auth.currentUser) {
        try {
          await signOut(auth);
          // onAuthStateChanged will set user to null.
        } catch (error: any) {
          console.error("Sign-out failed:", error);
          toast({
              variant: 'destructive',
              title: 'Sign-Out Error',
              description: `Could not sign out. (${error.code})`,
          });
        }
    }
    // For both signed-in users and guests, clearing state and redirecting is desired.
    setIsGuest(false);
    setUser(null);
    if(typeof window !== 'undefined') {
        sessionStorage.removeItem('isGuest');
    }
    router.push('/auth');
  };

  const value = {
    user,
    isGuest,
    loading,
    isFirebaseConfigured,
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
