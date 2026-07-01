// Metro must resolve @moto/contract from the sibling repo (file: dependency).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

let config = getDefaultConfig(__dirname);
const contractPath = path.resolve(__dirname, '../moto-contract');

config.watchFolders = [contractPath];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(contractPath, 'node_modules'),
];
config.resolver.extraNodeModules = {
  '@moto/contract': contractPath,
};

// Add NativeWind support
try {
  const withNativeWind = require('nativewind/metro').default;
  config = withNativeWind(config);
} catch (e) {
  console.warn('NativeWind not available');
}

module.exports = config;
