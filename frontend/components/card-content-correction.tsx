import { ICorrection } from "@/models/Correction";
import { CardSection } from "./card-section";

interface Props {
  entry: ICorrection;
  copyToClipboard: (text: string) => void;
}

export function CardContentCorrection({ entry, copyToClipboard }: Props) {
  return (
    <div className="space-y-4 flex-[0.9]">
      <CardSection
        title="Original"
        content={entry.originalText}
        onCopy={copyToClipboard}
      />
      <CardSection
        title="Corrected"
        content={entry.correctedText}
        onCopy={copyToClipboard}
      />
      {entry.corrections?.length > 0 && (
        <CardSection
          title="Explanations"
          content={entry.corrections}
          variant="list"
          formatListForCopy={(corrections) =>
            "Original: " +
            entry.originalText +
            "\n\n" +
            "Corrected: " +
            entry.correctedText +
            "\n\n" +
            corrections
              .map(
                (correction) =>
                  "- " + correction.correction + "\n" + correction.explanation
              )
              .join("\n")
          }
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
}
