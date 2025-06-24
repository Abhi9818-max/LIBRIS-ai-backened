
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User as UserIcon, ArrowLeft, Upload, Save } from 'lucide-react';
import Link from 'next/link';

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function SettingsPage() {
  const { user, loading: authLoading, updateGuestPhoto } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      setPhotoPreview(user.photoURL);
    }
  }, [user, authLoading]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedPhoto(file);
      try {
        const previewUrl = await readFileAsDataURL(file);
        setPhotoPreview(previewUrl);
      } catch (error) {
        console.error("Error reading file for preview:", error);
        toast({
          title: "Preview Error",
          description: "Could not display a preview for the selected image.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!photoPreview || !selectedPhoto) {
        toast({
            title: 'No Changes',
            description: 'Please choose a photo first.',
        });
        return;
    }

    setIsSaving(true);
    // The photoPreview is already a data URI from handleFileChange
    updateGuestPhoto(photoPreview);
    // The AuthContext will show a toast on success/failure.
    setSelectedPhoto(null); // Reset after saving
    setIsSaving(false);
  };
  
  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading settings...</p>
      </main>
    );
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
                                {photoPreview && <AvatarImage src={photoPreview} alt={user.displayName ?? 'User Avatar'} data-ai-hint="user avatar" />}
                                <AvatarFallback className="text-3xl">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col space-y-3">
                                <Button asChild variant="outline">
                                    <label htmlFor="photo-upload" className="cursor-pointer">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Choose Photo
                                        <Input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </Button>
                                {selectedPhoto && (
                                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                        ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
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
