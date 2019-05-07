import { Newable } from "./_common";
import { IResolution } from "./_resolve";

export interface IKernel {
  bind<T>(key: symbol): IKernelFluentBind<T>
  resolve<T>(key: symbol): T;
}

export interface IKernelFluentBind<T> {
  to<S extends T>(resolution: IResolution<S>): IKernelFluentBindOptions
}

export interface IKernelFluentBindOptions {
  asSingleton()
}

