"use client";

import { useSession } from "next-auth/react";
import { WritingSection } from "@/components/writing-section";
import { redirect } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const isTemporaryUser = sessionStorage.getItem("temporary_user") === "true";

  if (status === "unauthenticated" && !isTemporaryUser) {
    redirect("/auth/signin");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <WritingSection autoFocus={true} />
    </div>
  );
}
