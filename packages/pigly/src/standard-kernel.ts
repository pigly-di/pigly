import { Service, isService } from "./_service";
import { AbstractKernel } from "./kernel";
import { IFluentBindingProviderSelection, IFluentBindingConditionsScope, IFluentProviderBuilder, IFluentProviderBuilderFactory, IFluentProviderArgumentBuilder, FluentProviderBuilderWrap } from "./_fluent-binding";
import { IProvider, isProvider, ProviderWrap } from "./_provider";
import { IProviderWithMetadata } from "./_provider-metadata";
import { IBinding } from "./_binding";
import { IContext } from "./_context";
import { Scope } from "./_scope";
import { Constructor } from "./_constructor";
import { when } from "./providers/when";
import { to } from "./providers/to";
import { toConst } from "./providers/to-const";
import { toFunc as toFuncProvider } from "./providers/to-func";
import { toClass as toClassProvider } from "./providers/to-class";

/**
 * Private symbol for accessing the provider from fluent builders
 * This keeps the provider hidden from end users while allowing internal access
 * @internal
 */
const PROVIDER_SYMBOL = Symbol('pigly.provider');

/**
 * Fluent provider argument builder - supports .as() for parameter names and .when() for predicates
 */
class FluentProviderArgumentBuilder<T> implements IFluentProviderArgumentBuilder<T> {
  private [PROVIDER_SYMBOL]: IProvider<T>;

  constructor(provider: IProvider<T>) {
    this[PROVIDER_SYMBOL] = provider;
  }

  as(parameterName: string): IProviderWithMetadata<T> {
    return {
      provider: this[PROVIDER_SYMBOL],
      target: parameterName
    };
  }

  when(predicate: (ctx: IContext) => boolean): IFluentProviderArgumentBuilder<T> {
    return new FluentProviderArgumentBuilder(when(predicate, this[PROVIDER_SYMBOL]));
  }
}

/**
 * Fluent provider builder implementation
 */
class FluentProviderBuilder<T> implements IFluentProviderBuilder<T> {
  private [PROVIDER_SYMBOL]: IProvider<T>;

  constructor(provider: IProvider<T>) {
    this[PROVIDER_SYMBOL] = provider;
  }

  to<U>(service?: Service): IFluentProviderBuilder<U> {
    if (!isService(service)) {
      throw new Error("Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution.");
    }
    return new FluentProviderBuilder(to<U>(service)) as unknown as IFluentProviderBuilder<U>;
  }

  toClass<C extends Constructor>(
    ctor: C,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<ConstructorParameters<C>>]
  ): IFluentProviderBuilder<InstanceType<C>> {
    const providerBuilders = builder(providerBuilderFactory);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(extractProviderFromBuilder) as any;
    return new FluentProviderBuilder(toClassProvider(ctor, ...providers)) as unknown as IFluentProviderBuilder<InstanceType<C>>;
  }

  toConst<U = T>(value: U): IFluentProviderBuilder<U> {
    return new FluentProviderBuilder(toConst(value)) as unknown as IFluentProviderBuilder<U>;
  }

  toProvider<U = T>(provider: IProvider<U>): IFluentProviderBuilder<U> {
    return new FluentProviderBuilder(provider) as unknown as IFluentProviderBuilder<U>;
  }

  toFunc<F extends ((...args: any[]) => any)>(
    func: F,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<Parameters<F>>]
  ): IFluentProviderBuilder<ReturnType<F>> {
    const providerBuilders = builder(providerBuilderFactory);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(extractProviderFromBuilder) as any;
    return new FluentProviderBuilder(toFuncProvider(func, ...providers)) as unknown as IFluentProviderBuilder<ReturnType<F>>;
  }

  use(provider: IProvider<T>): IFluentProviderBuilder<T> {
    return new FluentProviderBuilder(provider);
  }
}

/**
 * Helper function to extract provider from fluent builder or metadata object
 * @internal
 */
function extractProviderFromBuilder(item: IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>): IProvider<any> | IProviderWithMetadata<any> {
  // Check if it's already metadata (from .as())
  // Only need to check for 'provider' property since target is optional
  if ('provider' in item && typeof (item as any).provider === 'function') {
    return item as IProviderWithMetadata<any>;
  }
  // Extract provider using symbol
  return (item as any)[PROVIDER_SYMBOL];
}

/**
 * Factory for creating fluent provider builders
 */
class FluentProviderBuilderFactoryImpl implements IFluentProviderBuilderFactory<any> {
  to<U>(service?: Service): IFluentProviderArgumentBuilder<U> {
    if (!isService(service)) {
      throw new Error("Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution.");
    }
    return new FluentProviderArgumentBuilder(to<U>(service));
  }

