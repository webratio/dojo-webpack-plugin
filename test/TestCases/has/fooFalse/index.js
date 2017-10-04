define(["dojo/has", "dojo/has!foo?./a:./b"], function(has, m1) {

  it("should load false module", function(done) {
    has("webpack").should.be.true;
    has("foo").should.be.false;
    m1.should.be.eql("b");
    has.add("foo", true, true);
    require(["dojo/has!foo?./c:./d"], function(m2) {
      // module should have been set at build time and not changed just because foo changed
      has("foo").should.be.true;
      m2.should.be.eql("d");
      done();
    });
  });
});
