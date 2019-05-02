# Pigly 
typescript compile-type Dependency-Resolution and run-time Dependency-Injection. 

## Goal

to turn this... 

```ts
let kernel = new Kernel();

kernel.bind<IFoo>().to<Foo>();
kernel.bind<IBar>().to<Bar>().whenInjectedInto<Foo>();

let foo = kernel.resolve<IFoo>()
```

into this... 

```ts
let kernel = new Kernel();

kernel.bind(Symbol.for("IFoo")).to(Symbol.for("Foo"), { ctor: Foo, args: { "bar": Symbol.for("IBar") } })
kernel.bind(Symbol.for("IBar")).to(Symbol.for("Bar"), { ctor: Bar }).whenInjectedInto(Symbol.for("Foo"));

let foo = kernel.resolve(Symbol.for("IFoo"))

```
