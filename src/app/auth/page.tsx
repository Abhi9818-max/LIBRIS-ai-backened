
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
    const { loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Once the auth state is loaded, we are always a "guest" in this app version.
        // So, we can redirect to the home page.
        if (!loading) {
            router.push('/');
        }
    }, [loading, router]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">
                Loading...
            </p>
        </main>
    );
}
