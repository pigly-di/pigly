import { Kernel, toConst, toSelf } from "pigly";
import { expect } from "chai";

import {IFoo} from './_foo';

import {IFoo as IBar} from './_foo';

describe("kernel", () => {
  it("can bind interface", () => {
    const kernel = new Kernel();

    class A { constructor(public b: B) { } }
    interface B { message: string };

    kernel.bind(toSelf(A));
    kernel.bind<B>(toConst({ message: "hello" }));;

    let a = kernel.get<A>();

    expect(a.b.message).to.be.eq("hello");
  }) 

  it("can bind generic interface", () => {
    const kernel = new Kernel();

    interface A<T>{}
    interface B{}
    interface C{}

    kernel.bind<A<B>>(toConst("AB"));
    kernel.bind<A<C>>(toConst("AC"));

    let ab = kernel.get<A<B>>();
    let ac = kernel.get<A<C>>();

    expect(ab).to.be.eq("AB");
    expect(ac).to.be.eq("AC");
  })  
  it("can bind generic interface, regardless of formatting", () => {
    const kernel = new Kernel();

    interface A<T>{}
    interface B{}
    interface C{}

    kernel.bind<  A   <     B>>(toConst("AB"));
    kernel.bind<A<  C>>(toConst("AC"));

    let ab = kernel.get<A   < B>>();
    let ac = kernel.get<A < C  >>();

    expect(ab).to.be.eq("AB");
    expect(ac).to.be.eq("AC");
  })   

  it("can bind imported interface", () => {
    const kernel = new Kernel();

    class A { constructor(public b: IFoo) { } }

    kernel.bind(toSelf(A));
    kernel.bind<IFoo>(toConst({ message: "hello" }));;

    let a = kernel.get<A>();

    expect(a.b.message).to.be.eq("hello");
  })
  
  xit("can bind aliased interface", () => {
    const kernel = new Kernel();

    class A { constructor(public b: IBar) { } }

    kernel.bind(toSelf(A));
    kernel.bind<IBar>(toConst({ message: "hello" }));;

    let a = kernel.get<A>();

    expect(a.b.message).to.be.eq("hello");
  })

  it("can bind primitive: string", () => {
    const kernel = new Kernel();

    class A { constructor(public b: string) { } }

    kernel.bind(toSelf(A));
    kernel.bind<string>(toConst("hello"));

    let a = kernel.get<A>();

    expect(a.b).to.be.eq("hello");
  })
  
  it("can bind primitive: number", () => {
    const kernel = new Kernel();

    class A { constructor(public b: number) { } }

    kernel.bind(toSelf(A));
    kernel.bind<number>(toConst(10));

    let a = kernel.get<A>();

    expect(a.b).to.be.eq(10);
  })
})