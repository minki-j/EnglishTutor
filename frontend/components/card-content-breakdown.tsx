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
        title="Paraphrase"
        content={entry.paraphrase ?? ""}
        onCopy={copyToClipboard}
      />
      <CardSection
        title="Breakdown"
        content={entry.breakdown ?? ""}
        onCopy={copyToClipboard}
      />
    </div>
  );
}
