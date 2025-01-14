"use client";

import { Trash2, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useState, useRef, useEffect, useMemo } from "react";

import { Entry } from "@/models/Entry";
import { EntryType } from "@/models/EntryType";
import { IGeneral } from "@/models/General";
import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";

import { CardContentCorrection } from "./card-content-correction";
import { CardContentVocabulary } from "./card-content-vocabulary";
import { CardContentBreakdown } from "./card-content-breakdown";
import { CardContentGeneral } from "./card-content-general";

type Props = {
  entry: Entry;
  onDelete?: (id: string) => void;
  setEntries?: React.Dispatch<React.SetStateAction<Entry[]>>;
};

export function ResultCard({ entry, onDelete, setEntries }: Props) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: "Text copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      toast({
        description: "Failed to copy text to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/results/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete correction");
      }

      toast({
        description: "Correction deleted successfully",
        duration: 2000,
      });

      // Call the onDelete callback to update parent state
      onDelete?.(id);
    } catch (error) {
      console.error("Error deleting correction:", error);
      toast({
        description: "Failed to delete correction",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cardContent = (entry: Entry) => {
    if (entry.type === EntryType.CORRECTION) {
      return (
        <CardContentCorrection
          entry={entry as ICorrection}
          copyToClipboard={copyToClipboard}
        />
      );
    } else if (entry.type === EntryType.VOCABULARY) {
      return (
        <CardContentVocabulary
          entry={entry as IVocabulary}
          copyToClipboard={copyToClipboard}
        />
      );
    } else if (entry.type === EntryType.BREAKDOWN) {
      return (
        <CardContentBreakdown entry={entry as IBreakdown} copyToClipboard={copyToClipboard} />
      );
    } else if (entry.type === EntryType.GENERAL) {
      return (
        <CardContentGeneral entry={entry as IGeneral} copyToClipboard={copyToClipboard} />
      );
    } else {
      throw new Error("Invalid entry type " + entry.type);
    }
  };

  async function askFollowUpQuestion(formData: FormData) {
    if (!setEntries) {
      throw new Error("setEntries is undefined");
    }
    const question = formData.get("question") as string;
    const { id, type, userId, createdAt, input, ...context } = entry;
    const contextJson = JSON.stringify(context);

    const res = await fetch(
      new URL(
        `further-questions?user_id=${userId}`,
        process.env.NEXT_PUBLIC_BACKEND_URL
      ).toString(),
      {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          resultId: id,
          type: type,
          question: question,
          input: input,
          context: contextJson,
        }),
      }
    );
    if (!res.ok) {
      throw new Error("Failed to ask follow-up question");
    }

    setEntries((prev: Entry[]) => {
      return prev.map((entry) => {
        if (entry.id === id) {
          return {
            ...entry,
            extraQuestions: [
              ...(entry.extraQuestions || []),
              { question: question, answer: "" },
            ],
          };
        }
        return entry;
      });
    });

    textareaRef.current!.value = "";

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    let fullResponse = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;

        setEntries((prev: Entry[]) => {
          return prev.map((entry) => {
            if (entry.id === id) {
              entry.extraQuestions[entry.extraQuestions.length - 1] = {
                question,
                answer: fullResponse,
              };
              return entry;
            } else {
              return entry;
            }
          });
        });
      }
    } finally {
      reader.releaseLock();
    }
  }

  const getBackgroundColor = () => {
    switch (entry.type) {
      case EntryType.CORRECTION:
        return "bg-[hsl(var(--chart-1)_/_0.1)]";
      case EntryType.VOCABULARY:
        return "bg-[hsl(var(--chart-2)_/_0.1)]";
      case EntryType.BREAKDOWN:
        return "bg-[hsl(var(--chart-4)_/_0.1)]";
      case EntryType.GENERAL:
        return "bg-[hsl(var(--chart-5)_/_0.1)]";
      default:
        return "bg-none";
    }
  };

  return (
    <Card
      className={`p-6 relative ${getBackgroundColor()}`}
    >
      <div className="flex justify-between items-stretch">
        <div className="flex-[0.95] flex flex-col space-y-6 ">
          {cardContent(entry)}
          <form
            action={askFollowUpQuestion}
            className="flex gap-2 items-center"
          >
            <Textarea
              ref={textareaRef}
              placeholder="Got more questions?"
              className="min-h-[30px] overflow-hidden"
              name="question"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.metaKey || e.ctrlKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              onChange={(e) => {
                const textarea = e.target;
                textarea.style.height = "auto";
                textarea.style.height = `${textarea.scrollHeight}px`;
              }}
            />
            <Button className="h-full" type="submit" variant={"outline"}>
              Ask
            </Button>
          </form>
        </div>
        <div className="flex-[0.05] flex flex-col justify-between items-end">
          <span className="text-xs text-muted-foreground text-right whitespace-nowrap overflow-x-auto">
            {entry.createdAt
              ? entry.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "No date"}
          </span>
          <button
            onClick={() => handleDelete(entry.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-5 -m-5 disabled:cursor-not-allowed"
            aria-label="Delete correction"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}
