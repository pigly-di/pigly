import { Kernel, when, toConst, to, toSelf, injectedInto } from "pigly";
import { expect } from "chai";

describe("injectedInto", () => {
  it("can conditionally inject interface", () => {
    const kernel = new Kernel();

    class A { constructor(public c: C){}}
    class B { constructor(public c: C){}}
    interface C { message: string }

    kernel.bind(toSelf(A));
    kernel.bind(toSelf(B));
    kernel.bind<C>(when(injectedInto<A>(),toConst({message: "hello"})));
    kernel.bind<C>(when(injectedInto<B>(),toConst({message: "world"})));

    let a = kernel.get<A>();
    let b = kernel.get<B>();

    expect(a.c.message).to.be.eq("hello");
    expect(b.c.message).to.be.eq("world");
  })
})