var webpack = require("webpack");
var WebpackDevServer = require("webpack-dev-server");
var config = require("./webpack.config");

new WebpackDevServer(webpack(config), {
  publicPath: config.output.publicPath,
  hot: true,
  inline: true,
  disableHostCheck: true,
  stats: {
    colors: true
  },
  historyApiFallback: true,
  proxy: {
    "/api": "http://localhost:8080"
  }
}).listen(8000, "0.0.0.0", function (err) {
  if (err) {
    console.log(err);
  }
  console.log("Listening at 0.0.0.0:8000");
});
