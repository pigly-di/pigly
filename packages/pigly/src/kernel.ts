import { IContext } from "./_context";
import { IProvider } from "./_provider";
import { IReadOnlyKernel } from "./_read-only-kernel";
import { IBinding } from "./_binding";

export declare function SymbolFor<T>(): symbol;


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

    if (bindings != undefined) {
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
    }

    if (results.length == 0) {
      let history = [];
      let _parent = parent;
      while (_parent != undefined) {
        history.push(_parent.target);
        _parent = _parent.parent;
      };

      let msg = history.reduceRight((p, n) => p +=  " > " + n.toString(), "")

      throw Error("could not resolve " + target.valueOf().toString() + msg );
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

  /** REQUIRES TRANSFORMER - resolve an interface to a value array */
  getAll<T>(): T[];
  /** resolve a symbol to a value array*/
  getAll<T>(service: symbol): T[]
  getAll<T>(service?: symbol): T[] {
    if (typeof service !== "symbol") throw Error('called "get" without a service symbol');
    return this.resolve<T>(service);
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