import { IBinding } from "./_binding";
import { IContext } from "./_context";
import { IKernel } from "./_kernel";
import { IReadOnlyKernel } from "./_read-only-kernel";

export interface Scope {
  getCache(ctx: IContext): WeakMap<IBinding, any>;
}

export class SingletonScope implements Scope {
  private _cache: WeakMap<IReadOnlyKernel, WeakMap<IBinding, any>> = new WeakMap()
  getCache(ctx: IContext): WeakMap<IBinding, any>{
    const kernel = ctx.kernel;
    if(this._cache.has(kernel) == false){
      this._cache.set(kernel, new WeakMap());
    }
    return this._cache.get(kernel);
  }
}

export class TransientScope implements Scope {
  getCache(ctx: IContext): WeakMap<IBinding, any>{
    return new WeakMap();
  }
}

export namespace Scope {
  export const Singleton: Scope = new SingletonScope();
  export const Transient: Scope = new TransientScope();
}
