import { IResolverRoot } from "./_resolver-root";
import { IReadOnlyKernel } from "./_read-only-kernel";
import { Service } from "./_service";

export interface IContext extends IResolverRoot {
  kernel: IReadOnlyKernel;
  target: Service;
  name?: string;
  parent?: IContext;
}