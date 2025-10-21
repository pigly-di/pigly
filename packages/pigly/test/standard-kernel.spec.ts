import { StandardKernel, toClass, to, toConst, Scope, injectedInto, hasAncestor } from "../src";
import { expect } from 'chai';

interface IFoo {
    bar: IBar;
}
interface IBar {
    value: number;
}

class Bar implements IBar {
    constructor(public value: number) { }
}

class Foo implements IFoo {
    constructor(public bar: IBar) {
    }
}

class FooWithOptional {
    constructor(public bar: IBar, public extra: string) {
    }
}

describe("StandardKernel Fluent API", () => {
    it("should support .as() for parameter names", () => {
        const kernel = new StandardKernel();

        const $IFooWithOptional = Symbol.for("IFooWithOptional");
        const $IBar = Symbol.for("IBar");
        const $IString = Symbol.for("IString");

        kernel.bind($IBar).toConst({ value: 100 });
        kernel.bind($IString).toConst("fallback");
        
        // Demonstrate the fluent API - .as() provides parameter name metadata
        kernel.bind($IFooWithOptional).toClass(FooWithOptional, ({ to }) => [
            to<IBar>($IBar).as("bar"), 
            to<string>($IString).as("extra")
        ]);

        const result = kernel.get<FooWithOptional>($IFooWithOptional);
        expect(result.bar.value).to.equal(100);
        expect(result.extra).to.equal("fallback");
    });
    it("should bind with fluent API using builder", () => {
        const kernel = new StandardKernel();

        const $IFoo = Symbol.for("IFoo");
        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toConst(42);
        kernel.bind($IFoo).toClass(Foo, inject => [inject.to($IBar)]);

        const result = kernel.get<IFoo>($IFoo);

        expect(result).to.be.instanceOf(Foo);
        expect(result.bar).to.equal(42);
    });

    it("should support singleton scope with fluent API", () => {
        const kernel = new StandardKernel();

        const $IFoo = Symbol.for("IFoo");
        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toConst(42);
        kernel.bind($IFoo).toClass(Foo, inject => [inject.to($IBar)]).inSingletonScope();

        const result1 = kernel.get<IFoo>($IFoo);
        const result2 = kernel.get<IFoo>($IFoo);

        expect(result1).to.equal(result2);
    });

    it("should support transient scope with fluent API", () => {
        const kernel = new StandardKernel();

        const $IFoo = Symbol.for("IFoo");
        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toConst(42);
        kernel.bind($IFoo).toClass(Foo, inject => [inject.to($IBar)]).inTransientScope();

        const result1 = kernel.get<IFoo>($IFoo);
        const result2 = kernel.get<IFoo>($IFoo);

        expect(result1).to.not.equal(result2);
    });

    it("should support when predicate with fluent API", () => {
        const kernel = new StandardKernel();

        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toConst(42);
        kernel.rebind($IBar).toConst(100).when(ctx => ctx.target == "special"); // Use rebind for conditional override

        const result = kernel.get<number>($IBar);

        const resolution = kernel.resolve({ target: "special", service: $IBar });

        const result2 = resolution.first();

        expect(result).to.equal(42); // Default binding
        expect(result2).to.equal(100); // Special binding
    });

    it("should support chaining when and scope", () => {
        const kernel = new StandardKernel();

        const $IFoo = Symbol.for("IFoo");
        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toConst(100);
        kernel.bind($IFoo)
            .toClass(Foo, inject => [inject.to($IBar)])
            .when(ctx => ctx.target !== "excluded")
            .inSingletonScope();

        const result1 = kernel.get<IFoo>($IFoo);
        const result2 = kernel.get<IFoo>($IFoo);

        expect(result1).to.equal(result2); // Singleton
        expect(result1.bar).to.equal(100);
    });

    it("should support custom scope with fluent API", () => {
        const kernel = new StandardKernel();

        const $IFoo = Symbol.for("IFoo");
        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toConst(100);
        kernel.bind($IFoo).toClass(Foo, inject => [inject.to<IBar>($IBar)]).inScope(Scope.Singleton);

        const result1 = kernel.get<IFoo>($IFoo);
        const result2 = kernel.get<IFoo>($IFoo);

        expect(result1).to.equal(result2);
    });

    it("should return binding from getBinding", () => {
        const kernel = new StandardKernel();

        const $IBar = Symbol.for("IBar");

        const fluentBinding = kernel.bind($IBar).toConst(42);
        const binding = fluentBinding.getBinding();

        expect(binding).to.have.property('provider');
        expect(binding).to.have.property('site');
        expect(binding).to.have.property('scope');
        expect(binding.scope).to.equal(Scope.Transient);
    });

    it("should modify binding scope after creation", () => {
        const kernel = new StandardKernel();

        const $IFoo = Symbol.for("IFoo");
        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toConst(100);

        const fluentBinding = kernel.bind($IFoo).toClass(Foo, inject => [inject.to($IBar)]);
        const binding = fluentBinding.getBinding();

        expect(binding.scope).to.equal(Scope.Transient);

        fluentBinding.inSingletonScope();

        expect(binding.scope).to.equal(Scope.Singleton);

        const result1 = kernel.get<IFoo>($IFoo);
        const result2 = kernel.get<IFoo>($IFoo);

        expect(result1).to.equal(result2); // Now singleton
    });

    it("should support nested toClass in builder", () => {
        const kernel = new StandardKernel();

        const $IFoo = Symbol.for("IFoo");
        const $IBar = Symbol.for("IBar");
        const $IValue = Symbol.for("IValue");

        kernel.bind($IValue).toConst(999);
        kernel.bind($IBar).toClass(Bar, inject => [inject.to($IValue)]);
        kernel.bind($IFoo).toClass(Foo, inject => [inject.to($IBar)]);

        const result = kernel.get<IFoo>($IFoo);

        expect(result).to.be.instanceOf(Foo);
        expect(result.bar).to.be.instanceOf(Bar);
        expect(result.bar.value).to.equal(999);
    });

    it("should support toConst in builder", () => {
        const kernel = new StandardKernel();

        const $IBar = Symbol.for("IBar");

        kernel.bind($IBar).toClass(Bar, inject => [inject.toConst(777)]);

        const result = kernel.get<IBar>($IBar);

        expect(result).to.be.instanceOf(Bar);
        expect(result.value).to.equal(777);
    });

    it("should support truly nested fluent toClass in builder", () => {
        const kernel = new StandardKernel();

        // Nested dependency: Baz needs a number
        class Baz {
            constructor(public multiplier: number) { }
        }

        // Bar now needs a Baz instead of just a number
        class BarWithBaz {
            constructor(public baz: Baz) { }
        }

        // Foo needs BarWithBaz
        class FooWithBar {
            constructor(public bar: BarWithBaz) { }
        }

        const $IFoo = Symbol.for("IFooWithBar");
        const $IBar = Symbol.for("IBarWithBaz");
        const $IBaz = Symbol.for("IBaz");

        // Truly nested fluent construction
        kernel.bind($IFoo).toClass(FooWithBar, inject => [
            inject.toClass(BarWithBaz, inject2 => [
                inject2.toClass(Baz, inject3 => [
                    inject3.toConst(42)
                ])
            ])
        ]);

        const result = kernel.get<FooWithBar>($IFoo);

        expect(result).to.be.instanceOf(FooWithBar);
        expect(result.bar).to.be.instanceOf(BarWithBaz);
        expect(result.bar.baz).to.be.instanceOf(Baz);
        expect(result.bar.baz.multiplier).to.equal(42);
    });

    it("should throw error when Service parameter is missing (runtime validation)", () => {
        const kernel = new StandardKernel();

        // Test bind() without service
        expect(() => kernel.bind<IFoo>(undefined as any)).to.throw(
            "Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution."
        );

        // Test to() without service in builder
        const $IFoo = Symbol.for("IFoo");
        kernel.bind($IFoo).toClass(Foo, inject => {
            expect(() => inject.to<IBar>(undefined as any)).to.throw(
                "Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution."
            );
            return [inject.toConst({ value: 42 } as IBar)];
        });

        // Test to() without service in binding
        expect(() => kernel.bind($IFoo).to<IBar>(undefined as any)).to.throw(
            "Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution."
        );
    });

    describe("Predicates", () => {
        it("should support injectedInto predicate with fluent API", () => {
            const kernel = new StandardKernel();

            const $IFoo = Symbol.for("IFoo");
            const $IBar = Symbol.for("IBar");
            const $IValue = Symbol.for("IValue");

            // Bind fallback first, then use rebind for conditional override
            kernel.bind($IValue).toConst(999); // fallback
            // IValue is directly injected into IBar, so parent.service will be $IBar
            kernel.rebind($IValue).toConst(200).when(injectedInto($IBar)); // Use rebind for conditional

            // Bar needs IValue
            kernel.bind($IBar).toClass(Bar, inject => [inject.to($IValue)]);
            
            // Foo injects Bar
            kernel.bind($IFoo).toClass(Foo, inject => [
                inject.to($IBar)
            ]);

            const foo = kernel.get<IFoo>($IFoo);
            const bar = kernel.get<IBar>($IBar);

            // Both should get 200 because IValue is directly injected into Bar
            expect(foo.bar.value).to.equal(200);
            expect(bar.value).to.equal(200);
        });

        it("should support hasAncestor predicate with fluent API", () => {
            const kernel = new StandardKernel();

            class Container {
                constructor(public wrapper: Wrapper) {}
            }

            class Wrapper {
                constructor(public leaf: Leaf) {}
            }

            class Leaf {
                constructor(public value: number) {}
            }

            const $Container = Symbol.for("Container");
            const $Wrapper = Symbol.for("Wrapper");
            const $Leaf = Symbol.for("Leaf");
            const $Value = Symbol.for("Value");

            // Bind fallback first, then use rebind for conditional override
            kernel.bind($Value).toConst(500); // fallback
            kernel.rebind($Value).toConst(1000).when(hasAncestor($Container)); // Use rebind

            kernel.bind($Container).toClass(Container, inject => [inject.to($Wrapper)]);
            kernel.bind($Wrapper).toClass(Wrapper, inject => [inject.to($Leaf)]);
            kernel.bind($Leaf).toClass(Leaf, inject => [inject.to($Value)]);

            // When resolved through Container, should use hasAncestor binding
            const container = kernel.get<Container>($Container);
            expect(container.wrapper.leaf.value).to.equal(1000);

            // When resolved directly, should use fallback
            const directWrapper = kernel.get<Wrapper>($Wrapper);
            expect(directWrapper.leaf.value).to.equal(500);

            const directLeaf = kernel.get<Leaf>($Leaf);
            expect(directLeaf.value).to.equal(500);
        });

        it("should handle injectedInto with .as() parameter names", () => {
            const kernel = new StandardKernel();

            class Config {
                constructor(public dbUrl: string, public apiUrl: string) {}
            }

            const $Config = Symbol.for("Config");
            const $String = Symbol.for("String");

            // Bind fallback first, then use rebind for conditionals
            kernel.bind($String).toConst("fallback");
            
            kernel.rebind($String)
                .toConst("api://example.com")
                .when(ctx => ctx.target === "apiUrl");
            
            kernel.rebind($String)
                .toConst("db://localhost")
                .when(ctx => ctx.target === "dbUrl");

            kernel.bind($Config).toClass(Config, inject => [
                inject.to<string>($String).as("dbUrl"),
                inject.to<string>($String).as("apiUrl")
            ]);

            const config = kernel.get<Config>($Config);
            expect(config.dbUrl).to.equal("db://localhost");
            expect(config.apiUrl).to.equal("api://example.com");
        });

        it("should support chained when predicates acting as AND", () => {
            const kernel = new StandardKernel();

            const $IBar = Symbol.for("IBar");
            const $IFoo = Symbol.for("IFoo");

            // Bind fallback first, then use rebind for conditional
            kernel.bind($IBar).toConst({ value: 42 } as IBar); // fallback
            
            // Both conditions must be true - use rebind
            kernel.rebind($IBar)
                .toConst({ value: 777 } as IBar)
                .when(injectedInto($IFoo))
                .when(ctx => ctx.target === "special");

            kernel.bind($IFoo).toClass(Foo, inject => [
                inject.to<IBar>($IBar).as("special")
            ]);

            const foo = kernel.get<IFoo>($IFoo);
            expect(foo.bar.value).to.equal(777); // Both conditions met

            // Direct resolution should use fallback
            const directBar = kernel.get<IBar>($IBar);
            expect(directBar.value).to.equal(42);
        });
    });
});


