const version = require("webpack/package.json").version.split(".");
const regexp = /Duplicate absMid/;
module.exports = [
	[regexp]
];
if (parseInt(version[0]) >= 4 && parseInt(version[1]) >= 19) {
	module.exports.push([regexp]);
}
