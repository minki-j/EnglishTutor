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
        title="Corrected"
        content={entry.correctedText}
        onCopy={copyToClipboard}
      />
      <CardSection
        title="Original"
        content={entry.input}
        onCopy={copyToClipboard}
      />
      <CardSection
        title="Explanations"
        content={entry.corrections}
        variant="list"
        formatListForCopy={() =>
          "Original: " +
          entry.input +
          "\n\n" +
          "Corrected: " +
          entry.correctedText +
          "\n\n" +
          entry.corrections
            .map(
              (correction) =>
                "- " + correction.correction + "\n" + correction.explanation
            )
            .join("\n")
        }
        onCopy={copyToClipboard}
      />
    </div>
  );
}
