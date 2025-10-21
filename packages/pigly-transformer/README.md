# Pigly/transformer
[![CI](https://github.com/pigly-di/pigly/actions/workflows/ci.yml/badge.svg)](https://github.com/pigly-di/pigly/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/@pigly/transformer)](https://www.npmjs.com/package/@pigly/transformer) [![npm](https://img.shields.io/npm/dm/@pigly/transformer)](https://www.npmjs.com/package/@pigly/transformer) [![codecov](https://codecov.io/gh/pigly-di/pigly/branch/develop/graph/badge.svg)](https://codecov.io/gh/pigly-di/pigly)

TypeScript transformer for Pigly dependency injection that converts type parameters into runtime symbols.

![alt](https://avatars0.githubusercontent.com/u/50213493?s=400&u=65942b405a979397a2c358366db85c3d06f521f5&v=4)

## Overview

The transformer eliminates the need to manually write `Symbol.for("TypeName")` everywhere by automatically injecting symbols at compile-time based on TypeScript type parameters.

**Without transformer:**
```typescript
kernel.bind(Symbol.for("ILogger")).toClass(ConsoleLogger, () => []);
kernel.bind(Symbol.for("IApp")).toClass(App, inject => [
  inject.to(Symbol.for("ILogger"))
]);
```

**With transformer:**
```typescript
kernel.bind<ILogger>().toClass(ConsoleLogger, () => []);
kernel.bind<IApp>().toClass(App, inject => [
  inject.to<ILogger>()  // Automatically becomes: inject.to(Symbol.for("ILogger"))
]);
```

## Installation

```bash
npm install --save-dev @pigly/transformer ts-patch
```

## Setup

You must use a TypeScript compiler that supports transformers. We recommend `ts-patch`:

### 1. Patch TypeScript

```bash
npx ts-patch install
```

### 2. Configure tsconfig.json

Add the transformer plugin:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "@pigly/transformer"
      }
    ]
  }
}
```

### 3. Update package.json scripts

Use `ts-patch/compiler` instead of `tsc`:

```json
{
  "scripts": {
    "build": "tsc --build",
    "test": "cross-env TS_NODE_COMPILER=ts-patch/compiler mocha"
  }
}
```

## What Gets Transformed

### StandardKernel (Recommended)

#### `kernel.bind<T>()`
```typescript
kernel.bind<IService>().toConst(value);
// Becomes: kernel.bind(Symbol.for("IService")).toConst(value)
```

#### `kernel.get<T>()`, `kernel.getAll<T>()`, `kernel.resolve<T>()`
```typescript
const service = kernel.get<IService>();
const all = kernel.getAll<IService>();
const resolution = kernel.resolve<IService>({ service: Symbol.for("IService") });
// All become: kernel.METHOD(Symbol.for("IService"))
```

#### `inject.to<T>()` in builders
```typescript
kernel.bind<IApp>().toClass(App, inject => [
  inject.to<ILogger>(),
  inject.to<IConfig>()
]);
// Becomes: inject.to(Symbol.for("ILogger")), inject.to(Symbol.for("IConfig"))
```

#### Nested builders
```typescript
kernel.bind<IApp>().toClass(App, i1 => [
  i1.toClass(Logger, i2 => [
    i2.to<IConfig>()  // Works in any nesting level
  ])
]);
```

#### Methods that DON'T need transformation
These methods infer types from their arguments, so no transformation needed:
- `inject.toClass(Constructor, ...)` - Infers from constructor
- `inject.toFunc(function, ...)` - Infers from function
- `inject.toSelf(Constructor)` - Infers from constructor
- `inject.toConst(value)` - No type parameter
- `.when(predicate)` - No type parameter
- `.inSingletonScope()`, `.inTransientScope()`, `.inScope()` - No type parameter

### Legacy Kernel (Deprecated)

The transformer still supports the old Kernel API for backward compatibility:

```typescript
kernel.bind<IService>(toConst(value));
kernel.bind(toSelf(MyClass));
```

### Helper Functions

#### `SymbolFor<T>()`
```typescript
const $IService = SymbolFor<IService>();
// Becomes: Symbol.for("IService")
```

#### Predicate functions
```typescript
injectedInto<ParentClass>()
hasAncestor<AncestorClass>()
// Both convert type parameters to symbols
```

## Supported Type Patterns

### ✅ Interfaces
```typescript
interface IService {}
kernel.bind<IService>().toConst(impl);
```

### ✅ Generics
```typescript
interface ICache<T> {}
kernel.bind<ICache<string>>().toConst(cache);
kernel.bind<ICache<number>>().toConst(numCache);
// Different type parameters = different symbols
```

### ✅ Primitives
```typescript
kernel.bind<string>().toConst("config");
kernel.bind<number>().toConst(42);
```

### ✅ typeof
```typescript
const config = { port: 3000 };
kernel.bind<typeof config>().toConst(config);
```

### ⚠️ Whitespace Normalization
```typescript
// These all resolve to the same symbol:
ICache<string>
ICache  <  string  >
ICache<string  >
```

### ❌ Not Supported
- Type aliases (use explicit symbols)
- Union types `A | B`
- Intersection types `A & B`
- Conditional types

## Debugging

Enable debug logging to see what the transformer is doing:

**Linux/Mac:**
```bash
export PIGLY_DEBUG=true
npm test
```

**Windows (PowerShell):**
```powershell
$env:PIGLY_DEBUG="true"
npm test
```

**Windows (CMD):**
```cmd
set PIGLY_DEBUG=true
npm test
```

Debug output shows:
- Which method calls are being transformed
- Type parameters detected
- Generated symbol names
- Why certain nodes are skipped

Example output:
```
[PIGLY_TRANSFORM] Checking property method: kernel.bind, typeArgs: 1, methodArgs: 0
[PIGLY_TRANSFORM] Transforming bind<T>() to bind(Symbol.for("T"))
[PIGLY_TRANSFORM] Checking property method: inject.to, typeArgs: 1, methodArgs: 0
[PIGLY_TRANSFORM] Transforming .to<T>() to .to(Symbol.for("T"))
```

## Migration Guide

### From Old Kernel to StandardKernel

**Before:**
```typescript
import { Kernel, toClass, to, toConst } from 'pigly';

