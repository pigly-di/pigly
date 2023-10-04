import { IBinding } from './_binding';
import { IProvider } from "./_provider";
import { IReadOnlyKernel } from "./_read-only-kernel";
import { Service } from "./_service";
import { Scope } from "./_scope";

export interface IKernel extends IReadOnlyKernel {
  /**Bind a Symbol to a provider */
  bind<T>(service: Service, provider: IProvider<T>): IBinding;
  /**REQUIRES TRANSFORMER: Bind interface T to a provider */
  bind<T>(provider: IProvider<T>): IBinding;
}