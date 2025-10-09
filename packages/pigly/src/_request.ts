import { Service } from "./_service";
import { IContext } from "./_context";

export interface IRequest {
  /** the service being requested */
  service: Service;
  /** when not null, the parent context  */
  parent?: IContext;
  /** name tag requested */
  target?: string;
}