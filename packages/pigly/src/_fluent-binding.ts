import { IProvider, ProviderWrap } from "./_provider";
import { IProviderWithMetadata } from "./_provider-metadata";
import { IBinding } from "./_binding";
import { IContext } from "./_context";
import { Scope } from "./_scope";
import { Service } from "./_service";
import { Constructor } from "./_constructor";

/**
 * Wraps a tuple type to convert each element to IFluentProviderArgumentBuilder<T> | IProviderWithMetadata<T>
 * This allows the builder callback to return either fluent builders or metadata objects
 */
export type FluentProviderBuilderWrap<T> = T extends readonly any[]
  ? {
    readonly [P in keyof T]: IFluentProviderArgumentBuilder<T[P]> | IProviderWithMetadata<T[P]>;
  } : readonly [];

/**
 * Fluent interface for adding metadata to a provider argument
 * Used when building constructor/function arguments
 */
export interface IFluentProviderArgumentBuilder<T> {
  /** Specify the parameter name for this argument */
  as(parameterName: string): IProviderWithMetadata<T>;
  
  /** Add a custom when predicate (wraps provider) */
  when(predicate: (ctx: IContext) => boolean): IFluentProviderArgumentBuilder<T>;
}

/**
 * Helper type to extract the result type from a generic type constructor
 */
type Apply<F, T> = F extends { __type: infer R } ? R : never;

/**
 * Type constructor for IFluentProviderBuilder
 */
interface FluentProviderBuilderCtor {
  __type: IFluentProviderBuilder<this['__arg']>;
  __arg: unknown;
}

/**
 * Type constructor for IFluentBindingConditionsScope  
 */
interface FluentBindingConditionsScopeCtor {
  __type: IFluentBindingConditionsScope<this['__arg']>;
  __arg: unknown;
}

/**
 * Type constructor for IFluentProviderArgumentBuilder
 */
interface FluentProviderArgumentBuilderCtor {
  __type: IFluentProviderArgumentBuilder<this['__arg']>;
  __arg: unknown;
}

/**
 * Common interface for fluent provider construction methods
 * @param T - The default type for this builder/factory
 * @param R - A type constructor that maps from a type U to the return type
 */
interface IFluentProviderConstructionMethods<T, R extends { __type: any; __arg: any }> {
  /** Bind to resolve another service (runtime symbol) */
  to<U>(service: Service): Apply<R & { __arg: U }, U>;
  /** Bind to resolve another service (transformer API - type gets converted to Symbol.for("U")) */
  to<U>(): Apply<R & { __arg: U }, U>;
  
  /** Bind to self-resolving class (requires transformer) */
  toSelf<C extends Constructor>(ctor: C): Apply<R & { __arg: InstanceType<C> }, InstanceType<C>>;
  
  /** Bind to a constant value */
  toConst<U = T>(value: U): Apply<R & { __arg: U }, U>;
  
  /** Bind to a custom provider */
  toProvider<U = T>(provider: IProvider<U>): Apply<R & { __arg: U }, U>;

  /** Resolve to a class instance with type-safe constructor arguments */
  toClass<C extends Constructor>(
    ctor: C,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<ConstructorParameters<C>>]
  ): Apply<R & { __arg: InstanceType<C> }, InstanceType<C>>;
  
  /** Resolve to a function result with type-safe function arguments */
  toFunc<F extends ((...args: any[]) => any)>(
    func: F,
    builder: (inject: IFluentProviderBuilderFactory<any>) => [...FluentProviderBuilderWrap<Parameters<F>>]
  ): Apply<R & { __arg: ReturnType<F> }, ReturnType<F>>;
}

/**
 * Fluent provider builder that can construct nested dependencies
 */
export interface IFluentProviderBuilder<T> extends IFluentProviderConstructionMethods<T, FluentProviderBuilderCtor> {
}

/**
 * Factory for creating fluent provider builders
 * This is the inject parameter passed to builder callbacks
 * Returns IFluentProviderArgumentBuilder to allow .named() and .when() on arguments
 */
export interface IFluentProviderBuilderFactory<T> extends IFluentProviderConstructionMethods<T, FluentProviderArgumentBuilderCtor> {
}

/**
 * Fluent interface for selecting a provider after binding a service
 */
export interface IFluentBindingProviderSelection<T> extends IFluentProviderConstructionMethods<T, FluentBindingConditionsScopeCtor> {
}

/**
 * Fluent interface for adding conditions and scope to a binding
 * This is stateless - each method modifies the underlying binding
 */
export interface IFluentBindingConditionsScope<T> {
  /** Add a condition to the binding */
  when(predicate: (ctx: IContext) => boolean): IFluentBindingConditionsScope<T>;

  /** Set the scope for the binding */
  inScope(scope: Scope): IFluentBindingConditionsScope<T>;

  /** Set the binding to singleton scope */
  inSingletonScope(): IFluentBindingConditionsScope<T>;

  /** Set the binding to transient scope (default) */
  inTransientScope(): IFluentBindingConditionsScope<T>;

  /** Get the underlying binding (for advanced scenarios) */
  getBinding(): IBinding;
}
