import { IVocabulary } from "@/models/Vocabulary";
import { CardSection } from "./card-section";

interface Props {
  entry: IVocabulary;
  copyToClipboard: (text: string) => void;
}

export function CardContentVocabulary({ entry, copyToClipboard }: Props) {
  return (
    <div className="space-y-4 flex-[0.9]">
      <CardSection
        title="Original"
        content={entry.input}
        onCopy={copyToClipboard}
      />
      <CardSection
        title="Corrected"
        content={entry.corrected ?? ""}
        onCopy={copyToClipboard}
      />
      {entry.corrections?.length > 0 && (
        <CardSection
          title="Explanations"
          content={entry.corrections}
          variant="list"
          formatListForCopy={(corrections) =>
            "Original: " +
            entry.input +
            "\n\n" +
            "Corrected: " +
            entry.corrected +
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
