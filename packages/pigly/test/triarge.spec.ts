import { Kernel, to, toConst, defer } from "../src";
import { expect } from 'chai';

interface IFoo {
  bar?: IBar;
}

interface IBar {
  value: number;
}

describe("Triage", () => {
  it("deferred injection is available synchronously after get()", () => {
    const kernel = new Kernel();
    const $IFoo = Symbol.for("IFoo:triarge");
    const $IBar = Symbol.for("IBar:triarge");

    kernel.bind($IBar, toConst({ value: 42 }));
    kernel.bind($IFoo, defer(() => ({} as IFoo), { bar: to($IBar) }));

    const foo = kernel.get<IFoo>($IFoo);

    // postResolve runs synchronously — bar is injected immediately
    expect(foo.bar, "bar was injected synchronously").to.not.be.undefined;
    expect(foo.bar!.value, "injected value is correct").to.equal(42);
  });

  it("error thrown during defer resolution propagates synchronously", () => {
    const kernel = new Kernel();
    const $IFoo = Symbol.for("IFoo:triarge-error");

    const injectionError = new Error("defer injection failed");

    kernel.bind($IFoo, defer(() => ({} as IFoo), {
      bar: () => { throw injectionError; }
    }));

    expect(() => kernel.get<IFoo>($IFoo)).to.throw("defer injection failed");
  });
});

