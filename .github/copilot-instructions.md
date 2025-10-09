# Pigly Dependency Injection - AI Coding Instructions

## Project Overview
Pigly is a TypeScript dependency injection container focused on **manual configuration without decorators**. The project consists of two main packages in a Lerna monorepo:
- `packages/pigly/` - Core DI container with symbol-based bindings
- `packages/pigly-transformer/` - TypeScript transformer for compile-time type-to-symbol conversion

## Architecture Fundamentals

### Core DI Pattern
The kernel uses a **symbol-provider binding model** where:
- Services are bound to symbols using `kernel.bind(symbol, provider)`
- Providers are functions `(context) => value` that resolve dependencies
- Resolution follows a request chain with parent context tracking

### Key Components
- **Kernel** (`src/kernel.ts`) - Main container implementing `IKernel`
- **Providers** (`src/providers/`) - Factory functions (`to`, `toClass`, `toConst`, `defer`, etc.)
- **Predicates** (`src/predicates/`) - Conditional logic (`injectedInto`, `hasAncestor`, `named`)
- **Context** (`src/_context.ts`) - Resolution context with parent chain for cyclic detection

### Symbol Resolution Strategy
```typescript
// Native usage - explicit symbols
kernel.bind(Symbol.for("IFoo"), toClass(Foo, to(Symbol.for("IBar"))));

// Transformer usage - type-based symbols (requires @pigly/transformer)
kernel.bind<IFoo>(toClass(Foo, to<IBar>()));
```

## Development Workflow

### Build System
- **Lerna monorepo** with npm workspaces
- **Dual output**: CJS (`tsconfig.build.cjs.json`) and ESM (`tsconfig.build.esm.json`)
- **Coverage**: NYC with Mocha for testing

### Key Commands
```bash
# Root level
npm run build        # Build all packages
npm run test         # Test all packages
npm run coverage     # Generate coverage reports

# Package level
npm run build:cjs    # CommonJS build
npm run build:esm    # ES modules build
npm test            # Run tests with coverage
```

### Testing Patterns
Tests use **symbol-based bindings** extensively. Example pattern:
```typescript
const $IFoo = Symbol.for("IFoo");
kernel.bind($IFoo, toClass(Foo, to<IBar>()));
expect(kernel.get<IFoo>($IFoo)).to.be.instanceOf(Foo);
```

## Project-Specific Conventions

### Provider Implementation
All providers follow the signature `(context: IContext) => T` and must:
- Return `undefined` to skip binding (allows conditional providers)
- Use `ctx.createContext()` for nested resolution
- Check `ctx.parent` for injection context

### Error Handling
- **CyclicError** - Thrown when circular dependencies detected via parent chain analysis
- **ResolveError** - Thrown when no valid providers found, includes resolution history
- Detailed stack traces preserved via `getCallSite()` in bindings

### Scoping System
- **Transient** (default) - New instance per request
- **Singleton** - Cached in root resolver
- **Request** - Cached per resolution request scope

## Critical Integration Points

### TypeScript Transformer Integration
The `@pigly/transformer` package transforms:
- `bind<T>(provider)` → `bind(Symbol.for("T"), provider)`
- `get<T>()` → `get(Symbol.for("T"))`
- `SymbolFor<T>()` → `Symbol.for("T")`

**Build requirement**: Must use `ts-patch` compiler for transformer to work.

### Deferred Injection Pattern
Use `defer()` provider for circular dependencies:
```typescript
kernel.bind($Foo, asSingleton(toClass(Foo, to($Bar))));
kernel.bind($Bar, asSingleton(defer(toClass(Bar), { foo: to($Foo) })));
```

## File Organization Patterns

### Source Structure
- **Interfaces** prefixed with `_` (e.g., `_kernel.ts`, `_context.ts`)
- **Implementations** without prefix (e.g., `kernel.ts`)
- **Grouped exports** via `index.ts` files in subdirectories
- **Declarations** in separate `declarations.ts` for transformer compatibility

### Test Organization
- **Spec files** mirror source structure (`kernel.spec.ts` → `kernel.ts`)
- **Provider tests** in `test/providers/` subdirectory
- **Integration tests** cover complete binding → resolution cycles

## Development Guidelines

### Adding New Providers
1. Create provider function in `src/providers/`
2. Export from `src/providers/index.ts`
3. Add comprehensive tests covering edge cases
4. Document usage pattern in provider JSDoc

### Context Management
Always use `ctx.createContext()` when creating nested resolution requests to maintain proper parent chain for cyclic detection and conditional binding.

### Version Management
Project uses Lerna to coordinate version bumps across both packages.