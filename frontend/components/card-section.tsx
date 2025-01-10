"use client";

import { Copy } from "lucide-react";
import { ICorrectionItem } from "@/models/Correction";
import { IExtraQuestion } from "@/models/ExtraQuestions";
import ReactMarkdown from "react-markdown";
import { Spinner } from "./ui/spinner";

interface Props {
  title: string;
  content:
    | string
    | string[]
    | ICorrectionItem[]
    | IExtraQuestion[]
    | Array<{ key: string; value: string }>;
  onCopy?: (text: string) => void;
  variant?:
    | "string"
    | "stringList"
    | "correctionList"
    | "explanationList"
    | "extraQuestionList";
  formatListForCopy?: (content: ICorrectionItem[] | string[]) => string;
}

const CorrectionListContent = ({
  content,
  onCopy,
}: {
  content: ICorrectionItem[];
  onCopy?: (text: string) => void;
}) => (
  <div className="flex flex-col space-y-2">
    {content.map((item, index) => (
      <div
        key={index}
        onClick={() => onCopy?.(item.correction + "\n" + item.explanation)}
        className="group relative cursor-pointer hover:bg-muted/50 pr-8"
      >
        <p className="font-medium">{item.correction}</p>
        <p className="text-sm text-muted-foreground mt-1">{item.explanation}</p>
        <div className="absolute right-0 top-0">
          <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    ))}
  </div>
);

const ExtraQuestionListContent = ({
  content,
  onCopy,
}: {
  content: IExtraQuestion[];
  onCopy?: (text: string) => void;
}) => {
  return (
    <div className="relative group cursor-pointer hover:bg-muted/50 pr-8 flex flex-col space-y-1">
      {content.map((item, index) => (
        <div
          key={index}
          onClick={() => onCopy?.(item.question + "\n" + item.answer)}
        >
          <p className="font-medium">{item.question}</p>
          <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
        </div>
      ))}
      <div className="absolute right-0 top-0">
        <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

const StringListContent = ({
  content,
  onCopy,
}: {
  content: string[];
  onCopy?: (text: string) => void;
}) => (
  <ul className="list-disc pl-4 space-y-1">
    {content.map((item, index) => (
      <li
        key={index}
        className="group relative cursor-pointer hover:bg-muted/50"
        onClick={() => onCopy?.(item)}
      >
        <div className="pr-8">
          <p className="">{item}</p>
        </div>
        <div className="absolute right-0 top-0">
          <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </li>
    ))}
  </ul>
);

const StringContent = ({
  content,
  onCopy,
}: {
  content: string;
  onCopy?: (text: string) => void;
}) => (
  <div
    className="relative group text-foreground/90 pr-8 cursor-pointer hover:bg-muted/50"
    onClick={() => onCopy?.(content)}
  >
    <ReactMarkdown
      components={{
        p: ({ node, ...props }) => <p className="" {...props} />,
        ul: ({ node, ...props }) => (
          <ul className="stringList-disc pl-4 space-y-1" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="group relative" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    <div className="absolute right-0 top-0">
      <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </div>
);

export function CardSection({ title, content, variant = "string" }: Props) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy text to clipboard:", error);
    }
  };

  const renderContent = () => {
    if (!content) return <Spinner />;

    switch (variant) {
      case "string":
        return (
          <StringContent content={content as string} onCopy={copyToClipboard} />
        );
      case "stringList":
        return (
          <StringListContent
            content={content as string[]}
            onCopy={copyToClipboard}
          />
        );
      case "correctionList":
        return (
          <CorrectionListContent
            content={content as ICorrectionItem[]}
            onCopy={copyToClipboard}
          />
        );
      case "extraQuestionList":
        return (
          <ExtraQuestionListContent
            content={content as IExtraQuestion[]}
            onCopy={copyToClipboard}
          />
        );
      default:
        return <Spinner />;
    }
  };

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="rounded-sm p-1">{renderContent()}</div>
    </div>
  );
}
