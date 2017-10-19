define(["module", "exports"], function(module, exports) {
	return {
		runTests: function() {
			it("module.id", function(done) {
				module.exports.should.be.eql(exports);
				module.id.should.be.eql("test/dep");
				done();
			});
		}
	};
});
