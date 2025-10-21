import { Kernel, toClass, to, toConst } from "../src";
import { expect } from 'chai';
import { ResolveError, CyclicError } from "../src/errors";

interface IFoo {
  bar: IBar;
}

interface IBar {
  value: string;
}

class Foo implements IFoo {
  constructor(public bar: IBar) { }
}

class Bar implements IBar {
  constructor(public value: string) { }
}

describe("Error Messages with Provider Metadata", () => {
  it("should include provider metadata in ResolveError message", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");
    const $IBar = Symbol.for("IBar");
    const $IValue = Symbol.for("IValue");

    // Bind Foo with toClass provider
    kernel.bind($IFoo, toClass(Foo, to($IBar)));
    
    // Bind Bar with toClass provider, but don't bind IValue
    kernel.bind($IBar, toClass(Bar, to($IValue)));

    try {
      kernel.get($IFoo);
      expect.fail("Should have thrown ResolveError");
    } catch (err) {
      expect(err).to.be.instanceOf(ResolveError);
      
      const message = err.message;
      
      // Should mention the unresolved service
      expect(message).to.include("Could not resolve 'IValue'");
      
      // Should include provider metadata in the resolution chain
      expect(message).to.include("[via toClass (Bar)]");
      expect(message).to.include("[via toClass (Foo)]");
      
      // Note: The 'to' provider for IValue doesn't show because the error happens
      // before we even create a context for IValue (no bindings exist)
      
      //console.log("\nResolveError message:\n" + message);
    }
  });

  it("should include provider metadata in CyclicError message", () => {
    const kernel = new Kernel();

    const A = Symbol.for("A");
    const B = Symbol.for("B");
    const C = Symbol.for("C");

    kernel.bind(A, to(B));
    kernel.bind(B, to(C));
    kernel.bind(C, to(A));

    try {
      kernel.get(A);
      expect.fail("Should have thrown CyclicError");
    } catch (err) {
      expect(err).to.be.instanceOf(CyclicError);
      
      const message = err.message;
      
      // Should mention cyclic dependency
      expect(message).to.include("Cyclic Dependency Found");
      
      // Should include provider metadata showing which symbols are being resolved to
      expect(message).to.include("[via to (A)]");
      expect(message).to.include("[via to (C)]");
      expect(message).to.include("[via to (B)]");
      
      //console.log("\nCyclicError message:\n" + message);
    }
  });

  it("should show toConst provider in error messages", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");
    const $IBar = Symbol.for("IBar");

    kernel.bind($IFoo, toClass(Foo, to($IBar)));

    try {
      kernel.get($IFoo);
      expect.fail("Should have thrown ResolveError");
    } catch (err) {
      expect(err).to.be.instanceOf(ResolveError);
      
      const message = err.message;
      
      // Should show toClass provider
      expect(message).to.include("[via toClass (Foo)]");
      
      // Should show the 'to' provider
      expect(message).to.include("[via to");
      
      //console.log("\nError with toClass and to providers:\n" + message);
    }
  });

  it("should handle providers without metadata gracefully", () => {
    const kernel = new Kernel();

    const $IFoo = Symbol.for("IFoo");
    const $IBar = Symbol.for("IBar");

    // Custom provider without metadata
    kernel.bind($IFoo, (ctx) => {
      return ctx.resolve({ service: $IBar }).first();
    });

    try {
      kernel.get($IFoo);
      expect.fail("Should have thrown ResolveError");
    } catch (err) {
      expect(err).to.be.instanceOf(ResolveError);
      
      const message = err.message;
      
      // Should still show the error without crashing
      expect(message).to.include("Could not resolve 'IBar'");
      
      // Should work even without provider metadata
      expect(message).to.include("Resolution chain");
      
      //console.log("\nError with custom provider (no metadata):\n" + message);
    }
  });
});
