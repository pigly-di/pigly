import { Kernel, to, toConst, defer } from "../src";
import { expect } from 'chai';

interface IFoo {
  bar?: IBar;
}

interface IBar {
  value: number;
}

describe("Triage", () => {
  it("deferred injection fires before a follow-on promise resolves", async () => {
    const kernel = new Kernel();
    const $IFoo = Symbol.for("IFoo:triarge");
    const $IBar = Symbol.for("IBar:triarge");

    kernel.bind($IBar, toConst({ value: 42 }));
    kernel.bind($IFoo, defer(() => ({} as IFoo), { bar: to($IBar) }));

    const foo = kernel.get<IFoo>($IFoo);

    // defer schedules via process.nextTick — bar is not yet assigned synchronously
    // not ideal really - this should be defined here too - but for now this is a ok work around. 
    expect(foo.bar, "bar is not yet injected synchronously").to.be.undefined;

    // process.nextTick drains before Promise microtasks, so by the time
    // this await resumes, the deferred injection has already occurred
    await Promise.resolve();

    expect(foo.bar, "bar was injected before promise continuation ran").to.not.be.undefined;
    expect(foo.bar!.value, "injected value is correct").to.equal(42);
  });
});

