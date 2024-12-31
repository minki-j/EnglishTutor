import { IBreakdown } from "@/models/Breakdown";
import { CardSection } from "./card-section";

interface Props {
  entry: IBreakdown;
  copyToClipboard: (text: string) => void;
}

export function CardContentBreakdown({ entry, copyToClipboard }: Props) {
  return (
    <div className="space-y-4 flex-[0.9]">
      <CardSection
        title="Original"
        content={entry.input}
        onCopy={copyToClipboard}
      />
      <CardSection
        title="Breakdown"
        content={entry.breakdown ?? ""}
        onCopy={copyToClipboard}
      />
      {/* {entry.corrections?.length > 0 && (
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
      )} */}
    </div>
  );
}
