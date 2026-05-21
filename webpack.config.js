const path = require('path');

const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');
const BundleTracker = require('webpack-bundle-tracker');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';
  const nodeModulesDir = path.resolve(__dirname, 'node_modules');
  // Same-origin path so Django (or ngrok HTTPS) can serve/proxy bundles without mixed content.
  const devPublicPath = '/frontend/webpack_bundles/';
  const localhostOutput = {
    path: path.resolve('./frontend/webpack_bundles/'),
    publicPath: devPublicPath,
    filename: '[name].js',
  };
  const productionOutput = {
    path: path.resolve('./frontend/webpack_bundles/'),
    publicPath: 'auto',
    filename: '[name]-[chunkhash].js',
    clean: true,
  };

  return {
    mode: isDev ? 'development' : 'production',
    devtool: 'source-map',
    devServer: {
      hot: true,
      historyApiFallback: true,
      host: '127.0.0.1',
      port: 3000,
      allowedHosts: 'all',
      devMiddleware: {
        publicPath: devPublicPath,
      },
      // Allow CORS when loading assets directly from :3000 (optional):
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
    context: __dirname,
    entry: ['./frontend/js/index.tsx'],
    output: isDev ? localhostOutput : productionOutput,
    module: {
      rules: [
        {
          test: /\.(js|mjs|jsx|ts|tsx)$/,
          use: {
            loader: 'swc-loader',
          },
        },
        {
          test: /\.css$/,
          use: [
            isDev && 'style-loader',
            !isDev && MiniCssExtractPlugin.loader,
            { loader: 'css-loader', options: { importLoaders: 1 } },
            // Tailwind v4 uses @tailwindcss/postcss (condigured in the postcss.config.mjs file)
            'postcss-loader',
          ].filter(Boolean),
        },
        {
          test: /\.(svg)(\?v=\d+\.\d+\.\d+)?$/,
          type: 'asset',
        },
        {
          test: /\.(woff(2)?|eot|ttf|otf)(\?v=\d+\.\d+\.\d+)?$/,
          type: 'asset',
        },
        {
          test: /\.(png|jpg|jpeg|gif|webp)?$/,
          type: 'asset',
        },
      ],
    },
    plugins: [
      !isDev && new MiniCssExtractPlugin({ filename: '[name]-[chunkhash].css' }),
      isDev && new ReactRefreshWebpackPlugin(),
      new BundleTracker({
        path: __dirname,
        filename: 'webpack-stats.json',
      }),
      new NodePolyfillPlugin(),
      new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }),
    ].filter(Boolean),
    resolve: {
      fullySpecified: false,
      modules: [nodeModulesDir, path.resolve(__dirname, 'frontend/js/')],
      alias: { '@': path.resolve(__dirname, 'frontend') },
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    optimization: {
      minimize: !isDev,
      splitChunks: {
        // include all types of chunks
        chunks: 'all',
      },
    },
  };
};
