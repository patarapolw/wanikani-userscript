const merge = require('webpack-merge');
const path = require('path');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    hot: true,
    publicPath: "/docs/js/",
    contentBase: path.resolve(__dirname, 'docs'),
    watchContentBase: true,
  }
});
