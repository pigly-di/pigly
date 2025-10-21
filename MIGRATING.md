# Migrating from Legacy Kernel to StandardKernel

## Overview

StandardKernel introduces a fluent API that's more intuitive and composable than the legacy Kernel's function-based approach. The transformer (`@pigly/transformer`) now supports both APIs for backward compatibility.

## Key Differences

### API Style

**Legacy Kernel:**
```ts
kernel.bind(symbol, provider)
```

**StandardKernel:**
```ts
kernel.bind(symbol).toClass(...).when(...).inSingletonScope()
```

## Migration Guide

### 1. Basic Binding

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), ctx => "foo");
```

**After:**
```ts
kernel.bind(Symbol.for("Foo")).toFunc(() => "foo");
```

### 2. Class Instantiation

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), toClass(Foo, to(Symbol.for("Bar"))));
```

**After:**
```ts
kernel.bind(Symbol.for("Foo")).toClass(Foo, inject => [
  inject.to(Symbol.for("Bar"))
]);
```

### 3. Constants

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), toConst("value"));
```

**After:**
```ts
kernel.bind(Symbol.for("Foo")).toConst("value");
```

### 4. Singletons

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), asSingleton(toClass(Foo)));
```

**After:**
```ts
kernel.bind(Symbol.for("Foo")).toClass(Foo).inSingletonScope();
```

### 5. Conditional Binding

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), when(ctx => condition, toConst("value")));
```

**After:**
```ts
kernel.bind(Symbol.for("Foo")).toConst("value").when(ctx => condition);
```

### 6. Redirection (to)

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), to(Symbol.for("Bar")));
```

**After:**
```ts
kernel.bind(Symbol.for("Foo")).toClass(Wrapper, inject => [
  inject.to(Symbol.for("Bar"))
]);
```

Or with transformer:
```ts
kernel.bind<IFoo>().toClass(Foo, inject => [inject.to<IBar>()]);
```

### 7. Resolve All

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), toAll(Symbol.for("Bar")));
```

**After:**
```ts
kernel.bind(Symbol.for("Foo")).toClass(Consumer, inject => [
  inject.toAll(Symbol.for("Bar"))
]);
```

### 8. Deferred Injection

**Before:**
```ts
kernel.bind(Symbol.for("Foo"), 
  asSingleton(
    defer(toClass(Foo), { bar: to(Symbol.for("Bar")) })
  )
);
```

**After:**
```ts
kernel.bind(Symbol.for("Foo"))
  .toDefer(Foo, () => [], { bar: inject => inject.to(Symbol.for("Bar")) })
  .inSingletonScope();
```

## Transformer Usage Changes

### With Type Parameters (Recommended)

**Before:**
```ts
kernel.bind<IFoo>(toClass(Foo, to<IBar>()));
```

**After:**
```ts
kernel.bind<IFoo>().toClass(Foo, inject => [inject.to<IBar>()]);
```

Or using destructuring:
```ts
kernel.bind<IFoo>().toClass(Foo, ({to}) => [to<IBar>()]);
```

### toSelf Inference

**Before:**
```ts
kernel.bind<IFoo>(toSelf(Foo));
```

**After:**
```ts
kernel.bind<IFoo>().toSelf(Foo);
```

### Predicates

**Before:**
```ts
kernel.bind<string>(when(injectedInto<Foo>(), toConst("value")));
```

**After:**
```ts
kernel.bind<string>().toConst("value").when(injectedInto<Foo>());
```

## Complete Example

### Before (Legacy Kernel)

```ts
import { Kernel, toClass, toConst, to, asSingleton, when, injectedInto } from 'pigly';

const kernel = new Kernel();

kernel.bind<ILogger>(toClass(ConsoleLogger));
kernel.bind<IConfig>(asSingleton(toClass(Config)));
kernel.bind<string>(
  when(injectedInto<Config>(), toConst("config-value"))
);
kernel.bind<IApp>(toClass(App, to<ILogger>(), to<IConfig>()));

const app = kernel.get<IApp>();
```

### After (StandardKernel)

```ts
import { StandardKernel, injectedInto } from 'pigly';

const kernel = new StandardKernel();

kernel.bind<ILogger>().toClass(ConsoleLogger);
kernel.bind<IConfig>().toClass(Config).inSingletonScope();
kernel.bind<string>()
  .toConst("config-value")
  .when(injectedInto<Config>());
kernel.bind<IApp>().toClass(App, inject => [
  inject.to<ILogger>(),
  inject.to<IConfig>()
]);

const app = kernel.get<IApp>();
```

## Breaking Changes

1. **No standalone `to()`, `toClass()`, etc.** - These are now methods on the binding builder
2. **Dependency injection syntax** - Constructor dependencies now use `inject => [...]` instead of variadic providers
3. **Scope methods** - Use `.inSingletonScope()`, `.inTransientScope()`, `.inRequestScope()` instead of `asSingleton()` wrapper
4. **Conditions** - Use `.when()` as a method instead of `when()` wrapper
5. **Provider wrapping** - No more nested provider functions; use fluent chaining

## Backward Compatibility

The `@pigly/transformer` supports **both** APIs:
- Legacy: `kernel.bind<T>(provider)` 
- StandardKernel: `kernel.bind<T>().toClass(...)`

You can migrate incrementally, though mixing both styles in the same codebase is not recommended for clarity.

## Why Migrate?

✅ **More readable** - Fluent API reads left-to-right  
✅ **Better IDE support** - Autocomplete guides you through options  
✅ **Composable** - Chain conditions, scoping, and providers naturally  
✅ **Type-safe** - Better TypeScript inference with the fluent pattern  
✅ **Modern** - Aligns with contemporary API design patterns  

## Need Help?

- Check the [main README](./README.md) for complete StandardKernel documentation
- See [transformer README](./packages/pigly-transformer/README.md) for transformer setup
- Open an issue at https://github.com/pigly-di/pigly/issues
