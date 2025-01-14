import { IVocabulary } from "@/models/Vocabulary";
import { CardSection } from "./card-section";

interface Props {
  entry: IVocabulary;
  copyToClipboard: (text: string) => void;
}

export function CardContentVocabulary({ entry, copyToClipboard }: Props) {
  return (
    <div className="space-y-4 flex-[0.9]">
      <CardSection title="Vocabulary" content={entry.input} />
      <CardSection title="Definition" content={entry.definition ?? ""} />
      <CardSection
        title="Translation"
        content={entry.translated_vocabulary ?? ""}
      />
      <CardSection
        title="Examples"
        content={entry.examples}
        variant="stringList"
      />
      {entry.extraQuestions?.length > 0 && (
        <CardSection
          title="Extra Questions"
          variant="extraQuestionList"
          content={entry.extraQuestions}
        />
      )}
    </div>
  );
}