const kernel = new Kernel();
kernel.bind<ILogger>(toClass(ConsoleLogger));
kernel.bind<IApp>(toClass(App, to<ILogger>()));
```

**After:**
```typescript
import { StandardKernel } from 'pigly';

const kernel = new StandardKernel();
kernel.bind<ILogger>().toClass(ConsoleLogger, () => []);
kernel.bind<IApp>().toClass(App, inject => [
  inject.to<ILogger>()
]);
```

### Benefits of StandardKernel
- Fluent, chainable API
- Type-safe builder callbacks
- Better IDE autocomplete
- Explicit parameter metadata with `.as("name")`
- More intuitive scoping: `.inSingletonScope()`

## When Do You Need the Transformer?

### ✅ Use transformer when:
- You want clean, type-based bindings
- Working with many interfaces
- Building complex dependency graphs
- You prefer `bind<T>()` over `bind(Symbol.for("T"))`

### ❌ Don't need transformer when:
- Using explicit symbols everywhere
- Building a plugin/library that exports symbols
- Need runtime control over symbol names
- Working with dynamic types

You can mix both approaches:
```typescript
// Explicit symbol
export const $ILogger = Symbol.for("ILogger");
kernel.bind($ILogger).toClass(Logger, () => []);

// Transformer-based
kernel.bind<IApp>().toClass(App, inject => [
  inject.to($ILogger)  // Use explicit symbol
]);
```

## Troubleshooting

### Transformer not working

1. **Verify ts-patch is installed:**
   ```bash
   npx ts-patch check
   ```

2. **Check tsconfig.json has the plugin configured**

3. **Ensure using ts-patch/compiler:**
   ```bash
   # Should show patched version
   npx tsc --version
   ```

4. **Enable debug logging** to see if transformer runs

### Type parameter not recognized

The transformer uses TypeScript's type checker. If a type isn't resolved:
- Ensure the type is imported/declared
- Check for type aliases (not fully supported)
- Try using explicit `Symbol.for()` for complex types

### Build performance

The transformer adds minimal overhead. For large projects:
- Use incremental builds: `tsc --incremental`
- Exclude test files from production builds
- Consider caching in CI/CD

## License
MIT

## Credits

"pig" licensed under CC from Noun Project, Created by habione 404, FR 

@pigly/transformer was derived from https://github.com/YePpHa/ts-di-transformer (MIT)
