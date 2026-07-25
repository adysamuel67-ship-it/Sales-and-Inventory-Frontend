const { getDefaultConfig } = require('expo/metro-config');

if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return [...this].reverse();
  };
}

const config = getDefaultConfig(__dirname);

module.exports = config;
