"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { Card } from "./ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { WritingEntry } from "@/types/writingEntry";

interface CorrectionCardProps {
  entry: WritingEntry;
}

export function CorrectionCard({ entry }: CorrectionCardProps) {
  const { toast } = useToast();

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
    try {
      const response = await fetch(`/api/corrections/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete correction");
      }

      window.location.reload();
      toast({
        description: "Correction deleted successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error deleting correction:", error);
    }
  };

  return (
    <Card className={`p-6 relative`}>
      <div className="flex justify-between items-stretch">
        <div className="space-y-4 flex-[0.9]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Original
              </h3>
              <div
                className="group relative cursor-pointer hover:bg-muted/50 rounded-sm p-1 -m-1"
                onClick={() => copyToClipboard(entry.input)}
              >
                <p className="text-foreground pr-8">{entry.input}</p>
                <div className="absolute right-2 top-2">
                  <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              Corrected
            </h3>
            <div
              className="group relative cursor-pointer hover:bg-muted/50 rounded-sm p-1 -m-1"
              onClick={() => copyToClipboard(entry.corrected ?? '')}
            >
              <p className="text-foreground pr-8">{entry.corrected ?? ''}</p>
              <div className="absolute right-2 top-2">
                <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          {entry.corrections?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Explanations
              </h3>
              <div className="group relative cursor-pointer hover:bg-muted/50 rounded-sm p-1 -m-1">
                <ul
                  className="list-disc pl-4 space-y-1"
                  onClick={() =>
                    copyToClipboard(
                      "Original: " +
                        entry.input +
                        "\n\n" +
                        "Corrected: " +
                        entry.corrected +
                        "\n\n" +
                        entry.corrections
                          .map(
                            (correction) =>
                              "- " +
                              correction.correction +
                              "\n" +
                              correction.explanation
                          )
                          .join("\n")
                    )
                  }
                >
                  {entry.corrections.map((correction, index) => (
                    <li key={index}>
                      <div className="pr-8">
                        <p className="font-medium">{correction.correction}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {correction.explanation}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="absolute right-2 top-2">
                  <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-[0.1] flex flex-col justify-between items-end">
          <span className="text-xs text-muted-foreground">
            {entry.createdAt
              ? entry.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "No date"}
          </span>
          <button
            onClick={() => handleDelete(entry.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-5 -m-5"
            aria-label="Delete correction"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
