# Pigly 
unobtrusive, manually configured, dependency-injection for javascript/typescript

![alt](https://avatars0.githubusercontent.com/u/50213493?s=400&u=65942b405a979397a2c358366db85c3d06f521f5&v=4)

## Philosophy 

> don't pollute the code with DI concerns 

pigly is a simple helper to manually configure a DI container to bind symbols to providers. It explicitly avoids decorators, or any other changes to existing code, and on its own doesn't require any other dependency / compilation step to work. 

The ultimate goal is to create a typescript transformer that can help with the generation of (consistent) Symbols so that we can avoid having to manage them manually. 

## Usage

create a kernel, create bindings then get the resolved result via its symbol. 

```
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

## helpers

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

used to predicate a provider for some condition. any provider that explicitly returns `undefined` is ignored

```
const A = Symbol.for("A");
const B = Symbol.for("B");
const C = Symbol.for("C");

kernel.bind(A, toClass(Foo, to(C) ));
kernel.bind(B, toClass(Foo, to(C) ));

kernel.bind(C, when(x=>x.parent.target == A, toConst("a")));
kernel.bind(C, when(x=>x.parent.target == B, toConst("b")));
```

## License
MIT

## Credits

"pig" licensed under CC from Noun Project, Created by habione 404, FR 