  toClass<C extends Constructor>(
    ctor: C,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<ConstructorParameters<C>>]
  ): IFluentProviderArgumentBuilder<InstanceType<C>> {
    const providerBuilders = builder(this);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(extractProviderFromBuilder) as any;
    return new FluentProviderArgumentBuilder(toClassProvider(ctor, ...providers));
  }

  toConst<U>(value: U): IFluentProviderArgumentBuilder<U> {
    return new FluentProviderArgumentBuilder(toConst(value));
  }

  toProvider<U>(provider: IProvider<U>): IFluentProviderArgumentBuilder<U> {
    return new FluentProviderArgumentBuilder(provider);
  }

  toFunc<F extends ((...args: any[]) => any)>(
    func: F,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<Parameters<F>>]
  ): IFluentProviderArgumentBuilder<ReturnType<F>> {
    const providerBuilders = builder(this);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(extractProviderFromBuilder) as any;
    return new FluentProviderArgumentBuilder(toFuncProvider(func, ...providers));
  }

  use<T>(provider: IProvider<T>): IFluentProviderBuilder<T> {
    return new FluentProviderBuilder(provider);
  }
}

// Singleton instance of provider builder factory
const providerBuilderFactory = new FluentProviderBuilderFactoryImpl();

/**
 * Fluent implementation of binding provider selection
 */
class FluentBindingProviderSelection<T> implements IFluentBindingProviderSelection<T> {
  constructor(
    private kernel: StandardKernel,
    private service: Service,
    private rebind: boolean = false
  ) {}

  to<U = T>(targetService?: Service): IFluentBindingConditionsScope<U> {
    if (!isService(targetService)) {
      throw new Error("Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution.");
    }
    const provider = to<U>(targetService);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient, this.rebind);
    return new FluentBindingConditionsScope<U>(binding);
  }

  toClass<C extends Constructor>(
    ctor: C,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<ConstructorParameters<C>>]
  ): IFluentBindingConditionsScope<InstanceType<C>> {
    const providerBuilders = builder(providerBuilderFactory);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(extractProviderFromBuilder);
    const provider = toClassProvider(ctor, ...providers as any);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient, this.rebind);
    return new FluentBindingConditionsScope<InstanceType<C>>(binding);
  }

  toFunc<F extends ((...args: any[]) => any)>(
    func: F,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<Parameters<F>>]
  ): IFluentBindingConditionsScope<ReturnType<F>> {
    const providerBuilders = builder(providerBuilderFactory);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(extractProviderFromBuilder);
    const provider = toFuncProvider(func, ...providers as any);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient, this.rebind);
    return new FluentBindingConditionsScope<ReturnType<F>>(binding);
  }

  toConst<U = T>(value: U): IFluentBindingConditionsScope<U> {
    const provider = toConst(value);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient, this.rebind);
    return new FluentBindingConditionsScope<U>(binding);
  }

  toProvider<U = T>(provider: IProvider<U>): IFluentBindingConditionsScope<U> {
    if (!isProvider(provider)) {
      throw Error("argument must be a provider function");
    }
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient, this.rebind);
    return new FluentBindingConditionsScope<U>(binding);
  }
}

/**
 * Fluent implementation of binding conditions and scope
 * This is stateless - each method modifies the underlying binding directly
 */
class FluentBindingConditionsScope<T> implements IFluentBindingConditionsScope<T> {
  constructor(private binding: IBinding) {}

  when(predicate: (ctx: IContext) => boolean): IFluentBindingConditionsScope<T> {
    // Wrap the existing provider with the when condition
    const wrappedProvider = when(predicate, this.binding.provider);
    this.binding.provider = wrappedProvider;
    return this;
  }

  inScope(scope: Scope): IFluentBindingConditionsScope<T> {
    this.binding.scope = scope;
    return this;
  }

  inSingletonScope(): IFluentBindingConditionsScope<T> {
    return this.inScope(Scope.Singleton);
  }

  inTransientScope(): IFluentBindingConditionsScope<T> {
    return this.inScope(Scope.Transient);
  }

  getBinding(): IBinding {
    return this.binding;
  }
}

/**
 * Standard kernel with fluent binding API. 
 * Bindings resolve in the order they are added.
 * Use rebind() to replace existing bindings (last binding wins).
 */
export class StandardKernel extends AbstractKernel {
  /**Bind a Symbol to a provider using fluent interface */
  bind<T>(service: Service): IFluentBindingProviderSelection<T>;
  /**Bind interface T to a provider using fluent interface - note requires compile-time @pigly/transformer */
  bind<T>(): IFluentBindingProviderSelection<T>;
  /** runtime method */
  bind<T>(service?: Service): IFluentBindingProviderSelection<T> {
    if (!isService(service)) {
      throw new Error("Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution.");
    }
    
    return new FluentBindingProviderSelection<T>(this, service, false);
  }

  /**Rebind a Symbol to a provider using fluent interface - prepends binding so it's checked first */
  rebind<T>(service: Service): IFluentBindingProviderSelection<T>;
  /**Rebind interface T to a provider using fluent interface - note requires compile-time @pigly/transformer */
  rebind<T>(): IFluentBindingProviderSelection<T>;
  /** runtime method */
  rebind<T>(service?: Service): IFluentBindingProviderSelection<T> {
    if (!isService(service)) {
      throw new Error("Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution.");
    }
    
    return new FluentBindingProviderSelection<T>(this, service, true);
  }

  /**
   * Internal method to add a binding - used by fluent interface
   * @internal
   */
  _addBinding<T>(service: Service, provider: IProvider<T>, scope: Scope, rebind: boolean = false): IBinding {
    // Call parent's protected method
    return super._addBinding(service, provider, scope, rebind);
  }
}