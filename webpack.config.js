const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  devtool: '#eval-source-map',
  entry: './src/main.js', //location of your main js file
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js' // where js files would be bundled to
  },
  devServer: {
    port: 3001,
    writeToDisk: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '' },
        { from: './node_modules/pixi-tilemap/dist', to: '' },
        { from: './node_modules/pixi.js/dist/pixi.js', to: '' }
      ]
    }),
    new HtmlWebpackPlugin({
      cache: false,
      template: './public/index.html'
    })
  ]
}
