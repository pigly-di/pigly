import { Kernel, to, toClass, toConst, defer, IContext } from "../src";
import { Scope } from '../src/_scope';
import { expect } from 'chai';

// Unique symbol factory to avoid cross-test collisions
const sym = (name: string) => Symbol.for(`defer.spec:${name}`);

describe("defer / ctx.finally", () => {

  describe("transient deferred injection", () => {
    it("each get() produces a new instance with deferred fields resolved", () => {
      const kernel = new Kernel();
      const $Foo = sym("transient:Foo");
      const $Bar = sym("transient:Bar");

      class Foo { bar: any; }
      class Bar { }

      let barCallCount = 0;
      kernel.bind($Bar, () => { barCallCount++; return new Bar(); });
      kernel.bind($Foo, defer(() => new Foo(), { bar: to($Bar) }));

      const foo1 = kernel.get<Foo>($Foo);
      const foo2 = kernel.get<Foo>($Foo);

      expect(foo1).to.not.equal(foo2, "transient: different instances each call");
      expect(foo1.bar).to.be.instanceOf(Bar);
      expect(foo2.bar).to.be.instanceOf(Bar);
      expect(foo1.bar).to.not.equal(foo2.bar, "transient dep: different instances each call");
      expect(barCallCount).to.equal(2);
    });
  });

  describe("singleton deferred injection", () => {
    it("second get() returns the cached instance and finalizer runs exactly once", () => {
      const kernel = new Kernel();
      const $Foo = sym("singleton-once:Foo");
      const $Bar = sym("singleton-once:Bar");

      class Foo { bar: any; }
      class Bar { }

      let finalizerCount = 0;
      kernel.bind($Bar, toConst(new Bar()));
      kernel.bind($Foo, defer(() => new Foo(), {
        bar: (ctx) => { finalizerCount++; return ctx.resolve<Bar>({ service: $Bar }).first(); }
      }), Scope.Singleton);

      const foo1 = kernel.get<Foo>($Foo);
      const foo2 = kernel.get<Foo>($Foo);

      expect(foo1).to.equal(foo2, "same cached instance on second get");
      expect(foo1.bar).to.be.instanceOf(Bar);
      expect(finalizerCount).to.equal(1, "finalizer ran exactly once");
    });
  });

  describe("chained defer", () => {
    it("A.b deferred (singleton), B.c deferred (singleton) — get(A) resolves entire chain", () => {
      const kernel = new Kernel();
      const $A = sym("chain:A");
      const $B = sym("chain:B");
      const $C = sym("chain:C");

      class C { value = 99; }
      class B { c: C; }
      class A { b: B; }

      kernel.bind($C, toConst(new C()), Scope.Singleton);
      kernel.bind($B, defer(() => new B(), { c: to($C) }), Scope.Singleton);
      kernel.bind($A, defer(() => new A(), { b: to($B) }), Scope.Singleton);

      const a = kernel.get<A>($A);

      expect(a.b).to.be.instanceOf(B,    "A.b is resolved");
      expect(a.b.c).to.be.instanceOf(C,  "B.c is resolved (chained finalizer)");
      expect(a.b.c.value).to.equal(99);
    });

    it("3-way cyclic singletons A→B→C→A — all back-pointers correct after get(A)", () => {
      const kernel = new Kernel();
      const $A = sym("cyclic3:A");
      const $B = sym("cyclic3:B");
      const $C = sym("cyclic3:C");

      class C { a: any; }
      class B { c: any; }
      class A { b: any; }

      kernel.bind($A, defer(() => new A(), { b: to($B) }), Scope.Singleton);
      kernel.bind($B, defer(() => new B(), { c: to($C) }), Scope.Singleton);
      kernel.bind($C, defer(() => new C(), { a: to($A) }), Scope.Singleton);

      const a = kernel.get<A>($A);

      expect(a.b).to.be.instanceOf(B,        "A.b resolved");
      expect(a.b.c).to.be.instanceOf(C,      "B.c resolved");
      expect(a.b.c.a).to.equal(a,            "C.a cycles back to same A instance");
    });
  });

  describe("constructor dep that itself uses defer", () => {
    it("B is a constructor arg of A; B.x is deferred — get(A) also resolves B.x", () => {
      const kernel = new Kernel();
      const $A = sym("ctor-defer:A");
      const $B = sym("ctor-defer:B");
      const $X = sym("ctor-defer:X");

      class X { value = 7; }
      class B { x: X; }
      class A { constructor(public b: B) { } }

      kernel.bind($X, toConst(new X()), Scope.Singleton);
      kernel.bind($B, defer(() => new B(), { x: to($X) }), Scope.Singleton);
      kernel.bind($A, toClass(A, to($B)));

      const a = kernel.get<A>($A);

      expect(a.b).to.be.instanceOf(B, "constructor dep is resolved");
      expect(a.b.x).to.be.instanceOf(X, "deferred field on constructor dep is resolved");
      expect(a.b.x.value).to.equal(7);
    });
  });

  describe("getAll() with multiple deferred bindings", () => {
    it("all bindings have their deferred fields resolved", () => {
      const kernel = new Kernel();
      const $X = sym("getAll:X");
      const $V1 = sym("getAll:V1");
      const $V2 = sym("getAll:V2");

      class X { val: any; }

      kernel.bind($V1, toConst("one"));
      kernel.bind($V2, toConst("two"));
      // bindings resolve in reverse-bind order (unshift), so first yielded = V2 binding
      kernel.bind($X, defer(() => new X(), { val: to($V1) }));
      kernel.bind($X, defer(() => new X(), { val: to($V2) }));

      const results = kernel.getAll<X[]>($X);

      expect(results).to.have.length(2);
      expect(results.map(r => r.val)).to.include("one");
      expect(results.map(r => r.val)).to.include("two");
      results.forEach((r, i) => {
        expect(r.val, `result[${i}].val should be resolved`).to.not.be.undefined;
      });
    });
  });

  describe("multiple deferred fields on a single binding", () => {
    it("all fields are populated after get()", () => {
      const kernel = new Kernel();
      const $Thing = sym("multi-field:Thing");
      const $A = sym("multi-field:A");
      const $B = sym("multi-field:B");
      const $C = sym("multi-field:C");

      class Thing { a: any; b: any; c: any; }

      kernel.bind($A, toConst("alpha"));
      kernel.bind($B, toConst("beta"));
      kernel.bind($C, toConst("gamma"));
      kernel.bind($Thing, defer(() => new Thing(), { a: to($A), b: to($B), c: to($C) }));

      const thing = kernel.get<Thing>($Thing);

      expect(thing.a).to.equal("alpha");
      expect(thing.b).to.equal("beta");
      expect(thing.c).to.equal("gamma");
    });
  });

  describe("ctx.finally() used directly in a custom provider", () => {
    it("callback fires synchronously after get(), before it returns", () => {
      const kernel = new Kernel();
      const $Foo = sym("direct-finally:Foo");

      let sequence: string[] = [];

      kernel.bind($Foo, (ctx: IContext) => {
        const obj = { value: 0 };
        ctx.finally(() => { sequence.push("finally"); obj.value = 99; });
        sequence.push("provider");
        return obj;
      });

      sequence.push("before");
      const foo = kernel.get<{ value: number }>($Foo);
      sequence.push("after");

      expect(foo.value).to.equal(99);
      expect(sequence).to.deep.equal(["before", "provider", "finally", "after"]);
    });

    it("multiple ctx.finally() registrations all fire in registration order", () => {
      const kernel = new Kernel();
      const $Foo = sym("direct-finally:multi");

      const calls: number[] = [];

      kernel.bind($Foo, (ctx: IContext) => {
        ctx.finally(() => calls.push(1));
        ctx.finally(() => calls.push(2));
        ctx.finally(() => calls.push(3));
        return {};
      });

      kernel.get($Foo);

      expect(calls).to.deep.equal([1, 2, 3]);
    });
  });

  describe("queue isolation between root calls", () => {
    it("finalizers from first get() are drained before second get() runs", () => {
      const kernel = new Kernel();
      const $A = sym("isolation:A");
      const $B = sym("isolation:B");
      const $Dep = sym("isolation:Dep");

      let depCallCount = 0;
      kernel.bind($Dep, () => { depCallCount++; return {}; });
      kernel.bind($A, defer(() => ({}), { dep: to($Dep) }));
      kernel.bind($B, defer(() => ({}), { dep: to($Dep) }));

      const a = kernel.get<any>($A);
      const b = kernel.get<any>($B);

      expect(a.dep).to.not.be.undefined;
      expect(b.dep).to.not.be.undefined;
      expect(depCallCount).to.equal(2, "each get() ran its own independent finalizer");
    });

    it("second get() works correctly even after first get() had a finalizer", () => {
      const kernel = new Kernel();
      const $A = sym("isolation:clean-A");
      const $B = sym("isolation:clean-B");

      let finalizerACalled = false;

      kernel.bind($A, (ctx: IContext) => {
        ctx.finally(() => { finalizerACalled = true; });
        return { name: "A" };
      });
      kernel.bind($B, toConst({ name: "B" }));

      kernel.get($A);
      expect(finalizerACalled).to.be.true;

      // Second get on unrelated service — A's finalizer must not fire again
      finalizerACalled = false;
      const b = kernel.get<any>($B);
      expect(b.name).to.equal("B");
      expect(finalizerACalled).to.be.false;
    });
  });

  describe("kernel.resolve() used directly (bypassing get/getAll)", () => {
    it("deferred fields are resolved when using resolve().first()", () => {
      const kernel = new Kernel();
      const $Foo = sym("resolve-direct:Foo");
      const $Bar = sym("resolve-direct:Bar");

      class Foo { bar: any; }

      kernel.bind($Bar, toConst({ value: 7 }));
      kernel.bind($Foo, defer(() => new Foo(), { bar: to($Bar) }));

      const foo = kernel.resolve<Foo>({ service: $Foo }).first();

      expect(foo.bar).to.not.be.undefined;
      expect(foo.bar.value).to.equal(7);
    });

    it("deferred fields are resolved when using resolve().toArray()", () => {
      const kernel = new Kernel();
      const $Foo = sym("resolve-direct:toArray:Foo");
      const $Bar = sym("resolve-direct:toArray:Bar");

      class Foo { bar: any; }

      kernel.bind($Bar, toConst({ value: 13 }));
      kernel.bind($Foo, defer(() => new Foo(), { bar: to($Bar) }));

      const [foo] = kernel.resolve<Foo>({ service: $Foo }).toArray();

      expect(foo.bar).to.not.be.undefined;
      expect(foo.bar.value).to.equal(13);
    });
  });

  describe("error handling", () => {
    it("error thrown in finalizer propagates synchronously from get()", () => {
      const kernel = new Kernel();
      const $Foo = sym("error:Foo");

      const boom = new Error("finalizer exploded");

      kernel.bind($Foo, (ctx: IContext) => {
        ctx.finally(() => { throw boom; });
        return {};
      });

      expect(() => kernel.get($Foo)).to.throw("finalizer exploded");
    });

    it("error thrown resolving a deferred field propagates synchronously", () => {
      const kernel = new Kernel();
      const $Foo = sym("error:missing-dep:Foo");
      const $Missing = sym("error:missing-dep:Missing");

      kernel.bind($Foo, defer(() => ({}), { missing: to($Missing) }));

      expect(() => kernel.get($Foo)).to.throw();
    });
  });

});
