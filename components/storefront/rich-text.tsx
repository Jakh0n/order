import { Fragment } from "react";

/**
 * Owner text with **bold**, _italic_, ~~strike~~ and line breaks → React elements.
 * Never HTML: anything else is shown as plain text.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {inline(line)}
        </Fragment>
      ))}
    </>
  );
}

const TOKEN = /(\*\*[^*]+\*\*|~~[^~]+~~|_[^_]+_)/g;

function inline(line: string) {
  return line.split(TOKEN).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      return <s key={i}>{part.slice(2, -2)}</s>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
