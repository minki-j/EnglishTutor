"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PenLine } from "lucide-react";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function SignIn() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const createTemporaryUser = async () => {
    await update({
      user: true,
    });
    
    toast({
      variant: "destructive",
      title: "Using Temporary Account",
      description: "Your usage history won't be saved. Sign in with Google to save your progress.",
      duration: 5000,
    });
    router.push("/");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <PenLine className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to EnglishTutor</h1>
          <p className="text-muted-foreground">
            Sign in to start improving your English writing skills with
            AI-powered corrections and personalized quizzes.
          </p>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => signIn("google")}
            >
              Sign in with Google
            </Button>
            <Button
              className="w-full bg-secondary text-secondary-foreground hover:text-secondary"
              onClick={() => signIn("temporary")}
              // onClick={() => createTemporaryUser()}
            >
              Try first without sign in
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}