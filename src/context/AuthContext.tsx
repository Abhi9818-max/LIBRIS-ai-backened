
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Simplified user object for guests
interface GuestUser {
  displayName: string;
  photoURL: string | null;
}

interface AuthContextType {
  user: GuestUser | null;
  loading: boolean;
  updateGuestPhoto: (photoDataUri: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // The app is now always in guest mode.
    // We retrieve the photo from localStorage if it exists.
    setLoading(true);
    let guestPhotoURL: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        guestPhotoURL = window.localStorage.getItem('guestPhotoURL');
      }
    } catch (e) {
      console.error("Could not access localStorage", e);
    }
    setUser({ displayName: 'Guest', photoURL: guestPhotoURL });
    setLoading(false);
  }, []);
  
  const updateGuestPhoto = (photoDataUri: string) => {
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('guestPhotoURL', photoDataUri);
            setUser(prevUser => prevUser ? { ...prevUser, photoURL: photoDataUri } : { displayName: 'Guest', photoURL: photoDataUri });
             toast({
                title: 'Success!',
                description: 'Your profile picture has been updated.',
            });
        }
    } catch(e) {
        console.error("Could not save photo to localStorage", e);
        toast({
            title: 'Save Failed',
            description: 'Could not save profile picture locally.',
            variant: 'destructive',
        });
    }
  };

  const value = {
    user,
    loading,
    updateGuestPhoto,
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
