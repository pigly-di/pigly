import { Kernel, toConst, toClass, to, asSingleton, IContext, when, defer, hasAncestor } from "../src";
import { expect } from 'chai';

interface IFoo {
  bar: IBar;
}
interface IBar {
  value: number;
}

class Bar implements IBar {
  constructor(public value: number) { }
}

class Foo implements IFoo {
  constructor(public bar: IBar) {
  }
}

describe("Kernel Basics", () => {
  it("can bind and call provider", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");

    let wasCalled = false;

    kernel.bind($IFoo, () => { wasCalled = true; return 10 });

    let result = kernel.get<number>($IFoo);

    expect(wasCalled, "provider was called").is.true;
    expect(result, "result is 10").is.equal(10);
  })

  it("can bind multiple symbols and call provider for specific symbol", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");
    const $IBar = Symbol.for("IBar");

    let wasTargetCalled = false;
    let wasOtherCalled = false;

    kernel.bind($IFoo, () => { wasTargetCalled = true; return 10 });
    kernel.bind($IBar, () => { wasOtherCalled = true; return 11 });

    let result = kernel.get<number>($IFoo);

    expect(wasTargetCalled, "target provider was called").is.true;
    expect(wasOtherCalled, "other provider was not called").is.false;
    expect(result, "result is 10").is.equal(10);
  })

  it("can multi-bind and get first", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");

    kernel.bind($IFoo, _ => 10);
    kernel.bind($IFoo, _ => 11);

    let result = kernel.get<number>($IFoo);

    expect(result, "result is 10").to.eql(10);
  })

  it("can multi-bind and resolve all ", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");

    kernel.bind($IFoo, _ => 10);
    kernel.bind($IFoo, _ => 11);

    let result = [];
    
    for(let item of kernel.resolve($IFoo)){
      result.push(item);
    }

    expect(result, "result is 10").to.eql([10, 11]);
  })
})

describe("Resolving Context", () => {
  it("can keep the resolution hierarchy", () => {
    const kernel = new Kernel();

    const A = Symbol.for("A");
    const B = Symbol.for("B");
    const C = Symbol.for("C");

    let result: IContext = undefined;
    let wasCalled = false;

    kernel.bind(A, to(B));
    kernel.bind(B, to(C));
    kernel.bind(C, ctx => {
      result = ctx;
      wasCalled = true;
      return 10;
    });

    let resolved = kernel.get(A);

    expect(wasCalled, "resolved to provider").is.true;
    expect(result.parent.target, "parent target is B").to.eql(B);
    expect(result.parent.parent.target, "parent parent target is A").to.eql(A);
    expect(resolved, "result is 10").to.eql(10);
  })

  it("should throw on cyclic dependency", () => {
    const kernel = new Kernel();

    const A = Symbol.for("A");
    const B = Symbol.for("B");
    const C = Symbol.for("C");

    kernel.bind(A, to(B));
    kernel.bind(B, to(C));
    kernel.bind(C, to(A));

    expect(() => {
      kernel.get(A);
    }).throws("Cyclic Dependency Found");
  })  
  
  it("should ignore providers returning undefined", () => {
    const kernel = new Kernel();

    const A = Symbol.for("A");

    kernel.bind(A, _=> undefined);
    kernel.bind(A, toConst("hello"));

    let result = kernel.get(A);

    expect(result).to.be.eq("hello");
  })

  it("should lazily resolve bindings", () => {
    const kernel = new Kernel();

    const A = Symbol.for("A");

    kernel.bind(A, _=> undefined);
    kernel.bind(A, toConst("hello"));
    kernel.bind(A, _=>{throw Error("should not be called")});

    let result = kernel.get(A);

    expect(result).to.be.eq("hello");
  })
})

