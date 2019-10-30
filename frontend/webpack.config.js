var path = require("path");
const webpack = require("webpack");

const CleanWebpackPlugin = require("clean-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const config = {
  mode: "development",  // TODO!!! Select from env
  output: {
    filename: "assets/[name]-[hash].js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
  },
  resolve: {
    extensions: [".mjs", ".js", ".json"],  //.mjs to resolve https://github.com/graphql/graphql-js/issues/1272#issuecomment-393903706
    modules: [path.resolve(__dirname, "src"), "node_modules"],
  },
  plugins: [
    new CleanWebpackPlugin(["dist"]),
    new ExtractTextPlugin("assets/[name]-[contenthash].css"),
    new HtmlWebpackPlugin({
      title: "Cognito Example App",
      template: "src/index.tmpl",
    }),
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || "development")
      }
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
          },
        ]
      },
      {
        test: /\.(svg|png|jpg|jpeg)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              hash: "sha512",
              digest: "hex",
              name: "assets/[hash].[ext]",
            }
          },
        ]
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: [
            {
              loader: "css-loader",
              options: {
                modules: true,
              },
            }
          ],
        })
      },
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          use: [
            {
              loader: "css-loader",
              options: {
                modules: true,
              },
            },
            {
              loader: "sass-loader",
            },
          ],
        })
      }
    ]
  }
};

if (process.env.NODE_ENV == "production") {
  config.entry = "./src/index.js";
  config.devtool = "source-map";
  config.plugins = config.plugins.concat([
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
      sourceMap: true,
    }),
  ]);
} else {
  config.entry = [
    "webpack-dev-server/client?http://localhost:8000",
    "webpack/hot/only-dev-server",
    "react-hot-loader/patch",
    "./src/index.js"
  ];
  config.devtool = "source-map";
  config.plugins.push(new webpack.HotModuleReplacementPlugin());
  config.plugins.push(new webpack.NamedModulesPlugin());
}

module.exports = config;
