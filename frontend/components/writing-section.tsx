"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import type { WritingEntry } from "@/types/writingEntry";
import { CorrectionCard } from "./correction-card";

export function WritingSection({ autoFocus = false }: { autoFocus?: boolean }) {
  const [entries, setEntries] = useState<WritingEntry[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { data: session } = useSession();

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const processText = async (
    type: "correction" | "vocabulary" | "breakdown"
  ) => {
    if (!currentText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to analyze",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);
    const backendUrl = process.env.BACKEND_URL;
    const websocket = new WebSocket(backendUrl + "ws/tutor");

    try {
      // Wait for the connection to open
      await new Promise((resolve, reject) => {
        websocket.onopen = resolve;
        websocket.onerror = reject;
      });

      // Set up message handler
      websocket.onmessage = (event) => {
        const response = JSON.parse(event.data);

        if (response.error) {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
            duration: 4000,
          });
          return;
        }

        const newEntry: WritingEntry = {
          input: currentText,
          createdAt: new Date(),
          ...response,
        };

        setEntries((prev) => {
          const existingEntryIndex = prev.findIndex(
            (entry) => entry.id === newEntry.id
          );
          if (existingEntryIndex == -1) {
            return [newEntry, ...prev];
          } else {
            // Update existing entry, preserving original fields
            const updatedEntries = [...prev];
            if (response.correction) {
              updatedEntries[existingEntryIndex] = {
                ...updatedEntries[existingEntryIndex], // Keep existing fields
                corrections: [
                  ...(updatedEntries[existingEntryIndex].corrections || []),
                  response.correction,
                ], // append with new corrections
              };
            } else {
              updatedEntries[existingEntryIndex] = {
                ...updatedEntries[existingEntryIndex],
                ...newEntry,
              };
            }
            return updatedEntries;
          }
        });

        setCurrentText("");
        setIsLoading(false);

        if (response.type === "correction" && response.corrected) {
          navigator.clipboard.writeText(response.corrected);
          toast({
            description: "Corrected text is copied to clipboard",
            duration: 2000,
          });
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
          title: "Error",
          description: "WebSocket connection error",
          variant: "destructive",
          duration: 4000,
        });
        setIsLoading(false);
        websocket.close();
      };

      websocket.send(
        JSON.stringify({
          type: type,
          input: currentText,
          user_id: session?.user?.id,
        })
      );
    } catch (error) {
      setIsLoading(false);
      websocket.close();
      toast({
        title: "Error",
        description: `Failed to ${type}. Please try again.`,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        processText("correction");
      } else if (e.shiftKey) {
        e.preventDefault();
        processText("vocabulary");
      }
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
        <div className="grid grid-cols-3 gap-4">
          <Button
            onClick={() => processText("correction")}
            disabled={isLoading}
            className="text-xs md:text-sm bg-background border border-border text-muted-foreground"
          >
            {isLoading ? (
              "Processing..."
            ) : (
              <span className="flex items-center gap-1">
                Correct Writing
                <span className="hidden md:inline">(⌘+↵)</span>
              </span>
            )}
          </Button>
          <Button
            onClick={() => processText("vocabulary")}
            disabled={isLoading}
            className="text-xs md:text-sm bg-background border border-border text-muted-foreground"
          >
            {isLoading ? (
              "Processing..."
            ) : (
              <span className="flex items-center gap-1">
                Explain Vocabulary
                <span className="hidden md:inline">(⇧+↵)</span>
              </span>
            )}
          </Button>
          <Button
            onClick={() => processText("breakdown")}
            disabled={isLoading}
            className="text-xs md:text-sm bg-background border border-border text-muted-foreground"
          >
            {isLoading ? (
              "Processing..."
            ) : (
              <span className="flex items-center gap-1">
                Break Down
                <span className="hidden md:inline">Sentences</span>
              </span>
            )}
          </Button>
        </div>
      </Card>

      {entries.length > 0 &&
        entries.map((entry) => <CorrectionCard entry={entry} key={entry.id} />)}
    </div>
  );
}
