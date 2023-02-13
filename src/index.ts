import { Injector, Logger, common, webpack } from "replugged";
const { lodash: _, parser } = common;
const { filters, getFunctionKeyBySource, waitForModule } = webpack;
import type React from "react";
import "./style.css";

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

type EmbedMod = (args: {
  embed: {
    author?: {
      name?: string | React.ReactElement;
    };
    footer?: {
      text?: string | React.ReactElement;
    };
  };
}) => React.ReactElement;

const memberReplaceFn: (args: Parameters<MemberMod>) => void = ([args]) => {
  const key = "nickname" in args ? "nickname" : "name";

  const val = args[key];
  if (!val) return;
  if (typeof val !== "string") return;
  args[key] = patchText(val, "emoji-member-name");
};

const headerPaths = [
  "children[0].props.children[1].props.children.props",
  "children[0].props.children[2].props.children.props",
  "children[0].props.children[0].props.children[1].props",
  "children.props.children[2].props.children.props",
];

async function patchChannelHeader(): Promise<void> {
  const headerMod = await waitForModule<Record<string, ChannelHeader>>(
    filters.bySource(/\w+.Icon=\w+;\w+\.Title=/),
  );
  const headerModKey = getFunctionKeyBySource(headerMod, "().toolbar");
  if (!headerModKey) {
    logger.warn("Could not find channel header module");
    return;
  }
  injector.before(headerMod, headerModKey, ([args]) => {
    const children = headerPaths.map((x) => _.get(args, x));
    console.log(args, children);
    children.forEach((child) => {
      if (!child) return;
      if (typeof child === "object" && "children" in child) {
        if (Array.isArray(child.children)) {
          child.children = child.children.map((x: unknown) =>
            typeof x === "string" ? patchText(x, "emoji-header") : x,
          );
        } else if (typeof child.children === "string") {
          child.children = patchText(child.children, "emoji-header");
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

async function patchEmbeds(): Promise<void> {
  const embedMod = await waitForModule<Record<string, EmbedMod>>(
    filters.bySource(".renderAuthor="),
  );
  const key = Object.entries(embedMod).find(([_, x]) => "defaultProps" in x)?.[0];
  if (!key) {
    logger.warn("Could not find embed module");
    return;
  }
  injector.before(embedMod, key, ([{ embed }]) => {
    const name = embed.author?.name;
    const footer = embed.footer?.text;
    if (name && typeof name === "string")
      embed.author!.name = patchText(name, "emoji-embed-author");
    if (footer && typeof footer === "string")
      embed.footer!.text = patchText(footer, "emoji-embed-footer");
  });
}

export function start(): void {
  const rules = _.pick(parser.defaultRules, ["text", "emoji"]);
  emojiParser = parser.reactParserFor(rules);

  void patchChannelHeader();
  void patchMemberList();
  void patchPopoutName();
  void patchPopoutNickname();
  void patchEmbeds();
}

export function stop(): void {
  injector.uninjectAll();
}

export function patchText(text: string, extraClass?: string): React.ReactElement;
export function patchText(text: string[], extraClass?: string): React.ReactElement[];
export function patchText(
  text: string | string[],
  extraClass?: string,
): React.ReactElement | React.ReactElement[] {
  if (Array.isArray(text)) return text.map((str) => patchText(str, extraClass));
  if (typeof text !== "string") return text;
  const res = emojiParser(text);
  if (!Array.isArray(res)) return res;
  return res.map((x) => {
    if (typeof x !== "object") return x;
    const emoji = x.props.node.surrogate;
    const mainType = x.type(x.props);
    const nestedChild = mainType.props.children({});
    const finalChild = nestedChild.props.children({
      "aria-label": emoji,
    });
    finalChild.props.className += ` twemoji-everywhere-emoji ${extraClass || ""}`.trimEnd();
    nestedChild.props.children = () => finalChild;
    mainType.type = () => nestedChild;
    x.type = () => mainType;
    return x;
  });
}
