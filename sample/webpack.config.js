var DojoAMDPlugin = require("../lib/DojoAMDPlugin");
var loaderConfig = require("./js/loaderConfig");
var path = require("path");
var webpack = require("webpack");

module.exports = {
	context: __dirname,
    entry: "./entry.js",
    output: {
        path: path.join(__dirname, "release"),
        publicPath: "release/",
        pathinfo: true,
        filename: "bundle.js"
    },
    module: {
        loaders: [
      		{ test: /\.(png)|(gif)$/, loader: "url?limit=100000" }
        ]
    },
    plugins: [
        new DojoAMDPlugin({
        	loaderConfig: loaderConfig,
        	locales: ["en"]
        }),
		new webpack.NormalModuleReplacementPlugin(/^dojox\/gfx\/renderer!/, "dojox/gfx/canvas"),
        // For plugins registered after the DojoAMDPlugin, data.request has been normalized and
        // resolved to an absMid and loader-config maps and aliases have been applied
        new webpack.NormalModuleReplacementPlugin(
        	/^js\/css!/, function(data) {
        		data.request = data.request.replace(/^js\/css!/, "!style!css!less!")
        	}
        )
    ],
    resolveLoader: { 
    	root: path.join(__dirname, "../node_modules")
    },
};