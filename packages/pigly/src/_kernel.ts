import { IProvider } from "./_provider";
import { IReadOnlyKernel } from "./_read-only-kernel";
import { Service } from "./_service";



export interface IKernel extends IReadOnlyKernel {
  /**Bind a Symbol to a provider */
  bind<T>(service: Service, provider: IProvider<T>): void;
  /**REQUIRES TRANSFORMER: Bind interface T to a provider */
  bind<T>(provider: IProvider<T>): void;
}