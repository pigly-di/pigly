import { Kernel, when, toConst, to, toSelf, injectedInto } from "pigly";
import { expect } from "chai";

describe("toSelf", () => {
  it("can infer constructor interface argument and inject", () => {
    const kernel = new Kernel();

    class A { constructor(public b: B) { } }
    interface B { message: string }

    kernel.bind(toSelf(A));
    kernel.bind<B>(toConst({ message: "hello" }));

    let a = kernel.get<A>();

    expect(a.b.message).to.be.eq("hello");
  })

  it("can infer constructor interface array-argument and inject", () => {
    const kernel = new Kernel();

    class A { constructor(public b: B[]) { } }
    interface B { message: string }

    kernel.bind(toSelf(A));
    kernel.bind<B>(toConst({ message: "hello" }));
    kernel.bind<B>(toConst({ message: "world" }));

    let a = kernel.get<A>();

    expect(a.b).to.be.eql([{ message: "hello" }, { message: "world" }]);
  })
  it("can infer constructor multiple arguments and inject", () => {
    const kernel = new Kernel();

    class A { constructor(public b: B, public c: C, public d: D) { } }
    interface B { message: string }
    interface C { message: string }
    interface D { message: string }

    kernel.bind(toSelf(A));
    kernel.bind<B>(toConst({ message: "B" }));
    kernel.bind<C>(toConst({ message: "C" }));
    kernel.bind<D>(toConst({ message: "D" }));

    let a = kernel.get<A>();

    expect(a.b.message).to.be.eq("B");
    expect(a.c.message).to.be.eq("C");
    expect(a.d.message).to.be.eq("D");
  })
})