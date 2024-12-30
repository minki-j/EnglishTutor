"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import { ResultCard } from "./result-card";

import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";

type Entry = ICorrection | IVocabulary | IBreakdown;

export function WritingSection({ autoFocus = false }: { autoFocus?: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
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
    let websocket: WebSocket;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      // if backendurl is https, use wss, otherwise use ws
      const websocketProtocol = backendUrl?.startsWith("https")
        ? "wss://"
        : "ws://";
      websocket = new WebSocket(
        websocketProtocol + backendUrl?.split("://")[1] + "ws/tutor"
      );
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      toast({
        title: "Error",
        description: "Failed to connect to WebSocket",
        variant: "destructive",
        duration: 4000,
      });
      setIsLoading(false);
      return;
    }

    try {
      // Wait for the connection to open
      await Promise.race([
        new Promise((resolve, reject) => {
          websocket.onopen = resolve;
          websocket.onerror = reject;
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 5000)
        ),
      ]);

      // Set up message handler
      websocket.onmessage = (event) => {
        const response = JSON.parse(event.data);
        console.log("======= response =======\n", response);

        if (response.error) {
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
            duration: 4000,
          });
          setIsLoading(false);
          return;
        }

        setEntries((prev: Entry[]) => {
          const existingEntryIndex = prev.findIndex(
            (entry) => entry.id === response.id
          );

          if (existingEntryIndex == -1) {
            return [
              {
                id: response.id.toString(),
                input: currentText,
                createdAt: new Date(),
                ...response,
              } as Entry,
              ...prev,
            ];
          } else {
            // prev is immutable, so we need to create a new array
            const updatedEntries = [...prev];

            // Update existing entry, preserving original fields
            if (response.type === "correction") {
              const correctionEntry = updatedEntries[
                existingEntryIndex
              ] as ICorrection;
              updatedEntries[existingEntryIndex] = {
                ...correctionEntry,
                corrections: [
                  ...(correctionEntry.corrections || []),
                  response.correction,
                ],
              } as ICorrection;
            } else if (response.type === "vocabulary") {
              updatedEntries[existingEntryIndex] = {
                ...(updatedEntries[existingEntryIndex] as IVocabulary),
                ...response,
              } as IVocabulary;
            } else if (response.type === "breakdown") {
              updatedEntries[existingEntryIndex] = {
                ...(updatedEntries[existingEntryIndex] as IBreakdown),
                ...response,
              } as IBreakdown;
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
          user_id: session?.user?.id || "temporary_user",
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
        entries.map((entry) => <ResultCard entry={entry} key={entry.id} />)}
    </div>
  );
}
