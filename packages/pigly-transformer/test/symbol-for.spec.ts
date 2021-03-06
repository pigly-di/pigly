import { SymbolFor } from "pigly";
import { expect } from "chai";


describe("SymbolFor", () => {
  it("can create symbol for generic interface", ()=>{
    interface A<T>{}
    interface B{}
    interface C{}

    let AB = Symbol.for("A<B>");
    let AC = Symbol.for("A<C>");

    let ab = SymbolFor<A<B>>();
    let ac = SymbolFor<A<C>>();

    expect(ab).to.be.equal(AB);
    expect(ac).to.be.equal(AC);
  });

  it("can create symbol for generic interface, regardless of formatting", ()=>{
    interface A<T>{}
    interface B{}
    interface C{}

    let AB = Symbol.for("A<B>");
    let AC = Symbol.for("A<C>");

    let ab = SymbolFor<A  <    B>>();
    let ac = SymbolFor<A < C>>();

    expect(ab).to.be.equal(AB);
    expect(ac).to.be.equal(AC);
  });
})