import { IResolverRoot } from "./_resolver-root";
import { IReadOnlyKernel } from "./_read-only-kernel";

export interface IContext extends IResolverRoot {
  kernel: IReadOnlyKernel;
  target: symbol;
  parent?: IContext;
}