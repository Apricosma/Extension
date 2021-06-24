const { DefinePlugin } = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const config = {
  mode: 'production',
  entry: {
    content: path.join(__dirname, 'src/Content/Content.tsx'),
    background: path.join(__dirname, 'src/Background/Background.tsx'),
    page: path.join(__dirname, 'src/Page/Page.tsx'),

		ffz_addon: path.join(__dirname, 'src/Page/FFZ/FrankerFaceZ.Addon.ts'),
		ffz_hook: path.join(__dirname, 'src/Page/FFZ/FrankerFaceZ.Hook.ts'),
  },
  output: { path: path.join(__dirname, 'dist'), filename: '[name].js' },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          {
            loader: 'file-loader',
            options: { outputPath: 'styles/', name: '[name].css' }
          },
          'sass-loader'
        ]
      },
      {
        test: /\.ts(x)?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.svg$/,
        use: 'file-loader',
      },
      {
        test: /\.png$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              mimetype: 'image/png',
            },
          },
        ],
      },
    ]
  },
  resolve: {
    plugins: [new TsconfigPathsPlugin()],
    extensions: ['.js', '.jsx', '.tsx', '.ts'],
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  },
  devServer: {
    contentBase: './dist',
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'public', to: '.' }],
    }),
    new DefinePlugin({
      global: 'window',
			__ENVIRONMENT__: JSON.stringify('production'),
      AppMeta: JSON.stringify({ version: 1 })
    }),
  ],
};

module.exports = config;
