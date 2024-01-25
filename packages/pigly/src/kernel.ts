import { IContext } from "./_context";
import { IProvider, isProvider } from "./_provider";
import { IBinding } from "./_binding";
import { IKernel } from "./_kernel";
import { Service, isService } from "./_service";
import { IRequest } from "./_request";
import { IResolution } from "./_resolution";
import { Scope } from './_scope';
import { ResolveError } from "./errors";

function getCallSite(stack: string): string {
  const logLines = stack.split('\n');
  let caller = logLines[2];
  if (caller) { return caller.trim(); }
  return null;
}


export class Kernel implements IKernel {
  private _bindings = new Map<symbol, IBinding[]>();

  constructor(private opts = { verbose: false }) {

  }

  /**Bind a Symbol to a provider */
  bind<T>(service: Service, provider: IProvider<T>, scope?: Scope): IBinding;
  /**Bind interface T to a provider - note requires compile-time @pigly/transformer */
  bind<T>(provider: IProvider<T>, scope?: Scope): IBinding;
  bind<T>(...args: any[]): IBinding {
    const service: Service = args[0];
    const provider: IProvider<T> = args[1];
    const scope: Scope = args[2] ?? Scope.Transient;

    if (isService(service) === false) {
      throw Error("first argument must be a service type");
    }
    if (isProvider(provider) === false) {
      throw Error("second argument must be a provider function");
    }

    const site = getCallSite((new Error()).stack);

    let bindings: IBinding[] = [];

    if (this._bindings.has(service)) {
      bindings = this._bindings.get(service);
    }

    let binding = { provider, site, scope };

    bindings.push(binding);

    this._bindings.set(service, bindings);

    return binding;
  }

  resolve<T>(request: IRequest): IResolution<T> {
    const self = this;
    return {
      [Symbol.iterator]() { return self._resolve(request) },
      toArray: function () {
        return Array.from(self._resolve(request))
      },
      first: function () {
        return self._resolve(request).next().value;
      }
    }
  }

  /** Resolve the request to bindings and return resolution results */
  private *_resolve<T>(request: IRequest) {
    const service = request.service;
    const bindings = this._bindings.get(service);

    let wasResolved = false;

    if (bindings != undefined) {
      for (let binding of bindings) {
        const resolve = function (this: IContext, req: IRequest) {
          return this.kernel.resolve(Object.assign({ parent: this }, req));
        };
        const ctx: IContext = {
          kernel: this,
          request,
          parent: request.parent,
          service: request.service,
          binding: binding,
          resolve: null,
          createContext: function (_ctx: Partial<IContext>) {
            let result = Object.assign({}, ctx, _ctx, { parent: ctx });
            result.resolve = resolve.bind(result);
            return result
          }
        }
        ctx.resolve = resolve.bind(ctx);

        const scope = binding.scope;
        const cache = scope.getCache(ctx);

        if (cache.has(binding)) {
          yield cache.get(binding);
          continue;
        } else {
          this._checkCyclicDependency(request);

          let resolved = binding.provider(ctx);

          if (resolved !== undefined) {
            wasResolved = true;
            cache.set(binding, resolved);
            yield resolved;
          }
        }
      }
    }

    if (wasResolved == false) {
      let history = [];
      let _parent = request.parent;
      while (_parent != undefined) {
        history.push(_parent.service);
        _parent = _parent.parent;
      };

      let msg = history.reduceRight((p, n) => p += " > " + n.toString(), "")

      throw new ResolveError(request.service, msg);
    }
  }
  private _checkCyclicDependency(request: IRequest) {
    let target = request.service;
    let _parent = request.parent?.request;
    while (_parent != undefined) {
      if (_parent.service == target) {
        reportCyclicError(request)
      }
      _parent = _parent.parent;
    };
  }

  get<T>(): T;
  get<T>(service: Service): T;
  get<T>(service?: Service): any | Array<any> {
    if (isService(service) == false) throw Error('called "get" without a service');
    return this.resolve<T>({ service }).first();
  }
  getAll<T>(): T;
  getAll<T>(service: Service): T;
  getAll<T>(service?: Service): any | Array<any> {
    if (isService(service) == false) throw Error('called "get" without a service');
    return this.resolve<T>({ service }).toArray();
  }
}

function reportCyclicError(request: IRequest) {
  let history: IContext[] = [];
  let _parent = request.parent;
  while (_parent != undefined) {
    history.push(_parent);
    _parent = _parent.parent;
  };

  let msg = "Pigly Cyclic Dependency Found \n";

  msg += "  Requested: " + request.service.toString() + (request.target?`(${request.target})`: "") + "\n";

  for (let ctx of history) {
    msg += "  Into: " + ctx.service.toString() + (ctx.target?`(${ctx.target})`: "") + "\n";
    msg += "    Config: " + ctx.binding.site + "\n";
  }

  throw Error(msg);
}