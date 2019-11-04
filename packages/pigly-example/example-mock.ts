import { Kernel, toSelf, to, toConst } from 'pigly';
import * as sinon from 'sinon';

interface IDb {
  set(key: string, value: string);
}

interface IApi {
  setName(name: string);
}

class Api implements IApi {
  constructor(private db: IDb) { 
  }
  setName(name: string){
    this.db.set("name", name);
  }
}

var spy = sinon.spy();

let kernel = new Kernel();

kernel.bind(toSelf(Api));
kernel.bind<IApi>(to<Api>());
kernel.bind<IDb>(toConst({ set: spy }));

let api = kernel.get<IApi>();

api.setName("John");

console.log(spy.calledWith("name", "John"));


