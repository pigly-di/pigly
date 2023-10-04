import { IResolverRoot } from "./_resolver-root";
import { IReadOnlyKernel } from "./_read-only-kernel";
import { Service } from "./_service";
import { Scope } from './_scope';
import { IBinding } from "./_binding";

export interface IContext extends IResolverRoot {
  kernel: IReadOnlyKernel;
  service: Service;
  name?: string;
  parent?: IContext;
  binding: IBinding;
  finally?: (instance: any) => void;
}