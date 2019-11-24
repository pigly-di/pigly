# Pigly 
unobtrusive, manually configured, dependency-injection for javascript/typescript

![alt](https://avatars0.githubusercontent.com/u/50213493?s=400&u=65942b405a979397a2c358366db85c3d06f521f5&v=4)

⚠️⚠️ WARNING: experimental - lock to minor versions ⚠️⚠️

![CircleCI](https://img.shields.io/circleci/build/github/pigly-di/pigly?token=abc123def456) ![npm](https://img.shields.io/npm/v/pigly) ![npm](https://img.shields.io/npm/dm/pigly) ![Codecov](https://img.shields.io/codecov/c/gh/pigly-di/pigly)


## Philosophy 

> don't pollute the code with DI concerns 

pigly is a simple helper to manually configure a DI container to bind symbols to providers. It explicitly avoids decorators, or any other changes to existing code, and on its own doesn't require any other dependency / compilation-step to work. However, when combined with the typescript transformer `@pigly/transformer` we can reduce the amount of boiler-plate and simply describe the bindings as: 

```ts
let kernel = new Kernel();

kernel.bind(toSelf(Foo));
kernel.bind(toSelf(Bar));

kernel.bind<IFoo>(to<Foo>());
kernel.bind<IBar>(to<Bar>());

let foo = kernel.get<IFoo>();
```

## Planned features

* Scoping
* Better inferring of constructors

## Native Usage

native usage relates to using this package directly without any typescript transformer. 

Its pretty simple: create a kernel, create symbol-to-provider bindings, then get the resolved result with `get(symbol)` 

```ts
import { Kernel } from 'pigly';

let kernel = new Kernel();

kernel.bind(Symbol.for("Foo"), (ctx)=>{ return "foo" });

let foo = kernel.get(Symbol.for("Foo));
```

### .bind(symbol, provider)

bind links a specific symbol to a provider of the form (context)=>value;

```ts
kernel.bind(A, _=>{ return "hello world" })
```

### .get(symbol)

resolve all the bindings for a symbol and return the first one

```ts
const A = Symbol.for("A")

kernel.bind(A, _=> "hello");
kernel.bind(A, _=> " world");

let result = kernel.get(A); // "hello";
```

### .getAll(symbol)

resolve all the bindings for a symbol and return all of the results. 

```ts
const A = Symbol.for("A")

kernel.bind(A, _=> "hello");
kernel.bind(A, _=> " world");

let results = kernel.getAll(A); // ["hello", " world"];
```

## Providers

### to(symbol)

used to redirect a binding to and resolve it through a different symbol. 

```ts
const A = Symbol.for("A")
const B = Symbol.for("B")

kernel.bind(A, to(B));
kernel.bind(B, _ => "hello world");
```

### toAll(symbol)

used to resolve a symbol to all its bindings

```ts
const A = Symbol.for("A")
const B = Symbol.for("A");

kernel.bind(A, _ => "hello");
kernel.bind(A, _ => "world");
kernel.bind(B, toAll(A));

kernel.get(B); // ["hello", "world"]

```

### toClass(Ctor, ...providers)

used to provide an instantiation of a class. first parameter should be the class constructor and then it takes a list of providers that will be used, in the given order, to resolve the constructor arguments.  

```ts
class Foo{
  constructor(public message: string)
}

const A = Symbol.for("A")
const B = Symbol.for("B")

kernel.bind(B, _=>"hello world");
kernel.bind(A, toClass(Foo, to(B)))
```

### toConst(value)

a more explicit way to provide a constant

```ts
kernel.bind(B, toConst("hello world"));
```

### asSingleton(provider)

used to cache the output of the given provider so that subsequent requests will return the same result. 

```ts
const A = Symbol.for("A");
const B = Symbol.for("B");

kernel.bind(A, toClass(Foo));
kernel.bind(B, asSingleton(to(A)));
```

### when(predicate, provider)

used to predicate a provider for some condition. **any provider that explicitly returns `undefined` is ignored**

```ts
const A = Symbol.for("A");
const B = Symbol.for("B");
const C = Symbol.for("C");

kernel.bind(A, toClass(Foo, to(C) ));
kernel.bind(B, toClass(Foo, to(C) ));

kernel.bind(C, when(x=>x.parent.target == A, toConst("a")));
kernel.bind(C, when(x=>x.parent.target == B, toConst("b")));
```

## Predicates

### injectedInto(symbol)

returns true if `ctx.parent.target == symbol`

```ts
const A = Symbol.for("A");
const B = Symbol.for("B");
const C = Symbol.for("C");

kernel.bind(A, toClass(Foo, to(C) ));
kernel.bind(B, toClass(Foo, to(C) ));

kernel.bind(C, when(injectedInto(A), toConst("a")));
kernel.bind(C, when(injectedInto(B), toConst("b")));
```

### hasAncestor(symbol)

returns true if an request ancestor is equal to the symbol. 

```ts
  const A = Symbol.for("A");
  const B = Symbol.for("B");
  const C = Symbol.for("C");

  kernel.bind(A, when(hasAncestor(C), toConst("foo")));
  kernel.bind(A, toConst("bar")));  
  kernel.bind(B, to(A));
  kernel.bind(C, to(B));

  let c = kernel.get(C); // "foo"
  let b = kernel.get(B); // "bar"
```

## Transformer Usage

with '@pigly/transformer' installed (see https://github.com/pigly-di/pigly/packages/pigly-transformer) you are able to omit manually creating a symbol. Currently 

* `.bind<T>(provider)` 
* `.get<T>()`
* `to<T>()`
* `toAll<T>()`
* `toSelf<T>(Class)`
* `injectedInto<T>()`
* `hasAncestor<T>()`
* `Inject<T>()`

are supported. 

### Example

```ts
class Foo implements IFoo{
  constructor(public name: string){}
}

let kernel = new Kernel();

kernel.bind(toSelf(Foo));

kernel.bind<string>(
  when(injectedInto<Foo>(
    toConst("joe")));

kernel.bind<IFoo>(to<Foo>());

let foo = kernel.get<IFoo>();
```

## toSelf<T>(Class)

attempts to infer the constructor arguments and generate the providers needed to initialise the class. It can only do so if the constructor arguments are simple. Currently only supports the _first_ constructor. 

```ts
kernel.bind(toSelf(Foo));
```
is equivalent to 
```ts
kernel.bind(toClass(Foo, to<IBar>, to...
```


## SymbolFor<T>()

calls to SymbolFor<T>() get replaced with `symbol.for("<T>")` through `@pigly/transformer` and can be used if you want to be closer to the native usage i.e.  

```ts
let kernel = new Kernel();

const $IFoo = SymbolFor<IFoo>();
const $IBar = SymbolFor<IBar>();

kernel.bind<IFoo>($IFoo, toClass(Foo, to<IBar>($IBar)));
kernel.bind<IBar>($IBar, toClass(Bar));

let foo = kernel.get<IFoo>($IFoo);
```

The current approach in the transformer, to make the type's symbol, is to use the imported name directly i.e. `SymbolFor<IFoo>()` is converted to `Symbol.for("IFoo")`. The intention here is to give most flexibility and consistently in how the Symbols are created, especially if you want to configure a container across multiple independently-compiled libraries, or when using the transformer in a "transform only" build stage, as is typically the case with Webpack and Vue. The downside is that you must be consistent with type names, avoid renaming during imports and do not implement two or more interfaces with the exact same identifier-name. 

## License
MIT

## Credits

"pig" licensed under CC from Noun Project, Created by habione 404, FR 

@pigly/transformer was derived from https://github.com/YePpHa/ts-di-transformer  (MIT)