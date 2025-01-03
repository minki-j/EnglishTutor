"use client";

import { Trash2, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

import { ICorrection } from "@/models/Correction";
import { IVocabulary } from "@/models/Vocabulary";
import { IBreakdown } from "@/models/Breakdown";

import { CardContentCorrection } from "./card-content-correction";
import { CardContentVocabulary } from "./card-content-vocabulary";
import { CardContentBreakdown } from "./card-content-breakdown";


type Props = {
  entry: ICorrection | IVocabulary | IBreakdown;
  onDelete?: (id: string) => void;
};

export function ResultCard({ entry, onDelete }: Props) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

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
      const response = await fetch(`/api/corrections/${id}`, {
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
    <Card className={`p-6 relative ${
      entry.type === 'correction' 
        ? 'bg-red-50' 
        : entry.type === 'vocabulary' 
        ? 'bg-green-50' 
        : 'bg-purple-50'
    }`}>
      <div className="flex justify-between items-stretch">
        {cardContent(entry)}
        <div className="flex-[0.1] flex flex-col justify-between items-end">
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
