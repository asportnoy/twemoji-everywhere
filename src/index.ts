import { Injector, Logger, common, webpack } from "replugged";
const { lodash: _, parser } = common;
const { filters, getFunctionKeyBySource, waitForModule } = webpack;
import type React from "react";

const logger = Logger.plugin("dev.albertp.TwemojiEverywhere");
const injector = new Injector();

let emojiParser: ReturnType<typeof parser.reactParserFor>;

type ChannelHeader = React.FC & {
  Title: (...args: unknown[]) => unknown;
};

type MemberListMod = (args: { name: string | React.ReactElement }) => React.ReactElement;

async function patchChannelHeader(): Promise<void> {
  const headerMod = await waitForModule<Record<string, ChannelHeader>>(
    filters.bySource(/\w+.Icon=\w+;\w+\.Title=/),
  );
  const headerModKey = getFunctionKeyBySource("().toolbar", headerMod);
  if (!headerModKey) {
    logger.warn("Could not find channel header module");
    return;
  }
  injector.before(headerMod, headerModKey, ([args]) => {
    const childArr = _.get(args, "children[0].props.children[1].props.children.props.children");
    if (!childArr) return;
    if (!Array.isArray(childArr)) return;
    if (typeof childArr[2] !== "string") return;
    childArr[2] = patchText(childArr[2]);
  });
}

async function patchMemberList(): Promise<void> {
  const memberListMod = await waitForModule<Record<string, MemberListMod>>(
    filters.bySource(/=\w+\.dotAlignment/),
  );
  injector.before(memberListMod, "Z", ([args]) => {
    if (!args.name) return;
    if (typeof args.name !== "string") return;
    args.name = patchText(args.name);
  });
}

export function start(): void {
  const rules = _.pick(parser.defaultRules, ["text", "emoji"]);
  emojiParser = parser.reactParserFor(rules);

  void patchChannelHeader();
  void patchMemberList();
}

export function stop(): void {
  injector.uninjectAll();
}

export function patchText(text: string): React.ReactElement;
export function patchText(text: string[]): React.ReactElement[];
export function patchText(text: string | string[]): React.ReactElement | React.ReactElement[] {
  if (Array.isArray(text)) return text.map((str) => patchText(str));
  if (typeof text !== "string") return text;
  return emojiParser(text);
}
