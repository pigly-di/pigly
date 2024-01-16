import { IResolverRoot } from "./_resolver-root";
import { IReadOnlyKernel } from "./_read-only-kernel";
import { Service } from "./_service";
import { Scope } from './_scope';
import { IBinding } from "./_binding";

export interface IContext extends IResolverRoot {
  /** the kernel being used */
  kernel: IReadOnlyKernel;
  /** the service being requested */
  service: Service;
  /** the target site name (field or argument)  */
  target?: string;
  /** parent context */
  parent?: IContext;
  /** the binding chosen */
  binding: IBinding;
  /** post-constructor clean-up - called after root request instantiated */
  finally?: (instance: any) => void;
}