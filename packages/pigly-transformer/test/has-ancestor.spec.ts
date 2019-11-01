import { Kernel, when, hasAncestor, toConst, to } from "pigly";
import { expect } from "chai";

describe("hasAncestor", () => {
  it("can inject interface if ancestor matches", () => {
    const kernel = new Kernel();

    interface A { }
    interface B { }
    interface C { }

    kernel.bind<A>(when(hasAncestor<C>(), toConst("foo")));
    kernel.bind<B>(to<A>());
    kernel.bind<C>(to<B>());

    let c = kernel.get<C>();

    expect(c).to.be.eq("foo");
  })
})