interface SymbolFor<T> { }

export interface IResolverRoot {
  resolve<T>(service: symbol): T[];
}

export interface IContext extends IResolverRoot {
  target: symbol;
  parent?: IContext;
}

export interface IBinding {
  provider: (ctx: IContext) => any
}

export interface IProvider<T> {
  (ctx: IContext): T;
}

export class Kernel implements IResolverRoot {
  private _bindings = new Map<symbol, IBinding[]>()

  bind<T>(service: symbol, provider: IProvider<T>) {
    let bindings: IBinding[] = [];

    if (this._bindings.has(service)) {
      bindings = this._bindings.get(service);
    }
    bindings.push({ provider });

    this._bindings.set(service, bindings);
  }

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

  get<T>(service: symbol): T {
    return this.resolve<T>(service)[0];
  }
}

export function to<T>(service: symbol): IProvider<T> {
  return (ctx) => ctx.resolve(service)[0] as T;
}
export function toAll<T>(service: symbol): IProvider<T[]> {
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

export function toClass<T>(ctor: Newable0<T>)
export function toClass<T, P1>(ctor: Newable1<T, P1>, p1: IProvider<P1>)
export function toClass<T, P1, P2>(ctor: Newable2<T, P1, P2>, p1: IProvider<P1>, p2: IProvider<P2>)
export function toClass<T, P1, P2, P3>(ctor: Newable3<T, P1, P2, P3>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P2>)
export function toClass(ctor: any, ...providers: IProvider<any>[]) {
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