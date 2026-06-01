"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth";

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (!mounted) return null;
  if (isAuthenticated()) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="mx-auto w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/trikal-logo.svg"
            alt="Trikal"
            width={80}
            height={38}
            priority
          />
          <div className="space-y-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your Trikal account to continue
            </p>
          </div>
        </div>

        <Button asChild className="w-full" size="lg">
          <a href="/api/v1/auth/login">Sign in with Trishul IAM</a>
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <span className="underline underline-offset-4 cursor-pointer hover:text-primary">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="underline underline-offset-4 cursor-pointer hover:text-primary">
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
