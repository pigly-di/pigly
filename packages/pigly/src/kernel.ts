import { IContext } from "./_context";
import { IProvider } from "./_provider";
import { IBinding } from "./_binding";
import { IKernel } from "./_kernel";
import { Service, isService } from "./_service";
import { IRequest } from "./_request";
import { IResolution } from "./_resolution";


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

  resolve<T>(request: IRequest): IResolution<T> {
    const self = this;
    return {
      [Symbol.iterator]() { return self._resolve(request) },
      toArray: function () {
        return Array.from(self._resolve(request));
      },
      first: function () {
        for (let item of self._resolve(request)) {
          if (item !== undefined) return item;
        }
      }
    }
  }

  /** Resolve the request to bindings and return resolution results */
  private *_resolve<T>(request: IRequest) {
    let bindings = this._bindings.get(request.service);
    let target = request.service;

    let _parent = request.parent;
    while (_parent != undefined) {
      if (_parent.target == target) {
        throw Error("Cyclic Dependency Found.");
      }
      _parent = _parent.parent;
    };

    let wasResolved = false;

    if (bindings != undefined) {
      for (let binding of bindings) {
        let ctx: IContext = {
          kernel: this,
          parent: request.parent,
          target: request.service,
          name: request.name,
          resolve: (request: IRequest) => this.resolve(Object.assign({ parent: ctx }, request))
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
      let _parent = request.parent;
      while (_parent != undefined) {
        history.push(_parent.target);
        _parent = _parent.parent;
      };

      let msg = history.reduceRight((p, n) => p += " > " + n.toString(), "")

      throw Error("could not resolve " + request.service.valueOf().toString() + msg);
    }
  }

  /** REQUIRES TRANSFORMER - resolve an interface to a value */
  get<T>(): T;
  /** resolve a symbol to a value */
  get<T>(service: Service): T
  get<T>(service?: Service): T {
    if (isService(service) == false) throw Error('called "get" without a service');
    return this.resolve<T>({ service }).first();
  }

  /** REQUIRES TRANSFORMER - resolve an interface to a value array */
  getAll<T>(): T[];
  /** resolve a symbol to a value array*/
  getAll<T>(service: Service): T[]
  getAll<T>(service?: Service): T[] {
    if (isService(service) == false) throw Error('called "getAll" without a service');
    return this.resolve<T>({ service }).toArray();
  }
}
