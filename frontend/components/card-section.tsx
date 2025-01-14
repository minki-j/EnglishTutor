"use client";

import { Copy } from "lucide-react";
import { ICorrectionItem } from "@/models/Correction";
import { IExtraQuestion } from "@/models/ExtraQuestions";
import { Spinner } from "./ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";

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
  <ul className="list-disc pl-4 space-y-1">
    {content.map((item, index) => (
      <li
        key={index}
        onClick={() => onCopy?.(item.correction + "\n" + item.explanation)}
        className="group relative cursor-pointer hover:bg-muted/50 pr-8"
      >
        <ReactMarkdown className="font-medium">{item.correction}</ReactMarkdown>
        <ReactMarkdown className="text-sm text-muted-foreground mt-1">
          {item.explanation}
        </ReactMarkdown>
        <div className="absolute right-0 top-0">
          <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </li>
    ))}
  </ul>
);

const ExtraQuestionListContent = ({
  content,
  onCopy,
}: {
  content: IExtraQuestion[];
  onCopy?: (text: string) => void;
}) => {
  return (
    <ul className="pl-4 space-y-1 list-disc">
      {content.map((item, index) => (
        <li
          key={index}
          className="group relative cursor-pointer hover:bg-muted/50 "
          onClick={() => onCopy?.("Q. " + item.question + "\n" + item.answer)}
        >
          <div className="pr-8">
            <ReactMarkdown className="font-medium">
              {item.question}
            </ReactMarkdown>
            <ReactMarkdown className="text-sm text-muted-foreground mt-1">
              {item.answer}
            </ReactMarkdown>
          </div>
          <div className="absolute right-0 top-0">
            <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </li>
      ))}
    </ul>
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
          <ReactMarkdown>{item}</ReactMarkdown>
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
}) => {
  return (
    <div
      className="relative group text-foreground/90 pr-8 cursor-pointer hover:bg-muted/50"
      onClick={() => onCopy?.(content)}
    >
      <ReactMarkdown
        components={{
          p: ({ node, children }) => <p className="my-2">{children}</p>,
          ul: ({ node, children }) => (
            <ul className="list-disc pl-4 space-y-1">{children}</ul>
          ),
          ol: ({ node, children }) => (
            <ol className="list-decimal pl-4 space-y-1">{children}</ol>
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
};

export function CardSection({ title, content, variant = "string" }: Props) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Copied to clipboard",
        variant: "default",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to copy text to clipboard:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
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
