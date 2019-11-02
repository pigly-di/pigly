import { IContext } from "./_context";
import { IProvider } from "./_provider";
import { IBinding } from "./_binding";
import { IKernel } from "./_kernel";
import { Service } from "./_service";

export class Kernel implements IKernel {
  private _bindings = new Map<symbol, IBinding[]>()

  /**Bind a Symbol to a provider */
  bind<T>(service: Service, provider: IProvider<T>): void;
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
  resolve<T>(target: Service, parent?: IContext): T[] {
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
          resolve: (service: Service) => this.resolve(service, ctx)
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
  get<T>(service: Service): T
  get<T>(service?: Service): T {
    if (typeof service !== "symbol") throw Error('called "get" without a service symbol');
    return this.resolve<T>(service)[0];
  }

  /** REQUIRES TRANSFORMER - resolve an interface to a value array */
  getAll<T>(): T[];
  /** resolve a symbol to a value array*/
  getAll<T>(service: Service): T[]
  getAll<T>(service?: Service): T[] {
    if (typeof service !== "symbol") throw Error('called "get" without a service symbol');
    return this.resolve<T>(service);
  }
}

function isSymbol(obj): obj is symbol {
  return typeof obj === "symbol";
}