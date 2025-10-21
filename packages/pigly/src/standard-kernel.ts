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
import { toSelf as toSelfProvider } from "./providers/to-self";

/**
 * Fluent provider argument builder - supports .as() for parameter names and .when() for predicates
 */
class FluentProviderArgumentBuilder<T> implements IFluentProviderArgumentBuilder<T> {
  constructor(private provider: IProvider<T>) {}

  as(parameterName: string): IProviderWithMetadata<T> {
    return {
      provider: this.provider,
      target: parameterName
    };
  }

  when(predicate: (ctx: IContext) => boolean): IFluentProviderArgumentBuilder<T> {
    return new FluentProviderArgumentBuilder(when(predicate, this.provider));
  }

  _getProvider(): IProvider<T> {
    return this.provider;
  }
}

/**
 * Fluent provider builder implementation
 */
class FluentProviderBuilder<T> implements IFluentProviderBuilder<T> {
  constructor(private provider: IProvider<T>) {}

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
    // Builder returns array that could contain IFluentProviderArgumentBuilder or IProviderWithMetadata
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(item => {
        // Check if it's already metadata (from .as()) or needs conversion
        return 'provider' in item && 'target' in item 
          ? item as IProviderWithMetadata<any>
          : (item as IFluentProviderArgumentBuilder<any>)._getProvider();
      }) as any;
    return new FluentProviderBuilder(toClassProvider(ctor, ...providers)) as unknown as IFluentProviderBuilder<InstanceType<C>>;
  }

  toConst<U = T>(value: U): IFluentProviderBuilder<U> {
    return new FluentProviderBuilder(toConst(value)) as unknown as IFluentProviderBuilder<U>;
  }

  toSelf<C extends Constructor>(ctor: C): IFluentProviderBuilder<InstanceType<C>> {
    return new FluentProviderBuilder(toSelfProvider(ctor)) as unknown as IFluentProviderBuilder<InstanceType<C>>;
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
      .map(item => {
        return 'provider' in item && 'target' in item 
          ? item as IProviderWithMetadata<any>
          : (item as IFluentProviderArgumentBuilder<any>)._getProvider();
      }) as any;
    return new FluentProviderBuilder(toFuncProvider(func, ...providers)) as unknown as IFluentProviderBuilder<ReturnType<F>>;
  }

  use(provider: IProvider<T>): IFluentProviderBuilder<T> {
    return new FluentProviderBuilder(provider);
  }

  _getProvider(): IProvider<T> {
    return this.provider;
  }
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
      .map(item => {
        return 'provider' in item && 'target' in item 
          ? item as IProviderWithMetadata<any>
          : (item as IFluentProviderArgumentBuilder<any>)._getProvider();
      }) as any;
    return new FluentProviderArgumentBuilder(toClassProvider(ctor, ...providers));
  }

  toConst<U>(value: U): IFluentProviderArgumentBuilder<U> {
    return new FluentProviderArgumentBuilder(toConst(value));
  }

  toSelf<C extends Constructor>(ctor: C): IFluentProviderArgumentBuilder<InstanceType<C>> {
    return new FluentProviderArgumentBuilder(toSelfProvider(ctor));
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
      .map(item => {
        return 'provider' in item && 'target' in item 
          ? item as IProviderWithMetadata<any>
          : (item as IFluentProviderArgumentBuilder<any>)._getProvider();
      }) as any;
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
    private service: Service
  ) {}

  to<U = T>(targetService?: Service): IFluentBindingConditionsScope<U> {
    if (!isService(targetService)) {
      throw new Error("Service parameter is required. Either provide a Symbol or use @pigly/transformer for type-based resolution.");
    }
    const provider = to<U>(targetService);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient);
    return new FluentBindingConditionsScope<U>(binding);
  }

  toClass<C extends Constructor>(
    ctor: C,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<ConstructorParameters<C>>]
  ): IFluentBindingConditionsScope<InstanceType<C>> {
    const providerBuilders = builder(providerBuilderFactory);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(item => {
        return 'provider' in item && 'target' in item 
          ? item as IProviderWithMetadata<any>
          : (item as IFluentProviderArgumentBuilder<any>)._getProvider();
      });
    const provider = toClassProvider(ctor, ...providers as any);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient);
    return new FluentBindingConditionsScope<InstanceType<C>>(binding);
  }

  toSelf<C extends Constructor>(ctor: C): IFluentBindingConditionsScope<InstanceType<C>> {
    const provider = toSelfProvider(ctor);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient);
    return new FluentBindingConditionsScope<InstanceType<C>>(binding);
  }

  toFunc<F extends ((...args: any[]) => any)>(
    func: F,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<Parameters<F>>]
  ): IFluentBindingConditionsScope<ReturnType<F>> {
    const providerBuilders = builder(providerBuilderFactory);
    const providers = ([...providerBuilders] as (IFluentProviderArgumentBuilder<any> | IProviderWithMetadata<any>)[])
      .map(item => {
        return 'provider' in item && 'target' in item 
          ? item as IProviderWithMetadata<any>
          : (item as IFluentProviderArgumentBuilder<any>)._getProvider();
      });
    const provider = toFuncProvider(func, ...providers as any);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient);
    return new FluentBindingConditionsScope<ReturnType<F>>(binding);
  }

  toConst<U = T>(value: U): IFluentBindingConditionsScope<U> {
    const provider = toConst(value);
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient);
    return new FluentBindingConditionsScope<U>(binding);
  }

  toProvider<U = T>(provider: IProvider<U>): IFluentBindingConditionsScope<U> {
    if (!isProvider(provider)) {
      throw Error("argument must be a provider function");
    }
    const binding = this.kernel._addBinding(this.service, provider, Scope.Transient);
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
 * Note: subsequent calls to bind with the same service will act as a rebinding, such that the latest binding is used first. 
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
    
    return new FluentBindingProviderSelection<T>(this, service);
  }

  /**
   * Internal method to add a binding - used by fluent interface
   * @internal
   */
  _addBinding<T>(service: Service, provider: IProvider<T>, scope: Scope): IBinding {
    // Call parent's protected method
    return super._addBinding(service, provider, scope);
  }
}