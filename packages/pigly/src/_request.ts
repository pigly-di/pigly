import { Service } from "./_service";
import { IContext } from "./_context";

export interface IRequest {
  service: Service;
  name?: string; 
  parent?: IContext;
}