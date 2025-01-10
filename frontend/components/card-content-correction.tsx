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
      />
      <CardSection
        title="Original"
        content={entry.input}
      />
      <CardSection
        title="Explanations"
        content={entry.corrections}
        variant="correctionList"
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
