/** Characters JSON leaves as they are but that aren't safe inside an inline <script>. */
const UNSAFE = /[<>/\u2028\u2029]/g;
const ESCAPES: Record<string, string> = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * A string as a JavaScript string literal that is safe to write into an inline
 * <script>: JSON, with the characters that could close the tag or break the
 * line escaped. For scripts built in code, e.g. the splash's start script.
 */
export function scriptString(value: string): string {
  return JSON.stringify(value).replace(UNSAFE, (char) => ESCAPES[char] ?? char);
}
