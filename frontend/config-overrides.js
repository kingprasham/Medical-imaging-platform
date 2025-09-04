const path = require('path');

module.exports = function override(config) {
  // Add fallbacks for node modules to fix build errors for Cornerstone
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "path": require.resolve("path-browserify"),
    "fs": false, 
  };

  // This rule ignores the noisy source map warnings from the dicom-image-loader package
  config.module.rules.push({
    test: /\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
    exclude: [
      path.resolve(__dirname, 'node_modules/@cornerstonejs/dicom-image-loader'),
    ],
  });
  
  return config;
}

