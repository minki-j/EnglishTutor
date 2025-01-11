"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";
import { IGeneral } from "@/models/General";
import { Entry } from "@/models/Entry";

import { ResultCard } from "@/components/result-card";
import { HomeInputPanel } from "@/components/home-input-panel";


export default function Home() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<Entry[]>([]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isTemporaryUser = session?.user?.name === "Temporary User";

  if (status === "unauthenticated" && !isTemporaryUser) {
    redirect("/auth/signin");
  }

  const handleDelete = (id: string) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
        <HomeInputPanel setEntries={setEntries} />
        {entries.length > 0 &&
          entries.map((entry) => (
            <ResultCard
              entry={entry}
              onDelete={handleDelete}
              setEntries={setEntries}
              key={entry.id}
            />
          ))}
      </div>
    </div>
  );
}
