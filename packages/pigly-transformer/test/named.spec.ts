import { Kernel, when, toConst, toSelf, named } from "pigly";
import { expect } from "chai";

describe("named", () => {
  it("can conditionally inject service if context name matches", () => {
    const kernel = new Kernel();

    class A { constructor(public c: C){}}
    class B { constructor(public b: C){}}

    interface C { message: string }

    kernel.bind(toSelf(A));
    kernel.bind(toSelf(B));

    kernel.bind<C>(when(named("c"), toConst({message: "hello"})));

    let a = kernel.get<A>();

    expect(a.c.message).to.be.eq("hello");
    expect(()=>{
      kernel.get<B>();
    }).throws("could not resolve Symbol(C) > Symbol(B)");
  })
})