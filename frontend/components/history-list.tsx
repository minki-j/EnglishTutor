"use client";

import { useState } from "react";

import { Entry } from "@/models/Entry";

import { ResultCard } from "./result-card";
import { HistorySkeleton } from "./history-skeleton"; // assuming HistorySkeleton is defined in this file


interface HistoryListProps {
  initialEntries: Entry[];
  isLoading?: boolean;
}

export function HistoryList({ initialEntries, isLoading = false }: HistoryListProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);

  if (isLoading) {
    return <HistorySkeleton />;
  }

  const handleDelete = (id: string) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <ResultCard key={entry.id} entry={entry} onDelete={handleDelete} setEntries={setEntries} />
      ))}
      {entries.length === 0 && (
        <p className="text-muted-foreground">No history found.</p>
      )}
    </div>
  );
}
