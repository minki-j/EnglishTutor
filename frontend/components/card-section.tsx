import { Copy } from "lucide-react";
import { ICorrectionItem } from "@/models/Correction";
import ReactMarkdown from 'react-markdown';
import { Spinner } from "./ui/spinner";


interface Props {
  title: string;
  content: string | ICorrectionItem[] | string[];
  onCopy?: (text: string) => void;
  variant?: 'default' | 'list';
  formatListForCopy?: (content: ICorrectionItem[] | string[]) => string;
}

export function CardSection({ title, content, onCopy, variant = 'default', formatListForCopy }: Props) {

  const handleCopy = () => {
    if (typeof content === 'string') {
      onCopy?.(content);
    } else if (variant === 'list' && formatListForCopy) {
      onCopy?.(formatListForCopy(content));
    }
  };

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <div
        className={`rounded-sm p-1`}
        onClick={onCopy ? handleCopy : undefined}
      >
        {variant === "default" ? (
          <div className="relative group text-foreground/90 pr-8 cursor-pointer hover:bg-muted/50">
            {content ? (
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => <p className="" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="group relative" {...props} />
                }}>{content as string}</ReactMarkdown>
            ) : (
              <Spinner />
            )}
            <div className="absolute right-0 top-0">
              <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ) : (
          !content || content?.length === 0 ? (
            <Spinner />
          ) : (
            <ul className="list-disc pl-4 space-y-1">
              {(content as ICorrectionItem[] | string[]).map((item, index) => (
                <li key={index} className="group relative cursor-pointer hover:bg-muted/50">
                  <div className="pr-8">
                    <p className="font-medium">
                      {/* TODO: improve this hard coded solution */}
                      {typeof item === 'string' ? item : item.correction}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {/* TODO: improve this hard coded solution */}
                      {typeof item === 'string' ? '' : item.explanation}
                    </p>
                  </div>
                  <div className="absolute right-0 top-0">
                    <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
