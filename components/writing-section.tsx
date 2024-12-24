"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface WritingEntry {
  id: string;
  original: string;
  corrected: string;
  corrections: {
    correction: string;
    explanation: string;
  }[];
}

export function WritingSection() {
  const [entries, setEntries] = useState<WritingEntry[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const checkWriting = async () => {
    if (!currentText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to check",
        variant: "destructive",
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
      };

      setEntries([newEntry, ...entries]);
      setCurrentText("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check writing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <Textarea
          placeholder="Enter your text here..."
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          className="min-h-[200px] mb-4"
        />
        <Button
          onClick={checkWriting}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Checking..." : "Check My Writing"}
        </Button>
      </Card>

      {entries.map((entry) => (
        <Card key={entry.id} className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Original Text</h3>
              <p className="text-foreground">{entry.original}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Corrected Version</h3>
              <p className="text-foreground">{entry.corrected}</p>
            </div>
            {entry.corrections.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Corrections</h3>
                <ul className="list-disc pl-4 space-y-4">
                  {entry.corrections.map((correction, index) => (
                    <li key={index} className="text-foreground">
                      <p className="font-medium">{correction.correction}</p>
                      <p className="text-sm text-muted-foreground mt-1">{correction.explanation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}