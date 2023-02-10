import { types } from "replugged";

const patchFn = `window.replugged.plugins.getExports('dev.albertp.TwemojiEverywhere').patchText`;

const replace = (_: string, prefix: unknown, text: unknown, suffix: unknown): string => {
  return `${prefix}${patchFn}(${text})${suffix}`;
};

const patches: types.PlaintextPatch[] = [
  {
    replacements: [
      {
        match: /(\(\).channelName\)?,[^}]*children:)([\w=:?]+(?:\.name)?)(})/g,
        replace,
      },
    ],
  },
  {
    replacements: [
      {
        match: /(\.Messages\.THREAD}[^}]+className:\w+\(\)\.name,children:)(\w+\.name)(}\))/g,
        replace,
      },
    ],
  },
  {
    replacements: [
      {
        match: /(\(\).header\),variant:"heading-xxl\/semibold",children:)(\w+)(}\))/g,
        replace,
      },
    ],
  },
  {
    replacements: [
      {
        match: /(\(\)\.slateTextArea,\w+\),placeholder:)(\w+)(,)/g,
        replace,
      },
    ],
  },
  {
    replacements: [
      {
        match: /(children:)(\w+\.\w+\.Messages.BEGINNING_CHANNEL_\w+\.format\(.+?\))(}\))/g,
        replace,
      },
    ],
  },
  {
    replacements: [
      {
        match: /(\(\)\.username,.+,children:)(\w+\+\w+)(})/g,
        replace,
      },
    ],
  },
];

export default patches;
