import { Injector, Logger, common, util, webpack } from "replugged";
const { React, lodash: _, parser } = common;
const { filters, getFunctionKeyBySource, waitForModule } = webpack;
import "./style.css";

const logger = Logger.plugin("dev.albertp.TwemojiEverywhere");
const injector = new Injector();

let emojiParser: ReturnType<typeof parser.reactParserFor> | undefined;

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

async function patchChannelMentions(): Promise<void> {
  const mentionMod = await waitForModule<{
    exports: Record<string, (...args: unknown[]) => React.ReactElement>;
  }>(filters.bySource(/\w+=\w+\.color,\w+=\w+\.iconType/), {
    raw: true,
  });

  const keys = Object.keys(mentionMod.exports);
  if (keys.length > 1) {
    logger.error("More than one key found in mention mod, cannot patch.");
    return;
  }

  injector.after(mentionMod.exports, keys[0], (_args, res) => {
    const props = _.get(res, "props.children[2][0].props");
    if (!props) return;
    if (typeof props !== "object") return;
    if (!("children" in props)) return;
    if (typeof props.children !== "string" && !Array.isArray(props.children)) return;
    props.children = patchText(props.children, "emoji-mention");
  });
}

async function patchPopoutName(): Promise<void> {
  const popoutNameMod = await waitForModule<Record<string, MemberMod>>(
    filters.bySource(".invertBotTagColor"),
  );
  const key = getFunctionKeyBySource(popoutNameMod, ".invertBotTagColor");
  if (!key) {
    logger.warn("Could not find popout name module key");
    return;
  }
  injector.before(popoutNameMod, key, memberReplaceFn);
}

async function patchPopoutNickname(): Promise<void> {
  const popoutNicknameMod = await waitForModule<{
    exports: Record<string, MemberMod>;
  }>(filters.bySource(".shouldCopyOnClick"), { raw: true });
  const key = getFunctionKeyBySource(popoutNicknameMod.exports, ".shouldCopyOnClick");
  if (!key) {
    logger.warn("Could not find popout nickname module key");
    return;
  }
  injector.before(popoutNicknameMod.exports, key, memberReplaceFn);
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

function recursivelyPatchCodeBlock(html: string): Array<string | React.ReactNode> {
  const el = document.createElement("div");
  el.innerHTML = html;
  const parts = Array.from(el.childNodes).map((x) => {
    if (x.nodeType === x.TEXT_NODE) {
      return patchText(x.textContent || "", "emoji-code-block");
    }
    if (x.nodeType === x.ELEMENT_NODE && x.nodeName === "SPAN") {
      const attrs = Object.fromEntries(
        Array.from((x as Element).attributes).map((x) => [x.name, x.value]),
      );

      const children = recursivelyPatchCodeBlock((x as Element).innerHTML || "");

      return React.createElement("span", attrs, children);
    }
    return null;
  });

  return _.compact(parts);
}

function patchCodeBlocks(): void {
  injector.after(parser.defaultRules.inlineCode, "react", (_, res) => {
    res.props.children = patchText(res.props.children, "emoji-inline-code");
  });

  injector.after(parser.defaultRules.codeBlock, "react", (_, res) => {
    const child = util.findInReactTree(res, (x) => x && "render" in x) as {
      render: (args: unknown) => React.ReactElement;
    };
    if (!child) return;
    const uninject = injector.after(child, "render", (_, res) => {
      uninject();

      if (res.props.dangerouslySetInnerHTML) {
        const html = res.props.dangerouslySetInnerHTML.__html;
        const parts = recursivelyPatchCodeBlock(html);
        res.props.children = parts;
        delete res.props.dangerouslySetInnerHTML;
      } else {
        res.props.children = patchText(res.props.children, "emoji-code-block");
      }
    });
  });
}

let running = false;

export function start(): void {
  running = true;

  if (parser) {
    const rules = _.pick(parser.defaultRules, ["text", "emoji"]);
    emojiParser = parser.reactParserFor(rules);
  } else {
    logger.warn("replugged.common.parser not found, this plugin will not work");
  }

  void patchChannelHeader();
  void patchChannelMentions();
  void patchPopoutName();
  void patchPopoutNickname();
  void patchEmbeds();
  patchCodeBlocks();
}

export function stop(): void {
  running = false;
  injector.uninjectAll();
}

export function patchText(text: string, extraClass?: string): string | React.ReactElement;
export function patchText(text: string[], extraClass?: string): Array<string | React.ReactElement>;
export function patchText(
  text: string | string[],
  extraClass?: string,
): string | React.ReactElement | Array<string | React.ReactElement> {
  if (!running || !emojiParser) return text;
  if (Array.isArray(text)) return text.map((str) => patchText(str, extraClass));
  if (typeof text !== "string") return text;
  const res = emojiParser(text);
  if (!Array.isArray(res)) return res;
  return res.map((x) => {
    if (typeof x !== "object") return x;
    if (!x.type || !x.props || !x.props.node) return x;
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
