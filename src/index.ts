import { common } from "replugged";
const { lodash: _, parser } = common;

let emojiParser: ReturnType<typeof parser.reactParserFor>;

export function start(): void {
  const rules = _.pick(parser.defaultRules, ["text", "emoji"]);
  emojiParser = parser.reactParserFor(rules);
}

export function patchText(text: string): void {
  return emojiParser(text);
}
