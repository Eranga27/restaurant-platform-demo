import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import si from "@/messages/si.json";
import ta from "@/messages/ta.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[prefix + key, value]] : flatten(value, `${prefix}${key}.`),
  );
}

type Node = {
  type: number;
  value?: string;
  options?: Record<string, { value: Node[] }>;
  children?: Node[];
};

/** Argument and tag names anywhere in a message, including inside plural branches. */
function names(text: string, locale: string) {
  const args = new Set<string>();
  const tags = new Set<string>();
  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === 8) {
        tags.add(node.value!);
        walk(node.children ?? []);
      } else if (node.type >= 1 && node.type <= 6) {
        args.add(node.value!);
        for (const option of Object.values(node.options ?? {})) walk(option.value);
      }
    }
  };
  walk(new IntlMessageFormat(text, locale).getAst() as Node[]);
  return { args: [...args].sort(), tags: [...tags].sort() };
}

const english = new Map(flatten(en as Tree));

describe.each([
  ["si", si],
  ["ta", ta],
])("%s messages", (locale, messages) => {
  const translated = flatten(messages as Tree);

  it("translates every English message", () => {
    const have = new Set(translated.map(([key]) => key));
    expect([...english.keys()].filter((key) => !have.has(key))).toEqual([]);
  });

  it("has no messages English doesn't", () => {
    expect(translated.filter(([key]) => !english.has(key)).map(([key]) => key)).toEqual([]);
  });

  // A dropped {placeholder} or <link> tag shows raw text or throws at render.
  it.each(translated.filter(([key]) => english.has(key)))(
    "%s keeps its placeholders and tags",
    (key, text) => {
      expect(names(text, locale)).toEqual(names(english.get(key)!, "en"));
    },
  );
});
