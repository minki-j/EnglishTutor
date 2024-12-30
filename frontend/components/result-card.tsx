"use client";

import { Trash2 } from "lucide-react";
import { Card } from "./ui/card";
import { useToast } from "@/components/ui/use-toast";

import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";

import { CardContentCorrection } from "./card-content-correction";
import { CardContentVocabulary } from "./card-content-vocabulary";
import { CardContentBreakdown } from "./card-content-breakdown";


type Props = {
  entry: ICorrection | IVocabulary | IBreakdown;
};

export function ResultCard({ entry }: Props) {
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

  const cardContent = (entry: ICorrection | IVocabulary | IBreakdown) => {
 
    if (entry.type === "correction") {
      return <CardContentCorrection entry={entry} copyToClipboard={copyToClipboard} />;
    } else if (entry.type === 'vocabulary') {
      return <CardContentVocabulary entry={entry} copyToClipboard={copyToClipboard} />;
    } else if (entry.type === 'breakdown') {
      return <CardContentBreakdown entry={entry} copyToClipboard={copyToClipboard} />;
    }
  };

  return (
    <Card className={`p-6 relative`}>
      <div className="flex justify-between items-stretch">
        {cardContent(entry)}
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
