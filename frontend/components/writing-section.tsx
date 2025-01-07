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
import MDEditor from "@uiw/react-md-editor";

type Entry = ICorrection | IVocabulary | IBreakdown;

export function WritingSection({ autoFocus = true }: { autoFocus?: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentText, setCurrentText] = useState("");
  const { toast } = useToast();
  const { data: session } = useSession();

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

  const connectWebSocket = (type: "correction" | "vocabulary" | "breakdown") => {
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
      console.log("response: ", response);

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
        // find the index of the entry that we are populating now
        const existingEntryIndex = prev.findIndex(
          (entry) => entry.id === response.id || entry.id === "default_entry_id"
        );

        // if default entry, just update with response
        if (prev[existingEntryIndex].id === "default_entry_id") {
          return prev.map((entry, index) =>
            index === existingEntryIndex ? { ...entry, ...response } : entry
          );
        } else {
          // if not default entry, update with specific logic for each type
          const updatedEntries = updateEntryLogic(prev, response);
          return updatedEntries;
        }
      });
    };
  };

  const genericProcess = async (
    type: "correction" | "vocabulary" | "breakdown",
    correctionEntryUpdateLogic: (prev: Entry[], response: any) => Entry[]
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

      assignOnMessageHanlder(websocket, correctionEntryUpdateLogic);

      setCurrentText("");

      websocket.send(
        JSON.stringify({
          type: type,
          input: currentText,
          user_id: session?.user?.id || "temporary_user",
        })
      );
    } catch (error) {
      console.log("WebSocket close at catch");
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
    const correctionEntry = updatedEntries[existingEntryIndex] as ICorrection;
    updatedEntries[existingEntryIndex] = {
      ...correctionEntry,
      corrections: [
        ...(correctionEntry.corrections || []),
        response.correction,
      ],
    } as ICorrection;
    return updatedEntries;
  };

  const vocabularyEntryUpdateLogic = (prev: Entry[], response: any) => {
    const existingEntryIndex = findEntryIndexById(prev, response.id);
    const updatedEntries = [...prev];
    updatedEntries[existingEntryIndex] = {
      ...(updatedEntries[existingEntryIndex] as IVocabulary),
      examples: [
        ...((updatedEntries[existingEntryIndex] as IVocabulary).examples || []),
        response.example,
      ],
    } as IVocabulary;
    return updatedEntries;
  };

  const breakdownEntryUpdateLogic = (prev: Entry[], response: any) => {
    const existingEntryIndex = findEntryIndexById(prev, response.id);
    const updatedEntries = [...prev];
    updatedEntries[existingEntryIndex] = {
      ...(updatedEntries[existingEntryIndex] as IBreakdown),
      breakdown:
        ((updatedEntries[existingEntryIndex] as IBreakdown).breakdown || "") +
        response.breakdown,
    } as IBreakdown;
    return updatedEntries;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <MDEditor
          value={currentText}
          onChange={(value) => setCurrentText(value || "")}
          preview="edit"
          hideToolbar={true}
          height="100%"
          className="mb-4 min-h-[200px]"
          textareaProps={{
            placeholder: "",
            onKeyDown: handleKeyDown,
            autoFocus: autoFocus,
            style: { height: "100%" },
          }}
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
        entries.map((entry) => <ResultCard entry={entry} key={entry.id} />)}
    </div>
  );
}
