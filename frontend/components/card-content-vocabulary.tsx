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
        title="Vocabulary"
        content={entry.input}
        onCopy={copyToClipboard}
      />
      <CardSection
        title="Definition"
        content={entry.definition ?? ""}
        onCopy={copyToClipboard}
      />
      {entry.examples?.length > 0 && (
        <CardSection
          title="Examples"
          content={entry.examples}
          variant="list"
          formatListForCopy={(examples) =>
            "Original: " +
            entry.input +
            "\n\n" +
            "Examples: " +
            entry.examples
              .map(
                (example) =>
                  "- " + example
              )
              .join("\n")
          }
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
}
