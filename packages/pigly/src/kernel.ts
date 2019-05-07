import { IKernel, IKernelFluentBind } from "./_kernel";
import { IResolution } from "./_resolve";
import { IBinding } from './_binding';

export class Kernel {
  private _bindings = new Map<symbol, Array<IBinding>>();

  add(binding: IBinding){
    let service = binding.service;

    let serviceBindings = []
    if(this._bindings.has(service)){
      serviceBindings = this._bindings.get(service); 
    }else{
      this._bindings.set(service, serviceBindings);
    }
    serviceBindings.push(binding);
  }

  get(service: symbol){
    return this.getAll    
  }

  private resolve(ctx){

  }
}