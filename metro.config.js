const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// .claude holds ~4,500 files / 264 MB of agent and skill definitions, none of it
// importable app code (src/ is 75 files). Metro crawls and watches the whole
// project root, and with no watchman installed that crawl blows past
// metro-file-map's 240s MAX_WAIT_TIME on Windows, so `expo start` dies with
// "Failed to construct transformer: Failed to start watch mode."
//
// resolver.blockList becomes the file map's ignorePattern — see
// metro/src/node-haste/DependencyGraph/createFileMap.js getIgnorePattern().
// Match both separators: the pattern is tested against absolute paths, which use
// backslashes on Windows. Every entry must share the same regex flags; the Expo
// defaults carry none, so this one must not add any either.
config.resolver.blockList = [...config.resolver.blockList, /[\\/]\.claude[\\/]/];

module.exports = config;
