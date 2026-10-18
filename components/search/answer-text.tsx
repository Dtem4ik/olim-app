import { Fragment, type ReactNode, useMemo } from "react";
import { type Inline, parseAnswer } from "@/lib/rag/answer-markdown";
import { cn } from "@/lib/utils";

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return nodes.map((n, i) => {
    const key = `${i}-${n.type}`;
    if (n.type === "strong")
      return (
        <strong key={key} className="font-semibold">
          {n.text}
        </strong>
      );
    if (n.type === "em") return <em key={key}>{n.text}</em>;
    if (n.type === "code") return <code key={key}>{n.text}</code>;
    return <Fragment key={key}>{n.text}</Fragment>;
  });
}

/**
 * The AI answer's light Markdown (bold, lists, headings) as real elements.
 * Model text is untrusted, so it is parsed to data (`lib/rag/answer-markdown`)
 * and rendered as React nodes — never as an HTML string. `trailing` (the
 * streaming caret) is placed at the end of the last block, not on its own line.
 */
export function AnswerText({
  text,
  trailing,
  className,
}: {
  text: string;
  trailing?: ReactNode;
  className?: string;
}) {
  const blocks = useMemo(() => parseAnswer(text), [text]);
  const lastIndex = blocks.length - 1;

  return (
    <div className={cn("prose-step flex flex-col gap-3", className)}>
      {blocks.map((block, i) => {
        const tail = i === lastIndex ? trailing : null;
        const key = `${i}-${block.type}`;
        if (block.type === "heading")
          return (
            <p key={key} className="font-semibold">
              <InlineNodes nodes={block.content} />
              {tail}
            </p>
          );
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={key}>
              {block.items.map((item, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: items are positional and never reorder
                <li key={j}>
                  <InlineNodes nodes={item} />
                  {j === block.items.length - 1 && tail}
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={key}>
            {block.lines.map((line, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional and never reorder
              <Fragment key={j}>
                {j > 0 && <br />}
                <InlineNodes nodes={line} />
              </Fragment>
            ))}
            {tail}
          </p>
        );
      })}
      {blocks.length === 0 && trailing}
    </div>
  );
}
