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
      />
      <CardSection
        title="Paraphrase"
        content={entry.paraphrase ?? ""}
      />
      <CardSection
        title="Breakdown"
        variant="string"
        content={entry.breakdown ?? ""}
      />
      {entry.extraQuestions?.length > 0 && (
        <CardSection
          title="Extra Questions"
          variant="extraQuestionList"
          content={entry.extraQuestions ?? ""}
        />
      )}
    </div>
  );
}
