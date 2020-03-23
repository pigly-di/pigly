import { IContext } from "../_context";
import { IProvider } from "../_provider";
import { Service } from "../_service";
import { IRequest } from "../_request";

let __setImmediate;

if (global && global.setImmediate) {
  __setImmediate = global.setImmediate;
} else {
  __setImmediate = function (cb, ...args) {
    return setTimeout(cb, 0, ...args);
  };
}

export type DeferFieldProviders<T> = {
  [P in keyof T]?: IProvider<T[P]>
}

/** 
 * 
 * NOT RECOMMENDED: still possible to stack-overflow on non-singleton cyclic dependencies */
export function defer<T>(provider: IProvider<T>, inject: DeferFieldProviders<T>) {
  return (ctx: IContext) => {
    let kernel = ctx.kernel;
    let resolved = provider(ctx);
    __setImmediate(() => {
      for (let [key, provider] of Object.entries(inject)) {
        let _ctx: IContext = {
          kernel,
          target: null,
          name: key,
          resolve: (request: IRequest) => kernel.resolve(Object.assign({ parent: _ctx }, request))
        }
        resolved[key] = (provider as any)(_ctx);
      }
    })
    return resolved;
  };
}