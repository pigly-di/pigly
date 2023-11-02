import { IBinding, Scope, IProvider, Kernel, Service, toConst, toSelf, toClass } from "pigly";
import { expect } from "chai";


describe("Scoping", () => {
  it("can bind singleton", () => {
    const kernel = new Kernel();

    interface IFoo {}
    class Foo implements IFoo {}

    kernel.bind<IFoo>(toClass(Foo), Scope.Singleton);

    let a = kernel.get<IFoo>();
    let b = kernel.get<IFoo>();

    expect(a === b, "same instance").to.be.true;
  })
});
  