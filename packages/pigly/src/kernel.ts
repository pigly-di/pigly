export declare function SymbolFor<T>(): symbol;

export interface IResolverRoot {
  resolve<T>(service: symbol): T[];
}

export interface IContext extends IResolverRoot {
  kernel: IReadOnlyKernel;
  target: symbol;
  parent?: IContext;
}

export interface IBinding {
  provider: (ctx: IContext) => any
}

export interface IProvider<T> {
  (ctx: IContext): T;
}

export interface IReadOnlyKernel extends IResolverRoot {
  get<T>(service: symbol): T;
}

export interface IKernel extends IReadOnlyKernel {
  /**Bind a Symbol to a provider */
  bind<T>(service: symbol, provider: IProvider<T>): void;
  /**REQUIRES TRANSFORMER: Bind interface T to a provider */
  bind<T>(provider: IProvider<T>): void;
}

export class Kernel implements IKernel {
  private _bindings = new Map<symbol, IBinding[]>()

  /**Bind a Symbol to a provider */
  bind<T>(service: symbol, provider: IProvider<T>): void;
  /**REQUIRES TRANSFORMER: Bind interface T to a provider */
  bind<T>(provider: IProvider<T>): void;
  bind<T>(service: any, provider?: IProvider<T>) {
    if (isSymbol(service) === false) {
      throw Error("first argument must be a symbol.");
    }

    let bindings: IBinding[] = [];
    if (this._bindings.has(service)) {
      bindings = this._bindings.get(service);
    }
    bindings.push({ provider });

    this._bindings.set(service, bindings);
  }
  /** Resolve the target symbol bindings to providers, execute them and return the results */
  resolve<T>(target: symbol, parent?: IContext): T[] {
    let bindings = this._bindings.get(target);
    let results: any[] = [];

    let _parent = parent;
    while (_parent != undefined) {
      if (_parent.target == target) {
        throw Error("Cyclic Dependency Found.");
      }
      _parent = _parent.parent;
    };

    for (let binding of bindings) {
      let ctx: IContext = {
        kernel: this,
        target,
        parent,
        resolve: (service: symbol) => this.resolve(service, ctx)
      }
      let resolved = binding.provider(ctx);
      if (resolved !== undefined) {
        results.push(resolved);
      }
    }
    return results;
  }

  /** REQUIRES TRANSFORMER - resolve an interface to a value */
  get<T>(): T;
  /** resolve a symbol to a value */
  get<T>(service: symbol): T
  get<T>(service?: symbol): T {
    if (typeof service !== "symbol") throw Error('called "get" without a service symbol');
    return this.resolve<T>(service)[0];
  }
}

/** REQUIRES TRANSFORMER - create a provider that resolves to another type */
export function to<T>(): IProvider<T>
/** create a provider that resolves to another symbol */
export function to<T>(service: symbol): IProvider<T>
export function to<T>(service?: symbol): IProvider<T> {
  if (typeof service !== "symbol") throw Error('called "to" without a service symbol');
  return (ctx) => ctx.resolve(service)[0] as T;
}
/** REQUIRES TRANSFORMER - create a provider that resolves all bindings to a type */
export function toAll<T>(): IProvider<T[]>
/** create a provider that resolves all bindings to a symbol */
export function toAll<T>(service: symbol): IProvider<T[]>
export function toAll<T>(service?: symbol): IProvider<T[]> {
  if (typeof service !== "symbol") throw Error('called "toAll" without a service symbol');
  return (ctx) => ctx.resolve(service) as T[];
}

export function toValue<T>(value: T): IProvider<T> {
  return (_) => value;
}
export interface Newable0<T> {
  new(): T;
}
export interface Newable1<T, P1> {
  new(p1: P1): T;
}
export interface Newable2<T, P1, P2> {
  new(p1: P1, p2: P2): T;
}
export interface Newable3<T, P1, P2, P3> {
  new(p1: P1, p2: P2, p3: P3): T;
}

///** REQUIRES TRANSFORMER - create a class provider where the constructor arguments are exclusively interface types */
//export function toClass<T>(): IProvider<T>


/** create a class provider with zero constructor arguments*/
export function toClass<T>(ctor: Newable0<T>): IProvider<T>
/** create a class provider with one constructor arguments*/
export function toClass<T, P1>(ctor: Newable1<T, P1>, p1: IProvider<P1>): IProvider<T>
/** create a class provider with two constructor arguments*/
export function toClass<T, P1, P2>(ctor: Newable2<T, P1, P2>, p1: IProvider<P1>, p2: IProvider<P2>): IProvider<T>
/** create a class provider with three constructor arguments*/
export function toClass<T, P1, P2, P3>(ctor: Newable3<T, P1, P2, P3>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P2>): IProvider<T>
export function toClass(ctor?: any, ...providers: IProvider<any>[]) {
  if(ctor === undefined) throw Error('called "toClass" without a Constructor argument');
  
  /** this is a hack due to is being a pain in the ass to add "to()" and import in a transformer.
   * see https://github.com/Microsoft/TypeScript/issues/18369
   */
  /*providers = providers.map(x=>{
    if(typeof x === "symbol"){
      return to(x);
    }
    return x;
  })

  console.log(ctor);*/

  return (ctx: IContext) => {
    return new ctor(...providers.map(provider => provider(ctx)));
  }
}

export function toConst<T>(value: T) {
  return _ => {
    return value;
  };
}

export function asSingleton<T>(provider: IProvider<T>) {
  var cache: T = undefined;

  return (ctx: IContext) => {
    if (!cache) cache = provider(ctx);
    return cache;
  };
}

export function when<T>(predicate: (ctx: IContext) => boolean, provider: IProvider<T>) {
  return (ctx: IContext) => {
    if (predicate(ctx)) return provider(ctx);
  };
}

/** 
 * 
 * NOT RECOMMENDED: still possible to stack-overflow on non-singleton cyclic dependencies */
export function defer<T>(provider: IProvider<T>, inject: { [field: string]: symbol }) {
  return (ctx: IContext) => {
    let kernel = ctx.kernel;
    let resolved = provider(ctx);
    setImmediate(() => {
      for (let [key, target] of entries(inject)) {
        resolved[key] = kernel.get(target);
      }
    })
    return resolved;
  };
}

function entries(obj: { [field: string]: symbol }): Array<[string, symbol]> {
  var ownProps = Object.keys(obj),
    i = ownProps.length,
    resArray = new Array(i); // preallocate the Array
  while (i--)
    resArray[i] = [ownProps[i], obj[ownProps[i]]];

  return resArray;
};

function isSymbol(obj): obj is symbol {
  return typeof obj === "symbol";
}