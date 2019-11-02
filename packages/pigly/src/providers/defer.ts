import { IContext } from "../_context";
import { IProvider } from "../_provider";
import { Service } from "../_service";

/** 
 * 
 * NOT RECOMMENDED: still possible to stack-overflow on non-singleton cyclic dependencies */
export function defer<T>(provider: IProvider<T>, inject: { [field: string]: Service }) {
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

function entries(obj: { [field: string]: Service }): Array<[string, Service]> {
  var ownProps = Object.keys(obj),
    i = ownProps.length,
    resArray = new Array(i); // preallocate the Array
  while (i--)
    resArray[i] = [ownProps[i], obj[ownProps[i]]];

  return resArray;
};