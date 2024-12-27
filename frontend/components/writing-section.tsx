"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CorrectionCard } from "./correction-card";
import type { WritingEntry } from "@/types/writingEntry";
import { useSession } from "next-auth/react";
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

  const processText = async (type: 'correction' | 'vocabulary' | 'breakdown') => {
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
    const websocket = new WebSocket('ws://localhost:8000/ws/tutor');

    try {
      // Wait for the connection to open
      await new Promise((resolve, reject) => {
        websocket.onopen = resolve;
        websocket.onerror = reject;
      });

      // Set up message handler
      websocket.onmessage = (event) => {
        console.log("==>> onmessage: ", event.data);
        const response = JSON.parse(event.data);
        
        const newEntry: WritingEntry = {
          id: Date.now().toString(),
          type: response.type,
          original: currentText,
          ...response.data,
          createdAt: new Date(),
        };

        setEntries(prev => [newEntry, ...prev]);
        setCurrentText("");
        setIsLoading(false);

        if (response.type === 'correction' && response.data.corrected) {
          navigator.clipboard.writeText(response.data.corrected);
          toast({
            description: "Corrected text is copied to clipboard",
            duration: 2000,
          });
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Error",
          description: "WebSocket connection error",
          variant: "destructive",
          duration: 4000,
        });
        setIsLoading(false);
        websocket.close();
      };

      // Send the message
      websocket.send(JSON.stringify({
        action: type,
        input: currentText,
        user_id: session?.user?.id,
      }));

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
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        processText('correction');
      } else if (e.shiftKey) {
        e.preventDefault();
        processText('vocabulary');
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

      {entries.length > 0 && entries.map((entry) => (
        <CorrectionCard entry={entry} key={entry.id} />
      ))}
    </div>
  );
}
