import { types } from "replugged";

const pluginExports = `window.replugged.plugins.getExports('dev.albertp.TwemojiEverywhere')`;

const replaceWithClass = (
  className: string,
): ((_: string, prefix: unknown, text: unknown, suffix: unknown) => string) => {
  return (_, prefix, text, suffix): string => {
    return `${prefix}(${pluginExports} ? ${pluginExports}.patchText(${text}, "${className}") : ${text})${suffix}`;
  };
};

const patches: types.PlaintextPatch[] = [
  {
    replacements: [
      // Channel name
      {
        match: /(\(\).channelName\)?,[^}]*children:\[)(null==\w+\?\w+:\w+)()/g,
        replace: replaceWithClass("emoji-channel-name"),
      },
      {
        match:
          /({className:\w+\(\)\(\w+\(\).name\),"aria-hidden":!0,children:)(null==\w+\?\w+:\w+)(})/g,
        replace: replaceWithClass("emoji-channel-name"),
      },
      // Category name
      {
        match: /(className:\w+\(\).name,children:[\d\w.,(){}]+children:)(i\.name)(})/g,
        replace: replaceWithClass("emoji-category-name"),
      },
      // Thread start message
      {
        match: /(\.Messages\.THREAD}[^}]+className:\w+\(\)\.name,children:)(\w+\.name)(}\))/g,
        replace: replaceWithClass("emoji-thread-start"),
      },
      // Thread header
      {
        match: /(\(\)\.header\),variant:"heading-xxl\/semibold",children:)(\w+)(}\))/g,
        replace: replaceWithClass("emoji-thread-header"),
      },
      // Text area placeholder
      {
        match:
          /({className:\w+\(\)\(\w+\(\)\.placeholder,\w+\),"aria-hidden":!0,children:)(\w+)(})/g,
        replace: replaceWithClass("emoji-textarea-placeholder"),
      },
      // Channel top message
      {
        match: /(children:)(\w+\.\w+\.Messages.BEGINNING_CHANNEL_\w+\.format\(.+?\))(}\))/g,
        replace: replaceWithClass("emoji-channel-top-message"),
      },
      // Member list
      {
        match: /(var \w+=\w+\.roleStyle,\w+=)(\w+\.name)(,)/,
        replace: replaceWithClass("emoji-member-list-name"),
      },
      // Member list role names
      {
        match: /(\w=)(\w+\.title)(,\w+=\w+\.count[\s\S]+?className:\w+\(\)\.membersGroup)/g,
        replace: replaceWithClass("emoji-member-list-role-name"),
      },
      // Role mention
      {
        match:
          /(children:)(\w+\(\w+\.content,\w+\))(}\),\w+\.key\):\(0,\w+\.jsx\)\(\w+,{className:"mention")/g,
        replace: replaceWithClass("emoji-mention"),
      },
      // User mention
      {
        match: /(children:)("@"\.concat\(null!=\w+\?\w+:\w+\))()/g,
        replace: replaceWithClass("emoji-mention"),
      },
      // Roles on profile
      {
        match: /(className:\w+\(\)\.roleNameOverflow,children:)(\w+\.name)(})/g,
        replace: replaceWithClass("emoji-profile-roles"),
      },
      // Message username
      {
        match: /(\(\)\.username,[^}]+{[^}]+}[^}]+children:)(\w+\+\w+)(})/g,
        replace: replaceWithClass("emoji-message-username"),
      },
    ],
  },
];

export default patches;
