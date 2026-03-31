// webpack.config.js
const path = require('path')
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin')

module.exports = {
  entry: {
    standalone: './templates/standalone.html'
  },
  output: {
    path: path.join(__dirname, 'dist/static')
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      // 核心：在 RN 静态版中使用 Preact 替代 React 以缩小体积
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime'
    }
  },
  plugins: [
    new HtmlBundlerPlugin({
      js: { inline: true }, // JS 注入 HTML
      css: { inline: true }, // CSS 注入 HTML
      minify: true // 极致压缩
    })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['css-loader']
      },
      // 图片/字体资源处理
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        // 关键点 3: 强制资源转换为 Base64 内联
        type: 'asset/inline'
      }
    ]
  }
}
