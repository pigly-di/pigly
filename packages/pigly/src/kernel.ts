import { IContext } from "./_context";
import { IProvider } from "./_provider";
import { IBinding } from "./_binding";
import { IKernel } from "./_kernel";
import { Service, isService } from "./_service";
import { first } from "./utils";

export class Kernel implements IKernel {
  private _bindings = new Map<symbol, IBinding[]>()

  /**Bind a Symbol to a provider */
  bind<T>(service: Service, provider: IProvider<T>): void;
  /**REQUIRES TRANSFORMER: Bind interface T to a provider */
  bind<T>(provider: IProvider<T>): void;
  bind<T>(service: any, provider?: IProvider<T>) {
    if (isService(service) === false) {
      throw Error("first argument must be a service type");
    }

    let bindings: IBinding[] = [];
    if (this._bindings.has(service)) {
      bindings = this._bindings.get(service);
    }
    bindings.push({ provider });

    this._bindings.set(service, bindings);
  }
  /** Resolve the target to providers, execute them and return the results */
  *resolve<T>(target: Service, parent?: IContext){
    let bindings = this._bindings.get(target);

    let _parent = parent;
    while (_parent != undefined) {
      if (_parent.target == target) {
        throw Error("Cyclic Dependency Found.");
      }
      _parent = _parent.parent;
    };

    let wasResolved = false;

    if (bindings != undefined) {
      for (let binding of bindings) {
        let ctx: IContext & { _resolveFirst, _resolveAll} = {
          kernel: this,
          target,
          parent,
          resolve: (service: Service) => this.resolve(service, ctx),
          /* these are needed to simplify the transformer */
          _resolveFirst: (service: Service) => first(this.resolve(service, ctx)),
          _resolveAll: (service: Service) => Array.from(this.resolve(service, ctx))
        }        
        let resolved = binding.provider(ctx);
        if (resolved !== undefined) {
          wasResolved = true;
          yield resolved;                              
        }
      }
    }

    if (wasResolved == false) {
      let history = [];
      let _parent = parent;
      while (_parent != undefined) {
        history.push(_parent.target);
        _parent = _parent.parent;
      };

      let msg = history.reduceRight((p, n) => p +=  " > " + n.toString(), "")

      throw Error("could not resolve " + target.valueOf().toString() + msg );
    }
  }

  /** REQUIRES TRANSFORMER - resolve an interface to a value */
  get<T>(): T;
  /** resolve a symbol to a value */
  get<T>(service: Service): T
  get<T>(service?: Service): T {
    if (isService(service) == false) throw Error('called "get" without a service');
    return first(this.resolve<T>(service));
  }

  /** REQUIRES TRANSFORMER - resolve an interface to a value array */
  getAll<T>(): T[];
  /** resolve a symbol to a value array*/
  getAll<T>(service: Service): T[]
  getAll<T>(service?: Service): T[] {
    if (isService(service) == false) throw Error('called "getAll" without a service');
    return Array.from(this.resolve<T>(service));
  }
}
