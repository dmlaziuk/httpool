var HtmlWebpackPlugin = require('html-webpack-plugin')

const dev = 'development'
// const prod = 'production'

module.exports = (env, {
  mode = dev
}) => ({
  mode,
  entry: './index.js',
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
      inject: 'body',
      hash: true
    })
  ]
})
