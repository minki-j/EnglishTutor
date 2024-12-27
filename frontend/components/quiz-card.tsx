"use client";

import { Check, Copy } from "lucide-react";
import { Card } from "./ui/card";
import { useToast } from "@/components/ui/use-toast";

interface Correction {
  id: string;
  input: string;
  corrected: string;
  corrections: {
    correction: string;
    explanation: string;
  }[];
}

interface CorrectionCardProps {
  entry: Correction;
  key?: string;
}

export function CorrectionCard({ entry, key }: CorrectionCardProps) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    console.log("copying to clipboard");

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

  return (
    <Card className="p-6" key={key}>
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            Original
          </h3>
          <p className="text-foreground">{entry.input}</p>
        </div>
        <div className="relative">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            Corrected
          </h3>
          <div
            className="group relative cursor-pointer hover:bg-muted/50 rounded-sm p-1 -m-1"
            onClick={() => copyToClipboard(entry.corrected)}
          >
            <p className="text-foreground pr-8">{entry.corrected}</p>
            <div className="absolute right-2 top-2">
              <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
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
                          "• " +
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
      </div>
    </Card>
  );
}
