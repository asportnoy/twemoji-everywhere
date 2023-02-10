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

type MemberMod = (args: {
  name?: string | React.ReactElement;
  nickname?: string | React.ReactElement;
}) => React.ReactElement;

const memberReplaceFn: (args: Parameters<MemberMod>) => void = ([args]) => {
  const key = "nickname" in args ? "nickname" : "name";

  const val = args[key];
  if (!val) return;
  if (typeof val !== "string") return;
  args[key] = patchText(val);
};

const headerPaths = [
  "children[0].props.children[1].props.children.props",
  "children[0].props.children[2].props.children.props",
  "children[0].props.children[0].props.children[1].props",
];

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
    const children = headerPaths.map((x) => _.get(args, x));
    children.forEach((child) => {
      if (!child) return;
      if (typeof child === "object" && "children" in child) {
        if (Array.isArray(child.children)) {
          child.children = child.children.map((x: unknown) =>
            typeof x === "string" ? patchText(x) : x,
          );
        } else if (typeof child.children === "string") {
          child.children = patchText(child.children);
        }
      }
    });
  });
}

async function patchMemberList(): Promise<void> {
  const memberListMod = await waitForModule<Record<string, MemberMod>>(
    filters.bySource(/=\w+\.dotAlignment/),
  );
  injector.before(memberListMod, "Z", memberReplaceFn);
}

async function patchPopoutName(): Promise<void> {
  const popoutNameMod = await waitForModule<Record<string, MemberMod>>(
    filters.bySource(".invertBotTagColor"),
  );
  injector.before(popoutNameMod, "Z", memberReplaceFn);
}

async function patchPopoutNickname(): Promise<void> {
  const popoutNameMod = await waitForModule<{ exports: Record<string, MemberMod> }>(
    filters.bySource(".shouldCopyOnClick"),
    { raw: true },
  );
  injector.before(popoutNameMod.exports, "Z", memberReplaceFn);
}

export function start(): void {
  const rules = _.pick(parser.defaultRules, ["text", "emoji"]);
  emojiParser = parser.reactParserFor(rules);

  void patchChannelHeader();
  void patchMemberList();
  void patchPopoutName();
  void patchPopoutNickname();
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
