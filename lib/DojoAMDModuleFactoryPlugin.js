/*
 * (C) Copyright IBM Corp. 2012, 2016 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const NormalModule = require("webpack/lib/NormalModule");
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const SingleEntryDependency = require("webpack/lib/dependencies/SingleEntryDependency");

module.exports = class DojoAMDModuleFactoryPlugin {
	constructor(options, dojoRequire) {
		this.options = options;
		this.dojoRequire = dojoRequire;
		
		/* Prepare a regexp for matching entry modules */
		if (options.enabledEntries && options.enabledEntries.length > 0) {
			this.enabledEntriesPattern = new RegExp("^(?:" + options.enabledEntries.map(s => {
				if (s instanceof RegExp) {
					return s.source;
				} else {
					return escapeRegExp(s);
				}
			}).join("|") + ")$");
		} else {
			throw new Error("No Dojo-enabled entry modules specified");
		}
		
		/* Prepare a regexp and map for correcting absolute module ids */
		if (options.loaderConfig && options.loaderConfig.packages && options.loaderConfig.packages.length > 0) {
			this.pkgReplacements = {};
			options.loaderConfig.packages.forEach((pkg, i) => {
				this.pkgReplacements[pkg.location.replace(/\\/g, "/") + "/"] = pkg.name + "/";
			});
			this.pkgPattern = new RegExp("\\b(?:" + Object.keys(this.pkgReplacements).map(s => escapeRegExp(s)).join("|") + ")\\b");
		}
	}

	toAbsMid(request, issuerAbsMid) {
		if (!request) return request;
		const segments = [];
		request.split("!").forEach((segment) => {
			segments.push(this.dojoRequire.toAbsMid(segment, issuerAbsMid ? {mid: issuerAbsMid} : null));
		});
		return segments.join("!");
	}

	apply(compiler) {
		compiler.plugin("normal-module-factory", (factory) => {
			factory.plugin("before-resolve", (data, callback) => {
				if (!data) return callback;
				const match = /^(.*)\?absMid=([^!]*)$/.exec(data.request);
				if (match && match.length === 3) {
					data.absMid = decodeURIComponent(match[2]);
					data.request = match[1];
				} else if (data.request === "require" || data.request === "module") {
					data.absMid = data.request;
					data.request = require.resolve("./NoModule").replace(/\\/g, "/");
				} else if (data.dependencies) {
					data.dependencies.some((dep) => {
						if (dep instanceof SingleEntryDependency || dep instanceof DojoAMDRequireItemDependency) {
							// dojo/has loader plugin syntax is not compatible with webpack loader syntax, so need
							// to evaluate dojo/has loader conditionals here
							const context = dep.issuerModule && (dep.issuerModule.absMid || dep.issuerModule.request);
							const absMid = this.toAbsMid(data.request, context);
							if (absMid.charAt(0) !== '.') {
								data.rawRequest = data.request;
								data.request = data.absMid = absMid;
							}
							data.absMidAliases = [];
							return true;
						}
					});
				}
				if (data.absMid) {
					data.absMid = this.fixAbsoluteMid(data.absMid);
				}
				return callback(null, data);
			});

			factory.plugin("resolver", (resolver) => {
				return (data, callback) => {
					return resolver(data, (err, result) => {
						if (result && data.absMid) {
							result.absMid = data.absMid;
							result.absMidAliases = data.absMidAliases;
							result.rawRequest = data.rawRequest;
						}
						callback(err, result);
					});
				};
			});

			factory.plugin("create-module", (data) => {
				const module =  new NormalModule(
					data.request,
					data.userRequest,
					data.rawRequest,
					data.loaders,
					data.resource,
					data.parser
				);
				if (data.absMid) {
					module.absMid = data.absMid;
					module.absMidAliases = data.absMidAliases;
				}
				if (this.enabledEntriesPattern.test(module.resource)) {
					module.isDojoEnabledEntry = true;
				}
				return module;
			});
		});
	}
	
	fixAbsoluteMid(absMid) {
		if (!this.pkgPattern) {
			return absMid;
		}
		return absMid.replace(this.pkgPattern, match => this.pkgReplacements[match]);
	}
	
};

function escapeRegExp(string) {
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
