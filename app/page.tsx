"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { WritingSection } from "@/components/writing-section";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();


  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <WritingSection />
    </div>
  );
}