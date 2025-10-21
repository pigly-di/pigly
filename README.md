# Pigly 
unobtrusive, manually configured, dependency-injection for javascript/typescript

![alt](https://avatars0.githubusercontent.com/u/50213493?s=400&u=65942b405a979397a2c358366db85c3d06f521f5&v=4)

[![CI](https://github.com/pigly-di/pigly/actions/workflows/ci.yml/badge.svg)](https://github.com/pigly-di/pigly/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/pigly)](https://www.npmjs.com/package/pigly) [![npm](https://img.shields.io/npm/dm/pigly)](https://www.npmjs.com/package/pigly) [![codecov](https://codecov.io/gh/pigly-di/pigly/branch/develop/graph/badge.svg)](https://codecov.io/gh/pigly-di/pigly)

> don't pollute the code with DI concerns 

pigly is a simple helper to manually configure a DI container to bind symbols to providers. It explicitly avoids decorators, or any other changes to existing code, and on its own doesn't require any other dependency / compilation-step to work. However, when combined with the typescript transformer `@pigly/transformer` we can reduce the amount of boiler-plate and simply describe the bindings as: 

```ts
interface INinja {
  weapon: IWeapon;
}
interface IWeapon {
  name: string;
}

class Ninja implements INinja {
  constructor(public weapon: IWeapon) { }
}

class Axe implements IWeapon {
  name = "axe";
}

const kernel = new StandardKernel();

kernel.bind<INinja>().toSelf(Ninja);
kernel.bind<IWeapon>().toSelf(Axe);

const ninja = kernel.get<INinja>();
```

## Planned features

* Better inferring of constructors

## Migrating from Legacy Kernel

If you're upgrading from the legacy `Kernel` API, see **[MIGRATING.md](./MIGRATING.md)** for a complete migration guide.

## Native Usage

native usage relates to using this package directly without any typescript transformer. 

Its pretty simple: create a kernel, create symbol-to-provider bindings, then get the resolved result with `get(symbol)` 

```ts
import { StandardKernel } from 'pigly';

const kernel = new StandardKernel();

kernel.bind(Symbol.for("Foo")).toFunc(() => "foo");

const foo = kernel.get(Symbol.for("Foo"));
```

### .bind(symbol)

bind returns a fluent builder for configuring how a symbol resolves. Chain with `.toClass()`, `.toFunc()`, `.toConst()`, etc.

```ts
const A = Symbol.for("A");
kernel.bind(A).toFunc(() => "hello world");
```

### .get(symbol)

resolve all the bindings for a symbol and return the first one

```ts
const A = Symbol.for("A");

kernel.bind(A).toConst("hello");
kernel.bind(A).toConst(" world");

const result = kernel.get(A); // "hello";
```

### .getAll(symbol)

resolve all the bindings for a symbol and return all of the results. 

```ts
const A = Symbol.for("A");

kernel.bind(A).toConst("hello");
kernel.bind(A).toConst(" world");

const results = kernel.getAll(A); // ["hello", " world"];
```

## Providers

### .to() (with transformer) or inject.to()

Used to redirect a binding to resolve through a different symbol. With the transformer, use `.to<T>()`. For manual dependency injection, use the `inject` parameter.

```ts
const A = Symbol.for("A");
const B = Symbol.for("B");

kernel.bind(A).toClass(Foo, inject => [inject.to(B)]);
kernel.bind(B).toConst("hello world");
```

### inject.toAll()

Used to resolve a symbol to all its bindings.

```ts
const A = Symbol.for("A");
const B = Symbol.for("B");

kernel.bind(A).toConst("hello");
kernel.bind(A).toConst("world");
kernel.bind(B).toClass(Foo, inject => [inject.toAll(A)]);

kernel.get(B); // Foo instance with ["hello", "world"] as constructor arg
```

### .toClass(Ctor, dependencies?)

Used to instantiate a class. Takes the constructor and an optional function that receives an `inject` helper to resolve dependencies.

```ts
class Foo {
  constructor(public message: string) {}
}

const A = Symbol.for("A");
const B = Symbol.for("B");

kernel.bind(B).toConst("hello world");
kernel.bind(A).toClass(Foo, inject => [inject.to(B)]);
```

### .toConst(value)

Binds a constant value.

```ts
const B = Symbol.for("B");
kernel.bind(B).toConst("hello world");
```

### .inSingletonScope()

Caches the resolution so subsequent requests return the same instance.

```ts
const A = Symbol.for("A");

kernel.bind(A).toClass(Foo).inSingletonScope();

const a = kernel.get(A);
const b = kernel.get(A);
assert(a === b); // true
```

### .when(predicate)

Conditionally applies a binding. **Any provider that returns `undefined` is ignored.**

```ts
const A = Symbol.for("A");
const B = Symbol.for("B");
const C = Symbol.for("C");

kernel.bind(A).toClass(Foo, inject => [inject.to(C)]);
kernel.bind(B).toClass(Foo, inject => [inject.to(C)]);

kernel.bind(C).toConst("a").when(ctx => ctx.parent?.target === A);
kernel.bind(C).toConst("b").when(ctx => ctx.parent?.target === B);
```

### .toDefer(Ctor, dependencies, deferred)

Defers injection (lazy injection) into created objects. Works around cyclic dependencies by lazy-injecting one dependency. **IMPORTANT:** Must use singletons to avoid cyclic loops.

```ts
class Foo {
  constructor(public bar: Bar) {}
}

class Bar {
  foo!: Foo;
  constructor() {}
}

const $Foo = Symbol.for("Foo");
const $Bar = Symbol.for("Bar");

kernel.bind($Foo)
  .toClass(Foo, inject => [inject.to($Bar)])
  .inSingletonScope(); // IMPORTANT

kernel.bind($Bar)
  .toDefer(Bar, () => [], { foo: inject => inject.to($Foo) })
  .inSingletonScope(); // IMPORTANT

const foo = kernel.get($Foo);
const bar = kernel.get($Bar);
```


## Predicates

### injectedInto(symbol) (predicate)

Returns true if `ctx.parent?.target === symbol`. Use with `.when()`.

```ts
import { injectedInto } from 'pigly';

const A = Symbol.for("A");
const B = Symbol.for("B");
const C = Symbol.for("C");

kernel.bind(A).toClass(Foo, inject => [inject.to(C)]);
kernel.bind(B).toClass(Foo, inject => [inject.to(C)]);

kernel.bind(C).toConst("a").when(injectedInto(A));
kernel.bind(C).toConst("b").when(injectedInto(B));
```

### hasAncestor(symbol) (predicate)

Returns true if any request ancestor equals the symbol. Use with `.when()`.

```ts
import { hasAncestor } from 'pigly';

const A = Symbol.for("A");
const B = Symbol.for("B");
const C = Symbol.for("C");

kernel.bind(A).toConst("foo").when(hasAncestor(C));
kernel.bind(A).toConst("bar");
kernel.bind(B).toClass(Wrapper, inject => [inject.to(A)]);
kernel.bind(C).toClass(Container, inject => [inject.to(B)]);

const c = kernel.get(C); // A resolves to "foo"
const b = kernel.get(B); // A resolves to "bar"
```

## Transformer Usage

With `@pigly/transformer` installed (see [transformer README](https://github.com/pigly-di/pigly/tree/develop/packages/pigly-transformer)), you can omit manually creating symbols. The transformer converts type parameters to `Symbol.for()` calls at compile time.

**Supported transformations:**
* `kernel.bind<T>()` → `kernel.bind(Symbol.for("T"))`
* `kernel.get<T>()` → `kernel.get(Symbol.for("T"))`
* `kernel.getAll<T>()` → `kernel.getAll(Symbol.for("T"))`
* `kernel.resolve<T>()` → `kernel.resolve(Symbol.for("T"))`
* `inject.to<T>()` → `inject.to(Symbol.for("T"))`
* `injectedInto<T>()` → `injectedInto(Symbol.for("T"))`
* `hasAncestor<T>()` → `hasAncestor(Symbol.for("T"))`
* `SymbolFor<T>()` → `Symbol.for("T")` 

### Example

```ts
import { StandardKernel, injectedInto } from 'pigly';

class Foo implements IFoo {
  constructor(public name: string) {}
}

const kernel = new StandardKernel();

kernel.bind<Foo>().toSelf(Foo);

kernel.bind<string>()
  .toConst("joe")
  .when(injectedInto<Foo>());

kernel.bind<IFoo>().toClass(Foo, inject => [inject.to<string>()]);

const foo = kernel.get<IFoo>();
```

## .toSelf(Class)

Automatically infers constructor arguments and generates the needed providers. Only works with simple constructor signatures (interfaces/classes). Uses the first constructor only.

```ts
kernel.bind<IFoo>().toSelf(Foo);
```

With the transformer, this is equivalent to:

```ts
kernel.bind<IFoo>().toClass(Foo, inject => [
  inject.to<IBar>(),
  inject.to<IBaz>(),
  // ... for each constructor parameter
]);
```


## SymbolFor<T>()

The transformer converts `SymbolFor<T>()` to `Symbol.for("T")`. Useful when you want explicit symbol references.

```ts
import { StandardKernel, SymbolFor } from 'pigly';

const kernel = new StandardKernel();

const $IFoo = SymbolFor<IFoo>();
const $IBar = SymbolFor<IBar>();

kernel.bind($IFoo).toClass(Foo, inject => [inject.to($IBar)]);
kernel.bind($IBar).toClass(Bar);

const foo = kernel.get($IFoo);
```

The current approach in the transformer, to make the type's symbol, is to use the imported name directly i.e. `SymbolFor<IFoo>()` is converted to `Symbol.for("IFoo")`. The intention here is to give most flexibility and consistently in how the Symbols are created, especially if you want to configure a container across multiple independently-compiled libraries, or when using the transformer in a "transform only" build stage, as is typically the case with Webpack and Vue. The downside is that you must be consistent with type names, avoid renaming during imports and do not implement two or more interfaces with the exact same identifier-name. 

## Scoping

Scoping affects how and when a service resolution is cached. By default all bindings are transient.  

### Singleton
the resolution of a service is cached in the root resolver, such that every request for the same service will receive the same  instance

```ts
kernel.bind<IFoo>(toClass(Foo), Scope.Singleton);

const a = kernel.get<IFoo>();
const b = kernel.get<IFoo>();

assert(a === b); //true
```
### Transient
the resolution of a service is cached in the root resolver, such that every request for the same service will receive the same  instance

```ts
kernel.bind<IFoo>(toClass(Foo), Scope.Transient);
// or 
kernel.bind<IFoo>(toClass(Foo));

const a = kernel.get<IFoo>();
const b = kernel.get<IFoo>();

assert(a !== b); //true
```

### Request

with request scoping, the resolution is cached by the current request 'scope' symbol. In a HTTP2 server example, we could decide to make a new 'scope' for each new stream connection. In this context, we can bind services to be unique, but cached, within each HTTP2 Stream 

```ts
class Foo { 
  constructor(
    public bar1: Bar, 
    public bar2: Bar){
    }
};

const HTTP2Request = Symbol('http2')

kernel.bind<Foo>(toClass(Foo, to<Bar>())));
kernel.bind<Bar>(toClass(Bar), HTTP2Request);

const a = kernel.get<Foo>();
const b = kernel.get<Foo>();

assert(a !== b); //true - Foo binding transient
assert(b.bar1 !== a.bar1); //true - 
assert(a.bar1 === a.bar2); //true
assert(b.bar1 === b.bar2); //true
```




## License
MIT

## Credits

"pig" licensed under CC from Noun Project, Created by habione 404, FR 

@pigly/transformer was derived from https://github.com/YePpHa/ts-di-transformer  (MIT)
