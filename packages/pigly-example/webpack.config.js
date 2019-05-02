const { transformer } = require('pigly')
const nodeExternals = require('webpack-node-externals');
const NodemonPlugin = require('nodemon-webpack-plugin');
const path = require('path');

module.exports = {  
  mode: "development",
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]'
  },

  // Set target to `node` as this is being run in a Node environment.
  target: 'node',
  externals: [nodeExternals({
    whitelist: []
  })],

  // Currently we need to add '.ts' to the resolve.extensions array.
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },

  // Source maps support ('inline-source-map' also works)
  devtool: 'source-map',
  stats: {
    colors: true
  },
  // Add the loader for .ts files.
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader',
        options: {
          // ... other loader's options
          getCustomTransformers: program => ({
            before: [
              transformer(program)
            ]
          })
        }
      }
    ]
  },
  plugins: [
    new NodemonPlugin(),
  ],
};