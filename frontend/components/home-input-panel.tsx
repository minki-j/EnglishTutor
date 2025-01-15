"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ClipboardPasteIcon } from "@/components/icons/clipboard-paste-icon";

import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";
import { IGeneral } from "@/models/General";
import { Entry } from "@/models/Entry";
import { EntryType } from "@/models/EntryType";

const placeholders: string[] = [
  "What's on your mind to learn today?",
  "Mistakes are stepping stones to success—dare to learn!",
  "Every step you take brings growth—keep going strong!",
  "Curious minds grow faster—what's your answer?",
  "Your journey to fluency starts here—type your response!",
  "Every word you write brings you closer to mastery—give it a try!",
  "Challenge yourself—what's your take on this?",
  "Practice makes perfect—start typing now!",
  "Learning happens one word at a time—share your thoughts!",
  "Let your English skills shine—what's your answer?",
  "Small efforts lead to big progress—type away!",
  "It's okay to make mistakes—they help you improve!",
  "What's your perspective? Let's hear it!",
  "Stay curious and keep practicing—what's your response?",
  "Take a deep breath, and show your best English!",
  "Think, type, and grow—what's your answer today?",
  "Ready to express yourself? Start typing!",
];

export const HomeInputPanel = ({
  setEntries,
}: {
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
}) => {
  const { data: session, status } = useSession();
  const [currentText, setCurrentText] = useState("");
  const [placeholder, setPlaceholder] = useState<string>("");
  const { toast } = useToast();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const set_default_entry = (input_text: string, type: EntryType) => {
    setEntries((prev: Entry[]) => {
      return [
        {
          id: "default_entry_id",
          input: input_text,
          createdAt: new Date(),
          type: type,
        } as Entry,
        ...prev,
      ];
    });
  };

  const remove_default_entry = () => {
    setEntries((prev: Entry[]) => {
      return prev.filter((entry) => entry.id !== "default_entry_id");
    });
  };

  const connectWebSocket = (type: EntryType) => {
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
      wsUrl.searchParams.set("user_id", session?.user?.id || "");

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
      // console.log("WebSocket response: ", response);
      
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
    type: EntryType,
    entryUpdateLogic: (prev: Entry[], response: any) => Entry[]
  ) => {
    let input_text = currentText;
    
    if (!currentText.trim()) {
      // When input is empty, try to read from clipboard
      try {
        const clipboardText = await navigator.clipboard.readText();
        input_text = clipboardText;
      } catch (clipboardError) {
        console.error("Clipboard access not available:", clipboardError);
      }
      
      if (!input_text) {
        toast({
          title: "Error",
          description: "Please enter some text to analyze",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // This logic is for Apple Books app users. 
      // When they copy text from the app, it has this format:
      // This logic will extract the text and remove the `formatting`.
      if (input_text.includes(`”\n\nExcerpt From`)) {
        input_text = input_text.split(`”\n\nExcerpt From`)[0].slice(1);
      }
    }

    const websocket = connectWebSocket(type);
    if (!websocket) {
      return;
    }

    try {
      set_default_entry(input_text,type);
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
          input: input_text,
          user_id: session?.user?.id || "temporary_user",
        })
      );
    } catch (error: any) {
      if (websocket.readyState !== WebSocket.CLOSED) {
        websocket.close();
      }
      toast({
        title: "Error",
        description: `${
          error.message ? error.message : "Sorry something went wrong"
        }`,
        variant: "destructive",
        duration: 4000,
      });
      remove_default_entry();
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
      if (key === "examples") {
        updates = {
          ...updates,
          examples: response.examples,
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

  const generalEntryUpdateLogic = (prev: Entry[], response: any) => {
    const existingEntryIndex = findEntryIndexById(prev, response.id);
    const updatedEntries = [...prev];
    const existingEntry = updatedEntries[existingEntryIndex] as IGeneral;

    let updates = { ...existingEntry };
    for (const [key, value] of Object.entries(response)) {
      if (key === "answer") {
        updates = {
          ...updates,
          answer: (updates.answer || "") + response.answer,
        };
      } else {
        updates = {
          ...updates,
          [key]: value,
        };
      }
    }

    updatedEntries[existingEntryIndex] = updates as IGeneral;
    return updatedEntries;
  };

  const adjustTextAreaHeight = (textArea: HTMLTextAreaElement) => {
    textArea.style.height = 'auto';
    textArea.style.height = `${textArea.scrollHeight}px`;
  };

  useEffect(() => {
    if (textAreaRef.current && currentText) {
      adjustTextAreaHeight(textAreaRef.current);
    }
  }, [currentText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        genericProcess(EntryType.CORRECTION, correctionEntryUpdateLogic);
      } else if (e.shiftKey) {
        e.preventDefault();
        genericProcess(EntryType.VOCABULARY, vocabularyEntryUpdateLogic);
      } else if (e.altKey) {
        e.preventDefault();
        genericProcess(EntryType.BREAKDOWN, breakdownEntryUpdateLogic);
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

  const randomPlaceholder = useMemo(() => {
    const now = new Date();
    const day = now.getDate() + now.getMonth() * 31 + now.getFullYear() * 365;
    return placeholders[day % placeholders.length];
  }, []);

  useEffect(() => {
    setPlaceholder(randomPlaceholder);
  }, [randomPlaceholder]);

  return (
    <Card className="p-6">
      <div className="relative">
        <Textarea
          ref={textAreaRef}
          value={currentText}
          onChange={(e) => {
            setCurrentText(e.target.value);
          }}
          className="mb-4 min-h-[150px] text-lg overflow-hidden resize-none"
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          autoFocus={true}
        />
        {!currentText && (
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 bottom-2 opacity-80"
            onClick={async () => {
              try {
                let text = await navigator.clipboard.readText();

                // This logic is for Apple Books app users.
                // When they copy text from the app, it has this format:
                // This logic will extract the text and remove the `formatting`.
                if (text.includes(`”\n\nExcerpt From`)) {
                  text = text.split(`”\n\nExcerpt From`)[0].slice(1);
                }
                setCurrentText(text);
              } catch (error) {
                console.error("Failed to read clipboard:", error);
              }
            }}
          >
            <ClipboardPasteIcon className="h-4 w-4 mr-2" />
            Paste
          </Button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Button
          onClick={() =>
            genericProcess(EntryType.CORRECTION, correctionEntryUpdateLogic)
          }
          className="text-xs lg:text-sm"
          variant="outline"
        >
          <div>
            <span className="lg:hidden">Correct</span>
            <span className="hidden lg:inline-flex items-center gap-1">
              Correct Writing
              <span>(⌘+↵)</span>
            </span>
          </div>
        </Button>
        <Button
          onClick={() =>
            genericProcess(EntryType.VOCABULARY, vocabularyEntryUpdateLogic)
          }
          className="text-xs lg:text-sm"
          variant="outline"
        >
          <div>
            <span className="lg:hidden">Vocab</span>
            <span className="hidden lg:inline-flex items-center gap-1">
              Explain Vocabulary
              <span>(⇧+↵)</span>
            </span>
          </div>
        </Button>
        <Button
          onClick={() =>
            genericProcess(EntryType.BREAKDOWN, breakdownEntryUpdateLogic)
          }
          className="text-xs lg:text-sm"
          variant="outline"
        >
          <span className="flex items-center gap-1">
            Explain
            <span className="hidden lg:inline">
              Sentences<span>(⌥+↵)</span>
            </span>
          </span>
        </Button>
        <Button
          onClick={() =>
            genericProcess(EntryType.GENERAL, generalEntryUpdateLogic)
          }
          className="text-xs lg:text-sm"
          variant="outline"
        >
          <div>
            <span className="hidden lg:inline-flex items-center gap-1">
              General Question
            </span>
            <span className="lg:hidden">General</span>
          </div>
        </Button>
      </div>
    </Card>
  );
};
