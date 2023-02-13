import { types } from "replugged";

const patchFn = `window.replugged.plugins.getExports('dev.albertp.TwemojiEverywhere').patchText`;

const replaceWithClass = (
  className: string,
): ((_: string, prefix: unknown, text: unknown, suffix: unknown) => string) => {
  return (_, prefix, text, suffix): string => {
    return `${prefix}${patchFn}(${text}, "${className}")${suffix}`;
  };
};

const patches: types.PlaintextPatch[] = [
  // Channel name
  {
    replacements: [
      {
        match: /(\(\).channelName\)?,[^}]*children:)([\w=:?]+(?:\.name)?)(})/g,
        replace: replaceWithClass("emoji-channel-name"),
      },
    ],
  },
  // Category name
  {
    replacements: [
      {
        match: /(className:\w+\(\).name,children:[\d\w.,(){}]+children:)(i\.name)(})/g,
        replace: replaceWithClass("emoji-category-name"),
      },
    ],
  },
  // Thread start message
  {
    replacements: [
      {
        match: /(\.Messages\.THREAD}[^}]+className:\w+\(\)\.name,children:)(\w+\.name)(}\))/g,
        replace: replaceWithClass("emoji-thread-start"),
      },
    ],
  },
  // Thread header
  {
    replacements: [
      {
        match: /(\(\)\.header\),variant:"heading-xxl\/semibold",children:)(\w+)(}\))/g,
        replace: replaceWithClass("emoji-thread-header"),
      },
    ],
  },
  // Text area placeholder
  {
    replacements: [
      {
        match: /(\(\)\.slateTextArea,\w+\),placeholder:)(\w+)(,)/g,
        replace: replaceWithClass("emoji-textarea-placeholder"),
      },
    ],
  },
  // Channel top message
  {
    replacements: [
      {
        match: /(children:)(\w+\.\w+\.Messages.BEGINNING_CHANNEL_\w+\.format\(.+?\))(}\))/g,
        replace: replaceWithClass("emoji-channel-top-message"),
      },
    ],
  },
  // Member popout username
  {
    replacements: [
      {
        match: /(\(\)\.username,.+,children:)(\w+\+\w+)(})/g,
        replace: replaceWithClass("emoji-popout-username"),
      },
    ],
  },
  // Channel mention
  {
    replacements: [
      {
        match: /(className:"channelMention",[^}]*,children:)([^}]+)(})/g,
        replace: replaceWithClass("emoji-mention"),
      },
    ],
  },
  // Role mention
  {
    replacements: [
      {
        match: /(children:)([^}]+)(}.+className:"mention")/g,
        replace: replaceWithClass("emoji-mention"),
      },
    ],
  },
  // User mention
  {
    replacements: [
      {
        match: /(children:)("@"\.concat\(\w+\))()/g,
        replace: replaceWithClass("emoji-mention"),
      },
    ],
  },
  // Roles on profile
  {
    replacements: [
      {
        match: /(className:\w+\(\)\.roleNameOverflow,children:)(\w+\.name)(})/g,
        replace: replaceWithClass("emoji-profile-roles"),
      },
    ],
  },
];

export default patches;
