// node scripts/check-translations.mjs <locale> <batch.json>
// Checks a batch of translations (flat "Namespace.key" → text) against the
// English messages: same {placeholders} and <tags>, valid ICU syntax. Then
// merges the batch into src/messages/<locale>.json. Used while translating;
// the site itself falls back to English for anything missing.
import { readFileSync, writeFileSync } from "node:fs";

import { IntlMessageFormat } from "intl-messageformat";

const [locale, file] = process.argv.slice(2);
const en = JSON.parse(readFileSync("src/messages/en.json", "utf8"));
const target = `src/messages/${locale}.json`;
const messages = JSON.parse(readFileSync(target, "utf8"));
const batch = JSON.parse(readFileSync(file, "utf8"));

const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
function set(obj, path, value) {
  const keys = path.split(".");
  let node = obj;
  for (const key of keys.slice(0, -1)) node = node[key] ??= {};
  node[keys.at(-1)] = value;
}
// Argument and tag names anywhere in a message, read from the parsed ICU tree
// (so the text inside plural branches, like "one {it}", isn't an argument).
function names(text) {
  const args = new Set();
  const tags = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 8) {
        tags.add(node.value);
        walk(node.children);
      } else if (node.type >= 1 && node.type <= 6) {
        args.add(node.value);
        for (const option of Object.values(node.options ?? {})) walk(option.value);
      }
    }
  };
  walk(new IntlMessageFormat(text, "en").getAst());
  return { args, tags };
}
const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

let errors = 0;
for (const [key, text] of Object.entries(batch)) {
  const source = get(en, key);
  if (typeof source !== "string") {
    console.error(`✗ ${key}: not an English message`);
    errors++;
    continue;
  }
  try {
    new IntlMessageFormat(text, locale);
  } catch (e) {
    console.error(`✗ ${key}: invalid ICU (${e.message})`);
    errors++;
    continue;
  }
  const want = names(source);
  const got = names(text);
  if (!same(want.args, got.args)) {
    console.error(`✗ ${key}: placeholders ${[...got.args]} ≠ ${[...want.args]}`);
    errors++;
  }
  if (!same(want.tags, got.tags)) {
    console.error(`✗ ${key}: tags ${[...got.tags]} ≠ ${[...want.tags]}`);
    errors++;
  }
  set(messages, key, text);
}
if (errors > 0) {
  console.error(`${errors} problem(s); nothing written.`);
  process.exit(1);
}
writeFileSync(target, `${JSON.stringify(messages, null, 2)}\n`);
console.log(`${Object.keys(batch).length} messages merged into ${target}`);
