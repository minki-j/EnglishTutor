import { IGeneral } from "@/models/General";
import { CardSection } from "./card-section";

interface Props {
  entry: IGeneral;
  copyToClipboard: (text: string) => void;
}

export function CardContentGeneral({ entry, copyToClipboard }: Props) {
  return (
    <div className="space-y-4 flex-[0.9]">
      <CardSection
        title="Question"
        content={entry.input}
      />
      <CardSection
        title="Answer"
        content={entry.answer ?? ""}
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
