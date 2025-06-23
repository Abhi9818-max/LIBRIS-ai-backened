"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Chrome, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
    const { user, signInWithGoogle, loading, isFirebaseConfigured } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="mt-4 text-lg font-headline text-muted-foreground">Loading authentication...</p>
            </main>
        );
    }
    
    if (user) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-sm shadow-xl">
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
                                Please set up your <code className="font-mono text-sm bg-destructive/20 p-1 rounded">.env.local</code> file to use authentication. See the console for details.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex flex-col space-y-4">
                            <Button onClick={signInWithGoogle} disabled={loading}>
                                <Chrome className="mr-2 h-5 w-5" />
                                Sign in with Google
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                     <p className="text-center text-xs text-muted-foreground">
                        Sign in to save your books, track progress, and access your library from anywhere.
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