describe("Providers", () => {
  it("can resolve a constant", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");

    kernel.bind($IFoo, toConst(10));

    let result = kernel.get<number>($IFoo);

    expect(result, "result is 10").to.eql(10);
  })

  it("can resolve a function", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");

    kernel.bind($IFoo, _ => { return {} });

    let result1 = kernel.get<number>($IFoo);
    let result2 = kernel.get<number>($IFoo);

    expect(result1, "results are different instances").is.not.equal(result2);
  })

  it("can resolve a class", () => {
    const kernel = new Kernel();

    class Foo {
      constructor(public arg1: number) { }
    }

    const $Foo = Symbol.for("Foo");

    kernel.bind($Foo, toClass(Foo, _ => 10));

    let result1 = kernel.get<Foo>($Foo);
    let result2 = kernel.get<Foo>($Foo);

    expect(result1, "result is instance of Foo").is.instanceOf(Foo);
    expect(result2, "result is instance of Foo").is.instanceOf(Foo);
    expect(result1.arg1, "ctor parameter was provided").is.eql(10);
    expect(result1, "results are different instances").is.not.equal(result2);
  })

  it("can resolve a singleton", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");

    kernel.bind($IFoo, asSingleton(_ => { return {} }));

    let foo1 = kernel.get<IFoo>($IFoo);
    let foo2 = kernel.get<IFoo>($IFoo);

    expect(foo1, "results are same instance").is.equal(foo2);
  })

  it("can resolve to all bindings", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");

    kernel.bind($IFoo, _ => 1);
    kernel.bind($IFoo, _ => 2);
    kernel.bind($IFoo, _ => 3);

    let foo = kernel.getAll<IFoo>($IFoo);

    expect(foo, "result is array").is.eql([1, 2, 3])
  })
})

describe("Conditional", () => {
  it("can predicate provider with when", () => {
    const kernel = new Kernel();

    class Foo {
      constructor(public arg1: string) { }
    }

    const A = Symbol.for("A");
    const B = Symbol.for("B");
    const C = Symbol.for("C");

    kernel.bind(A, toClass(Foo, to(C)));
    kernel.bind(B, toClass(Foo, to(C)));

    kernel.bind(C, when(x => x.parent.target == A, toConst("a")));
    kernel.bind(C, when(x => x.parent.target == B, toConst("b")));

    let resultA = kernel.get<Foo>(A);
    let resultB = kernel.get<Foo>(B);

    expect(resultA.arg1).is.eq("a");
    expect(resultB.arg1).is.eq("b");

  })
})

describe("Deferred Injection", () => {
  it("can inject singleton cyclic-loop dependency", (done) => {
    const kernel = new Kernel();

    class Foo {
      constructor(public bar: Bar) { }
    }

    class Bar {
      foo: Foo;
      constructor() { }
    }

    const $Foo = Symbol.for("Foo");
    const $Bar = Symbol.for("Bar");

    kernel.bind($Foo, asSingleton(toClass(Foo, to($Bar))));
    kernel.bind($Bar, asSingleton(defer(toClass(Bar), { foo: $Foo })));

    let foo = kernel.get<Foo>($Foo);
    let bar = kernel.get<Bar>($Bar);

    setImmediate(() => {
      expect(foo.bar).is.instanceOf(Bar);
      expect(bar.foo).is.instanceOf(Foo);
      expect(foo.bar).is.equal(bar);
      expect(bar.foo).is.equal(foo);
      done();
    });
  })
})


describe("Predicates", () => {
  describe("hasAncestor", () => {
    it("can inject symbol if ancestor matches", () => {
      const kernel = new Kernel();

      const A = Symbol.for("A");
      const B = Symbol.for("B");
      const C = Symbol.for("C");

      kernel.bind(A, when(hasAncestor(C), toConst("foo")));
      kernel.bind(B, to(A));
      kernel.bind(C, to(B));

      let c = kernel.get(C);

      expect(c).to.be.eq("foo");
    })
    it("can inject symbol if ancestor matches and fall-back to other bindings", () => {
      const kernel = new Kernel();

      const A = Symbol.for("A");
      const B = Symbol.for("B");
      const C = Symbol.for("C");

      kernel.bind(A, when(hasAncestor(C), toConst("foo")));
      kernel.bind(A, toConst("bar"));
      kernel.bind(B, to(A));
      kernel.bind(C, to(B));

      let c = kernel.get(C);
      let b = kernel.get(B);

      expect(c).to.be.eq("foo");
      expect(b).to.be.eq("bar");
    })

    it("throws if request does not have required ancestor", () => {
      const kernel = new Kernel();

      const A = Symbol.for("A");
      const B = Symbol.for("B");
      const C = Symbol.for("C");

      kernel.bind(A, when(hasAncestor(C), toConst("foo")));
      kernel.bind(B, to(A));
      kernel.bind(C, to(B));

      expect(() => {
        let b = kernel.get(B);
      }).throws()
    })
  })
})