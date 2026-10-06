import { Fragment } from "react";

/**
 * A headline whose words rise out of their own line as it scrolls into view
 * (globals.css, data-reveal="words"). Takes the message with <em> accents
 * already rendered as markup ("done <em>properly.</em>"), from our own
 * translations; anything else is shown as text. Without JavaScript, or with
 * reduced motion, it's simply the headline.
 */
export function SplitWords({ markup }: { markup: string }) {
  const segments = markup.split(/(<em>[\s\S]*?<\/em>)/g).filter(Boolean);
  let i = 0;
  return (
    <>
      {segments.map((segment, s) => {
        const em = segment.startsWith("<em>");
        const text = em ? segment.slice(4, -5) : segment;
        const words = text.split(/(\s+)/);
        const content = words.map((word, w) =>
          /^\s+$/.test(word) || word === "" ? (
            <Fragment key={w}>{word}</Fragment>
          ) : (
            <span key={w} className="w">
              <span style={{ "--i": i++ } as React.CSSProperties}>{word}</span>
            </span>
          ),
        );
        return em ? <em key={s}>{content}</em> : <Fragment key={s}>{content}</Fragment>;
      })}
    </>
  );
}
