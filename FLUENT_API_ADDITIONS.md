# Fluent API Provider Analysis & Proposals

## Current Provider Support Analysis

### ✅ Already Supported in Fluent API

1. **`.to<T>(service?)`** - Redirect to another service
2. **`.toClass(ctor, builder)`** - Instantiate class with dependencies
3. **`.toFunc(func, builder)`** - Call function with dependencies
4. **`.toConst(value)`** - Bind constant value
5. **`.toSelf(ctor)`** - Auto-infer class dependencies (requires transformer)
6. **`.toProvider(provider)`** - Use custom provider function
7. **`.when(predicate)`** - Conditional binding
8. **`.inSingletonScope()`** - Singleton scoping
9. **`.inTransientScope()`** - Transient scoping (default)

### ❌ Missing from Fluent API

1. **`defer(provider, fieldProviders)`** - Deferred/lazy field injection for cyclic dependencies
2. **`maybe(provider, fallback)`** - Fallback value if resolution fails
3. **`name(target, provider)`** - Name injection sites for child predicates
4. **`whenAll(predicates, provider)`** - Multiple AND conditions
5. **`toAll<T>(service)`** - Resolve all bindings (only available in inject builder, not top-level)

## Proposed Additions

### 1. `.toDefer()` - Critical for Cyclic Dependencies ⭐

**Use Case:** Break cyclic dependencies by lazy-injecting fields after construction.

**Signature:**
```ts
interface IFluentBindingProviderSelection<T> {
  toDefer<C extends Constructor>(
    ctor: C,
    constructorBuilder: (inject: IFluentProviderBuilderFactory) => [...FluentProviderBuilderWrap<ConstructorParameters<C>>],
    fieldBuilder: (inject: IFluentProviderBuilderFactory) => { [K in keyof InstanceType<C>]?: IFluentProviderArgumentBuilder<InstanceType<C>[K]> }
  ): IFluentBindingConditionsScope<InstanceType<C>>;
}
```

**Example:**
```ts
kernel.bind<Foo>()
  .toClass(Foo, inject => [inject.to<Bar>()])
  .inSingletonScope();

kernel.bind<Bar>()
  .toDefer(Bar, () => [], (inject) => ({
    foo: inject.to<Foo>()  // Lazy-injected after construction
  }))
  .inSingletonScope();
```

**Documentation Note:** Must use with singletons to avoid infinite loops.

---

### 2. `.toMaybe()` - Optional Dependencies with Fallback ⭐

**Use Case:** Provide fallback when a service isn't registered (graceful degradation).

**Signature:**
```ts
interface IFluentBindingProviderSelection<T> {
  // Resolve another service with fallback
  toMaybe<U>(service: Service, fallback: U): IFluentBindingConditionsScope<U>;
  toMaybe<U>(fallback: U): IFluentBindingConditionsScope<U>; // with transformer
  
  // Wrap any provider with fallback
  toMaybeProvider<U = T>(provider: IProvider<U>, fallback: U): IFluentBindingConditionsScope<U>;
}
```

**Example:**
```ts
// Fallback to console.log if no ILogger registered
kernel.bind<ILogger>()
  .toMaybe<ILogger>(
    { log: (msg) => console.log(msg) }
  );

// Or with explicit service
kernel.bind<IConfig>()
  .toMaybe(Symbol.for("IConfig"), { port: 3000 });
```

---

### 3. `.withTarget()` - Named Injection Sites 🔧

**Use Case:** Allow child bindings to predicate based on parameter name (not just parent class).

**Signature:**
```ts
interface IFluentProviderArgumentBuilder<T> {
  withTarget(targetName: string): IFluentProviderArgumentBuilder<T>;
}
```

**Example:**
```ts
kernel.bind<Database>().toClass(Database, inject => [
  inject.to<IConfig>().withTarget("dbConfig")  // Name this injection site
]);

kernel.bind<IConfig>()
  .toConst({ host: "localhost" })
  .when(ctx => ctx.target === "dbConfig");
```

**Note:** This is what `name()` provider does, but it's not in fluent API. The `.as()` method currently provides target names for toClass/toFunc, so this might overlap. Consider if `.as()` should handle this.

