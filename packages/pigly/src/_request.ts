import { Service } from "./_service";
import { IContext } from "./_context";
import { Scope } from './_scope';

type ScopeObject = Record<Service, any[]>;

export interface IRequest {
  /** the service being requested */
  service: Service;
  /** when not null, the parent context  */
  parent?: IContext;
}