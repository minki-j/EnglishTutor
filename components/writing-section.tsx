"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CorrectionCard } from "./correction-card";

interface WritingEntry {
  id: string;
  original: string;
  corrected: string;
  corrections: {
    correction: string;
    explanation: string;
  }[];
  createdAt: Date;
}

interface WritingSectionProps {
  autoFocus?: boolean;
}

export function WritingSection({ autoFocus = false }: WritingSectionProps) {
  const [entries, setEntries] = useState<WritingEntry[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const correctWriting = async () => {
    if (!currentText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to check",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/check-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText }),
      });

      if (!response.ok) throw new Error("Failed to check writing");

      const data = await response.json();
      const newEntry: WritingEntry = {
        id: Date.now().toString(),
        original: currentText,
        corrected: data.corrected,
        corrections: data.corrections,
        createdAt: new Date(),
      };

      setEntries([newEntry, ...entries]);
      setCurrentText("");
      
      await navigator.clipboard.writeText(data.corrected);
      toast({
        description: "Corrected text is copied to clipboard",
        duration: 2000,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check writing. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      correctWriting();
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <Textarea
          ref={textareaRef}
          placeholder="Enter your text here..."
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[200px] mb-4 text-lg"
          disabled={isLoading}
          autoFocus={autoFocus}
        />
        <Button onClick={correctWriting} disabled={isLoading} className="w-full">
          {isLoading ? "Checking..." : "Correct My Writing (Cmd+Enter)"}
        </Button>
      </Card>

      {entries.map((entry) => (
        <CorrectionCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
