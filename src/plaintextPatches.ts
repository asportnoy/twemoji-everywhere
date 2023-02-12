import { types } from "replugged";

const patchFn = `window.replugged.plugins.getExports('dev.albertp.TwemojiEverywhere').patchText`;

const replace = (_: string, prefix: unknown, text: unknown, suffix: unknown): string => {
  return `${prefix}${patchFn}(${text})${suffix}`;
};

const patches: types.PlaintextPatch[] = [
  // Channel name
  {
    replacements: [
      {
        match: /(\(\).channelName\)?,[^}]*children:)([\w=:?]+(?:\.name)?)(})/g,
        replace,
      },
    ],
  },
  // Category name
  {
    replacements: [
      {
        match: /(className:\w+\(\).name,children:[\d\w.,(){}]+children:)(i\.name)(})/g,
        replace,
      },
    ],
  },
  // Thread start message
  {
    replacements: [
      {
        match: /(\.Messages\.THREAD}[^}]+className:\w+\(\)\.name,children:)(\w+\.name)(}\))/g,
        replace,
      },
    ],
  },
  // Thread header
  {
    replacements: [
      {
        match: /(\(\)\.header\),variant:"heading-xxl\/semibold",children:)(\w+)(}\))/g,
        replace,
      },
    ],
  },
  // Text area placeholder
  {
    replacements: [
      {
        match: /(\(\)\.slateTextArea,\w+\),placeholder:)(\w+)(,)/g,
        replace,
      },
    ],
  },
  // Channel top message
  {
    replacements: [
      {
        match: /(children:)(\w+\.\w+\.Messages.BEGINNING_CHANNEL_\w+\.format\(.+?\))(}\))/g,
        replace,
      },
    ],
  },
  // Member list
  {
    replacements: [
      {
        match: /(\(\)\.username,.+,children:)(\w+\+\w+)(})/g,
        replace,
      },
    ],
  },
  // Channel mention
  {
    replacements: [
      {
        match: /(className:"channelMention",[^}]*,children:)([^}]+)(})/g,
        replace,
      },
    ],
  },
  // Role mention
  {
    replacements: [
      {
        match: /(children:)([^}]+)(}.+className:"mention")/g,
        replace,
      },
    ],
  },
  // User mention
  {
    replacements: [
      {
        match: /(children:)("@"\.concat\(\w+\))()/g,
        replace,
      },
    ],
  },
  // Role mentions on profile
  {
    replacements: [
      {
        match: /(className:\w+\(\)\.roleNameOverflow,children:)(\w+\.name)(})/g,
        replace,
      },
    ],
  },
];

export default patches;
