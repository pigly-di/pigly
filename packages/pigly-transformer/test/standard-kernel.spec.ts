import { StandardKernel } from "pigly";
import { expect } from "chai";

interface IFoo {
  message: string;
}

interface IBar {
  value: number;
}

class Foo implements IFoo {
  constructor(public bar: IBar) {
    this.message = `Foo with bar: ${bar.value}`;
  }
  message: string;
}

class Bar implements IBar {
  constructor(public value: number) {}
}

class FooBar {
  constructor(public foo: IFoo, public bar: IBar) {}
}

describe("StandardKernel with Transformer", () => {
  describe("bind<T>() transformation", () => {
    it("should transform bind<T>() to bind(Symbol.for('T'))", () => {
      const kernel = new StandardKernel();

      // This should be transformed to: kernel.bind(Symbol.for("IFoo"))
      kernel.bind<IFoo>().toConst({ message: "hello", bar: { value: 0 } } as any);

      const result = kernel.get<IFoo>();
      expect(result.message).to.equal("hello");
    });

    it("should transform rebind<T>() to rebind(Symbol.for('T'))", () => {
      const kernel = new StandardKernel();

      // First binding
      kernel.bind<IFoo>().toConst({ message: "original", bar: { value: 1 } } as any);
      
      // Rebind should be checked first
      kernel.rebind<IFoo>().toConst({ message: "overridden", bar: { value: 2 } } as any);

      const result = kernel.get<IFoo>();
      expect(result.message).to.equal("overridden");
    });

    it("should handle primitive types", () => {
      const kernel = new StandardKernel();

      kernel.bind<string>().toConst("test");
      kernel.bind<number>().toConst(42).when(ctx => ctx.target === "special");

      expect(kernel.get<string>()).to.equal("test");
      expect(kernel.get<number>()).to.equal(42);
    });

    it("should handle generic interfaces", () => {
      const kernel = new StandardKernel();

      interface IService<T> { value: T; }

      kernel.bind<IService<string>>().toConst({ value: "hello" });
      kernel.bind<IService<number>>().toConst({ value: 123 });

      const str = kernel.get<IService<string>>();
      const num = kernel.get<IService<number>>();

      expect(str.value).to.equal("hello");
      expect(num.value).to.equal(123);
    });
  });

  describe("scoping", () => {
    it("should work with singleton scope", () => {
      const kernel = new StandardKernel();

      kernel.bind<IFoo>().toConst({ message: "shared", bar: { value: 0 } } as any).inSingletonScope();

      const result1 = kernel.get<IFoo>();
      const result2 = kernel.get<IFoo>();

      expect(result1).to.equal(result2);
    });
  });

  describe("edge cases", () => {
    it("should handle whitespace in generic types", () => {
      const kernel = new StandardKernel();

      interface IGeneric<T> { data: T; }

      // Different whitespace formatting should normalize to same symbol
      kernel.bind<IGeneric<string>>().toConst({ data: "test" });

      const result1 = kernel.get<IGeneric<string>>();
      const result2 = kernel.get<IGeneric  <  string  >>();

      expect(result1).to.equal(result2);
      expect(result1.data).to.equal("test");
    });

    it("should handle typeof types", () => {
      const kernel = new StandardKernel();

      const myObj = { prop: "value" };
      kernel.bind<typeof myObj>().toConst(myObj);

      const result = kernel.get<typeof myObj>();
      expect(result).to.equal(myObj);
    });

    it("should transform resolve<T>() method", () => {
      const kernel = new StandardKernel();

      kernel.bind<IBar>().toConst({ value: 100 }).when(ctx => ctx.target === "special");
      kernel.bind<IBar>().toConst({ value: 10 }); // fallback

      // resolve<T>() should transform to resolve(Symbol.for("T"))
      const resolution = kernel.resolve<IBar>({ service: Symbol.for("IBar"), target: "special" });
      expect(resolution.first().value).to.equal(100);
    });

    it("should transform destructured inject.to<T>() pattern", () => {
      const kernel = new StandardKernel();

      kernel.bind<IBar>().toConst({ value: 42 });

      // Test destructured pattern: ({to}) => [to<IBar>()]
      kernel.bind<IFoo>().toClass(Foo, ({to}) => [
        to<IBar>() // Should transform to to(Symbol.for("IBar"))
      ]);

      const result = kernel.get<IFoo>();
      expect(result.message).to.equal("Foo with bar: 42");
    });
  });
});
