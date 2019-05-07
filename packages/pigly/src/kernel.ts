import { IKernel, IKernelFluentBind } from "./_kernel";
import { IResolution } from "./_resolve";

export class Kernel implements IKernel {
  private _registry = new Map<symbol, Array<IResolution<any>>>();

  bind<T>(): IKernelFluentBind<T>    
  bind<T>(symbol: symbol): IKernelFluentBind<T>
  bind<T>(symbol?: symbol): IKernelFluentBind<T> {
    if (symbol === undefined) throw Error("must pass symbol to bind method");

    let resolved: IResolution<any> = {}
    let resolutions: Array<IResolution<any>> = [];

    if (this._registry.has(symbol) === false) {
      this._registry.set(symbol, resolutions);
    } else {
      resolutions = this._registry.get(symbol);
    }

    return undefined;
  }

  resolve<T>(): T;
  resolve(key: symbol): any;
  resolve(key?: symbol): any {
  }
}