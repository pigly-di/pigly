# Pigly 
unobtrusive, manually configured, dependency-injection for javascript/typescript

![alt](https://avatars0.githubusercontent.com/u/50213493?s=400&u=65942b405a979397a2c358366db85c3d06f521f5&v=4)

## Philosophy 

> don't pollute the code with DI concerns 

pigly is a simple helper to manually configure a DI container to bind symbols to providers. It explicitly avoids decorators, or any other changes to existing code, and on its own doesn't require any other dependency / compilation-step to work. However, when combined with the typescript transformer `@pigly/transformer` we can reduce the amount of boiler-plate and simply describe the bindings as: 

```
let kernel = new Kernel();

kernel.bind<IFoo>(toClass(Foo, to<IBar>()));
kernel.bind<IBar>(toClass(Bar));

let foo = kernel.get<IFoo>();
```

Fair-warning: this should be considered experimental until version 1.0 - lock to minor versions in the meantime. 

### Planned features

* Scoping
* omitting explicit provider configuration for class-constructors

## Native Usage

native usage relates to using this package directly without any typescript transformer. 

Its pretty simple: create a kernel, create symbol->provider bindings, then get the resolved result with `get(symbol)` 

```
import { Kernel } from 'pigly';

let kernel = new Kernel();

kernel.bind(Symbol.for("Foo"), (ctx)=>{ return "foo" });

let foo = kernel.get(Symbol.for("Foo));
```

### .bind(symbol, provider)

bind links a specific symbol to a provider of the form (context)=>value;

```
kernel.bind(A, _=>{ return "hello world" })
```

### .get(symbol)

resolve all the bindings for a symbol and return the first one

```
const A = Symbol.for("A")

kernel.bind(A, _=> "hello");
kernel.bind(A, _=> " world");

let result = kernel.get(A); // "hello";
```

### .getAll(symbol)

resolve all the bindings for a symbol and return all of the results. 

```
const A = Symbol.for("A")

kernel.bind(A, _=> "hello");
kernel.bind(A, _=> " world");

let results = kernel.getAll(A); // ["hello", " world"];
```

## Providers

### to(symbol)

used to redirect a binding to and resolve it through a different symbol. 

```
const A = Symbol.for("A")
const B = Symbol.for("B")

kernel.bind(A, to(B));
kernel.bind(B, _ => "hello world");
```

### toClass(Ctor, ...providers)

used to provide an instantiation of a class. first parameter should be the class constructor and then it takes a list of providers that will be used, in the given order, to resolve the constructor arguments.  

```
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

```
kernel.bind(B, toConst("hello world));
```

### asSingleton(provider)

used to cache the output of the given provider so that subsequent requests will return the same result. 

```
const A = Symbol.for("A");
const B = Symbol.for("B");

kernel.bind(A, toClass(Foo));
kernel.bind(B, asSingleton(to(A)));
```

### when(predicate, provider)

used to predicate a provider for some condition. **any provider that explicitly returns `undefined` is ignored**

```
const A = Symbol.for("A");
const B = Symbol.for("B");
const C = Symbol.for("C");

kernel.bind(A, toClass(Foo, to(C) ));
kernel.bind(B, toClass(Foo, to(C) ));

kernel.bind(C, when(x=>x.parent.target == A, toConst("a")));
kernel.bind(C, when(x=>x.parent.target == B, toConst("b")));
```

## Transformer Usage

with '@pigly/transformer' installed (see https://github.com/pigly-di/pigly/packages/pigly-transformer) you are able to omit manually creating a symbol. Currently `.bind<T>(provider)` `.get<T>()` as well as the provider functions `to<T>()` and `toAll<T>()` are supported. At present the type `T` _must_ be an interface type. 

### Example

```
let kernel = new Kernel();

kernel.bind<IFoo>(toClass(Foo, to<IBar>()));
kernel.bind<IBar>(toClass(Bar));

let foo = kernel.get<IFoo>();
```

## SymbolFor<T>()

calls to SymbolFor<T>() get replaced with `symbol.for("<name of T>-<T signature hash>")` through `@pigly/transformer` and can be used if you want to be closer to the native usage i.e. : 

```
let kernel = new Kernel();

const $IFoo = SymbolFor<IFoo>(),
const $IBar = SymbolFor<IBar>(),

kernel.bind<IFoo>($IFoo, toClass(Foo, to<IBar>($IBar,)));
kernel.bind<IBar>($IBar, toClass(Bar));

let foo = kernel.get<IFoo>($IFoo);
```

the current approach (in the transformer), to make the type's symbol, is to combine the declared type's name ("IFoo") with a sha256-hash (as a hex string) of a simplified "signature" of the type's property-names. basically this looks like: 

``` 
...
const props:any = decl.getProperties().map(x=>x.escapedName);  
const sig = hash(JSON.stringify(props));
const uid = decl.symbol.name + "_" + sig;
...

function hash(str: string): string
  const h = crypto.createHash('sha256');
  h.update(str);
  return h.digest('hex');
}
```

The intention here is to give most flexibility and consistently in how the Symbols are created, especially if you want to configure a container across multiple independenly-compiled libraries. Its possible that the way this hash is generated will change in future versions, if any issues arrise. 

## License
MIT

## Credits

"pig" licensed under CC from Noun Project, Created by habione 404, FR 

@pigly/transformer was derived from https://github.com/YePpHa/ts-di-transformer  (MIT)