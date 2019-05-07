import { IContext } from "mocha";
import { IProvider } from "./_provider";

export interface IBinding {
  service: symbol,  
  getProvider: (ctx:IContext)=>IProvider,
}