---

### 4. `.whenAll()` - Multiple AND Predicates 🔧

**Use Case:** Require multiple conditions to be true.

**Signature:**
```ts
interface IFluentBindingConditionsScope<T> {
  whenAll(...predicates: Array<(ctx: IContext) => boolean>): IFluentBindingConditionsScope<T>;
}
```

**Example:**
```ts
kernel.bind<ILogger>()
  .toClass(FileLogger)
  .whenAll(
    ctx => ctx.parent?.target === Symbol.for("App"),
    ctx => process.env.NODE_ENV === "production"
  );
```

**Alternative:** Chain `.when()` calls since they wrap providers:
```ts
kernel.bind<ILogger>()
  .toClass(FileLogger)
  .when(ctx => ctx.parent?.target === Symbol.for("App"))
  .when(ctx => process.env.NODE_ENV === "production");
```

**Decision:** Chaining `.when()` already works. `whenAll()` is sugar but not critical.

---

### 5. Support `inject.toAll<T>()` in Nested Builders ✅

**Status:** This actually might already work, but needs verification.

**Use Case:** Get all bindings of a type as array dependency.

**Example:**
```ts
kernel.bind<IPlugin>().toClass(PluginA);
kernel.bind<IPlugin>().toClass(PluginB);

kernel.bind<App>().toClass(App, inject => [
  inject.toAll<IPlugin>()  // Should resolve to [PluginA, PluginB]
]);
```

**Check:** Verify if `IFluentProviderBuilderFactory` already has `toAll` method.

---

## Priority Recommendations

### Must Have (Breaking Cyclic Dependencies)
1. **`.toDefer()`** ⭐⭐⭐ - Critical missing feature, documented in README but not implemented

### Should Have (Common Patterns)
2. **`.toMaybe()`** ⭐⭐ - Graceful degradation pattern is common

### Nice to Have (Convenience)
3. **`.whenAll()`** ⭐ - Can be done with chained `.when()`, but explicit is clearer
4. **Verify `inject.toAll<T>()`** ⭐ - Might already work

### Lower Priority (Niche)
5. **`.withTarget()`** or extending `.as()` - The `.as()` method exists but may need documentation

---

## Implementation Plan

### Phase 1: Critical
- [ ] Implement `.toDefer()` in `IFluentBindingProviderSelection`
- [ ] Add tests for cyclic dependency resolution
- [ ] Update MIGRATING.md with correct `.toDefer()` syntax
- [ ] Update README.md examples

### Phase 2: Common Patterns  
- [ ] Implement `.toMaybe()` and `.toMaybeProvider()`
- [ ] Add tests for fallback scenarios
- [ ] Document graceful degradation pattern

### Phase 3: Verification & Polish
- [ ] Verify `inject.toAll<T>()` works in builders
- [ ] Add test if not covered
- [ ] Consider `.whenAll()` vs chained `.when()`
- [ ] Document `.as()` usage for named injection sites

### Phase 4: Documentation
- [ ] Update all README examples to use available fluent methods
- [ ] Add troubleshooting section for common patterns
- [ ] Create advanced usage guide

---

## API Design Notes

### toDefer() Signature Considerations

**Option A: Separate constructor + fields**
```ts
.toDefer(Bar, () => [], (inject) => ({ foo: inject.to<Foo>() }))
```
✅ Clear separation
✅ Type-safe fields
❌ Requires empty array for zero-arg constructors

**Option B: Combined builder**
```ts
.toDefer(Bar, (inject) => ({
  constructorArgs: [],
  deferredFields: { foo: inject.to<Foo>() }
}))
```
✅ Single callback
❌ Less clear intent
❌ More complex type signature

**Recommendation:** Use Option A for clarity.

### toMaybe() Behavior

Should only catch `ResolveError` (no bindings found), not runtime errors during resolution. This matches the current `maybe()` provider behavior.

```ts
try {
  return provider(ctx);
} catch (err) {
  if (err instanceof ResolveError) return fallback;
  throw err; // Rethrow actual resolution errors
}
```

---

## Breaking Changes

None of these additions are breaking changes - they're pure additions to the fluent API.
