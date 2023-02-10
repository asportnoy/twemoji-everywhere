import { types } from "replugged";

const patchFn = `window.replugged.plugins.getExports('dev.albertp.TwemojiEverywhere').patchText`;

const patches: types.PlaintextPatch[] = [
  {
    replacements: [
      {
        match: /(className:\w+\(\)\.channelName,children:)([\w=:?]+)(})/g,
        replace: (_, prefix, text, suffix) => {
          return `${prefix}${patchFn}(${text})${suffix}`;
        },
      },
    ],
  },
];

export default patches;
