const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

function getEntries() {
  return fs.readdirSync('./src/')
      .filter(
          (file) => file.match(/.*\.ts$/)
      )
      .map((file) => {
          return {
              name: file.substring(0, file.length - 3),
              path: './src/' + file
          }
      }).reduce((memo, file) => {
          memo[file.name] = file.path
          return memo;
      }, {})
}

module.exports = {
  entry: getEntries(),
  output: {
    path: path.resolve(__dirname, 'docs/js'),
    filename: '[name].min.js',
    library: ['[name]']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)?$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [
      '.tsx',
      '.ts',
      '.js'
    ]
  }
};
