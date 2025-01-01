"use client";

import { useState } from "react";
import { ResultCard } from "./result-card";
import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";

type Entry = ICorrection | IVocabulary | IBreakdown;

interface HistoryListProps {
  initialEntries: Entry[];
}

export function HistoryList({ initialEntries }: HistoryListProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);

  const handleDelete = (id: string) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <ResultCard key={entry.id} entry={entry} onDelete={handleDelete} />
      ))}
      {entries.length === 0 && (
        <p className="text-muted-foreground">No history found.</p>
      )}
    </div>
  );
}
