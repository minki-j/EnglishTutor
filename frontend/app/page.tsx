"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { WritingSection } from "@/components/writing-section";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import { ResultCard } from "@/components/result-card";

import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";


type Entry = ICorrection | IVocabulary | IBreakdown;

export default function Home() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentText, setCurrentText] = useState("");
  const { toast } = useToast();

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


  const set_default_entry = (
    type: "correction" | "vocabulary" | "breakdown"
  ) => {
    setEntries((prev: Entry[]) => {
      return [
        {
          id: "default_entry_id",
          input: currentText,
          createdAt: new Date(),
          type: type,
        } as Entry,
        ...prev,
      ];
    });
  };

  const connectWebSocket = (
    type: "correction" | "vocabulary" | "breakdown"
  ) => {
    let websocket: WebSocket;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("Backend URL is not configured");
      }
      const backendUrlObj = new URL(backendUrl);
      const wsProtocol = backendUrlObj.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = new URL(`ws/${type}`, backendUrlObj.href);
      wsUrl.protocol = wsProtocol;

      websocket = new WebSocket(wsUrl.toString());

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
          title: "Connection Error",
          description: "WebSocket connection failed",
          variant: "destructive",
          duration: 4000,
        });
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      toast({
        title: "Error",
        description: "Failed to connect to WebSocket",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    return websocket;
  };

  const assignOnMessageHanlder = async (
    websocket: WebSocket,
    updateEntryLogic: (prev: Entry[], response: any) => Entry[]
  ) => {
    websocket.onmessage = async (event) => {
      const response = JSON.parse(event.data);

      if (response.error) {
        // remove default entry when there is an error
        setEntries((prev: Entry[]) => {
          return prev.filter(
            (entry) =>
              entry.id !== "default_entry_id" || entry.id === response.id
          );
        });
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      setEntries((prev: Entry[]) => {
        return updateEntryLogic(prev, response);
      });
    };
  };

  const genericProcess = async (
    type: "correction" | "vocabulary" | "breakdown",
    entryUpdateLogic: (prev: Entry[], response: any) => Entry[]
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

    const websocket = connectWebSocket(type);
    if (!websocket) {
      return;
    }

    try {
      set_default_entry(type);
      setCurrentText("");
      await Promise.race([
        new Promise((resolve, reject) => {
          websocket.onopen = resolve;
          websocket.onerror = reject;
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("WebSocket Connection timeout")),
            5000
          )
        ),
      ]);

      assignOnMessageHanlder(websocket, entryUpdateLogic);

      setCurrentText("");

      websocket.send(
        JSON.stringify({
          input: currentText,
          user_id: session?.user?.id || "temporary_user",
        })
      );
    } catch (error) {
      if (websocket.readyState !== WebSocket.CLOSED) {
        websocket.close();
      }
      toast({
        title: "Error",
        description: `${error}`,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const findEntryIndexById = (prev: Entry[], id: string) => {
    return prev.findIndex(
      (entry) => entry.id === id || entry.id === "default_entry_id"
    );
  };

  const correctionEntryUpdateLogic = (prev: Entry[], response: any) => {
    const existingEntryIndex = findEntryIndexById(prev, response.id);
    const updatedEntries = [...prev];
    const existingEntry = updatedEntries[existingEntryIndex] as ICorrection;

    let updates = { ...existingEntry };
    for (const [key, value] of Object.entries(response)) {
      if (key === "correction") {
        updates = {
          ...updates,
          corrections: [...(updates.corrections || []), response.correction],
        };
      } else {
        updates = {
          ...updates,
          [key]: value,
        };
      }
      if (key === "correctedText") {
        navigator.clipboard.writeText(response.correctedText).then(() => {
          toast({
            title: "Copied",
            description: "Copied corrected to clipboard",
            variant: "default",
            duration: 2000,
          });
        });
      }
    }
    updatedEntries[existingEntryIndex] = updates as ICorrection;
    return updatedEntries;
  };

  const vocabularyEntryUpdateLogic = (prev: Entry[], response: any) => {
    const existingEntryIndex = findEntryIndexById(prev, response.id);
    const updatedEntries = [...prev];
    const existingEntry = updatedEntries[existingEntryIndex] as IVocabulary;

    let updates = { ...existingEntry };
    for (const [key, value] of Object.entries(response)) {
      if (key === "example") {
        updates = {
          ...updates,
          examples: [...(updates.examples || []), response.example],
        };
      } else {
        updates = {
          ...updates,
          [key]: value,
        };
      }
    }

    updatedEntries[existingEntryIndex] = updates as IVocabulary;
    return updatedEntries;
  };

  const breakdownEntryUpdateLogic = (prev: Entry[], response: any) => {
    const existingEntryIndex = findEntryIndexById(prev, response.id);
    const updatedEntries = [...prev];
    const existingEntry = updatedEntries[existingEntryIndex] as IBreakdown;

    let updates = { ...existingEntry };
    for (const [key, value] of Object.entries(response)) {
      if (key === "breakdown") {
        updates = {
          ...updates,
          breakdown: (updates.breakdown || "") + response.breakdown,
        };
      } else if (key === "paraphrase") {
        updates = {
          ...updates,
          paraphrase: (updates.paraphrase || "") + response.paraphrase,
        };
      } else {
        updates = {
          ...updates,
          [key]: value,
        };
      }
    }
    updatedEntries[existingEntryIndex] = updates as IBreakdown;
    return updatedEntries;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        genericProcess("correction", correctionEntryUpdateLogic);
      } else if (e.shiftKey) {
        e.preventDefault();
        genericProcess("vocabulary", vocabularyEntryUpdateLogic);
      } else if (e.altKey) {
        e.preventDefault();
        genericProcess("breakdown", breakdownEntryUpdateLogic);
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText =
        currentText.substring(0, start) +
        "**" +
        currentText.substring(start, end) +
        "**" +
        currentText.substring(end);

      setCurrentText(newText);

      // Restore selection after the update
      setTimeout(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = end + 2;
      }, 0);
    }
  };

  const handleDelete = (id: string) => {
    setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id));
  };

  const generateInputPlaceholder = () => {
    const placeholders: string[] = [
      "What’s on your mind to learn today?",
      "Mistakes are stepping stones to success—dare to learn!",
      "Every step you take brings growth—keep going strong!",
      "Curious minds grow faster—what’s your answer?",
      "Your journey to fluency starts here—type your response!",
      "Every word you write brings you closer to mastery—give it a try!",
      "Challenge yourself—what’s your take on this?",
      "Practice makes perfect—start typing now!",
      "Learning happens one word at a time—share your thoughts!",
      "Let your English skills shine—what’s your answer?",
      "Small efforts lead to big progress—type away!",
      "It’s okay to make mistakes—they help you improve!",
      "What’s your perspective? Let’s hear it!",
      "Stay curious and keep practicing—what’s your response?",
      "Take a deep breath, and show your best English!",
      "Think, type, and grow—what’s your answer today?",
      "Ready to express yourself? Start typing!",
    ];
    return placeholders[Math.floor(Math.random() * placeholders.length)];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
        <Card className="p-6">
          <Textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            className="mb-4 min-h-[100px] text-lg"
            placeholder={generateInputPlaceholder()}
            onKeyDown={handleKeyDown}
            autoFocus={true}
          />
          <div className="grid grid-cols-3 gap-4">
            <Button
              onClick={() =>
                genericProcess("correction", correctionEntryUpdateLogic)
              }
              className="text-xs md:text-sm"
              variant="outline"
            >
              <div>
                <span className="md:hidden">Correct</span>
                <span className="hidden md:inline-flex items-center gap-1">
                  Correct Writing
                  <span>(⌘+↵)</span>
                </span>
              </div>
            </Button>
            <Button
              onClick={() =>
                genericProcess("vocabulary", vocabularyEntryUpdateLogic)
              }
              className="text-xs md:text-sm"
              variant="outline"
            >
              <div>
                <span className="md:hidden">Vocab</span>
                <span className="hidden md:inline-flex items-center gap-1">
                  Explain Vocabulary
                  <span>(⇧+↵)</span>
                </span>
              </div>
            </Button>
            <Button
              onClick={() =>
                genericProcess("breakdown", breakdownEntryUpdateLogic)
              }
              className="text-xs md:text-sm"
              variant="outline"
            >
              <span className="flex items-center gap-1">
                Explain
                <span className="hidden md:inline">Sentences</span>
                <span>(⌥+↵)</span>
              </span>
            </Button>
          </div>
        </Card>

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
