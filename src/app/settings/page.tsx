
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User as UserIcon, ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, loading: authLoading, isGuest, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || isGuest)) {
      router.push('/auth');
    }
    if (user?.photoURL) {
      setPhotoURL(user.photoURL);
    }
  }, [user, authLoading, isGuest, router]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoURL(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!photo || !user) return;

    if (!isFirebaseConfigured || !storage) {
        toast({
            title: 'Storage Not Configured',
            description: 'Firebase Storage is not configured. Please check your .env.local file.',
            variant: 'destructive',
        });
        return;
    }

    setUploading(true);
    const filePath = `profile-pictures/${user.uid}/${photo.name}`;
    const storageRef = ref(storage, filePath);

    try {
      const uploadTask = await uploadBytes(storageRef, photo);
      const newPhotoURL = await getDownloadURL(uploadTask.ref);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
      }

      setPhotoURL(newPhotoURL);
      setPhoto(null);
      toast({
        title: 'Success!',
        description: 'Your profile picture has been updated.',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading settings...</p>
      </main>
    );
  }

  if (!user || isGuest) {
    return null; // Redirect is handled by useEffect
  }
  
  const userInitial = user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5" />;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 pt-8 bg-background">
        <div className="w-full max-w-2xl">
            <Button asChild variant="ghost" className="mb-4 -ml-4">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Library
                </Link>
            </Button>
            <Card className="w-full shadow-lg animate-fade-in">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Settings</CardTitle>
                    <CardDescription>Manage your account settings and preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <h3 className="font-medium text-lg font-headline">Profile Picture</h3>
                        <div className="flex items-center space-x-6">
                            <Avatar className="h-24 w-24 border">
                                <AvatarImage src={photoURL} alt={user.displayName ?? 'User Avatar'} data-ai-hint="user avatar" />
                                <AvatarFallback className="text-3xl">{userInitial}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col space-y-3">
                                <Button asChild variant="outline">
                                    <label htmlFor="photo-upload" className="cursor-pointer">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Choose Photo
                                        <Input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </Button>
                                {photo && (
                                    <Button onClick={handleUpload} disabled={uploading}>
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Uploading...
                                        </>
                                        ) : (
                                        'Save Changes'
                                    )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
