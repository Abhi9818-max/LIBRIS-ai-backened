
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Chrome, AlertTriangle, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
    const { user, isGuest, signInWithGoogle, signInAsGuest, loading, isFirebaseConfigured, missingConfigKeys } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (user || isGuest)) {
            router.push('/');
        }
    }, [user, isGuest, loading, router]);

    if (loading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="mt-4 text-lg text-muted-foreground">
                    Authenticating...
                </p>
            </main>
        );
    }
    
    if (user || isGuest) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-sm shadow-lg animate-fade-in">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <BookOpen className="h-9 w-9 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-headline">Welcome to Libris</CardTitle>
                    <CardDescription>Your personal digital library</CardDescription>
                </CardHeader>
                <CardContent>
                    {!isFirebaseConfigured ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Firebase Not Configured</AlertTitle>
                            <AlertDescription>
                                <p>Your app is missing required Firebase credentials.</p>
                                <p className="mt-2">Please create a <code className="font-mono text-sm bg-destructive/20 p-1 rounded">.env.local</code> file in your project root and add the following variables:</p>
                                <ul className="list-disc pl-5 mt-1 text-xs">
                                    {missingConfigKeys.map(key => <li key={key}><code className="font-mono bg-destructive/20 p-1 rounded">{key}</code></li>)}
                                </ul>
                                 <p className="mt-2 text-xs">After updating the file, you must restart your development server. See the developer console for more details.</p>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex flex-col space-y-4">
                            <Button onClick={signInWithGoogle} disabled={loading} className="w-full">
                                <Chrome className="mr-2 h-5 w-5" />
                                Sign in with Google
                            </Button>
                            
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                  Or
                                </span>
                              </div>
                            </div>
                            
                            <Button variant="secondary" onClick={signInAsGuest} disabled={loading} className="w-full">
                                 <UserIcon className="mr-2 h-5 w-5" />
                                 Continue as Guest
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                     <p className="text-center text-xs text-muted-foreground">
                        Sign in to save books across devices, or continue as a guest to try it out.
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
