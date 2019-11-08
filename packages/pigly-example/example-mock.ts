import { Kernel, toSelf, to, toConst } from 'pigly';
import * as sinon from 'sinon';
import {SinonSpy} from 'sinon';
import { createMock } from 'ts-auto-mock';
import { Provider, method, On } from "ts-auto-mock/extension";

Provider.instance.provideMethod((name: string, value: any) => {
    return sinon.spy();
});

declare module 'ts-auto-mock/extension' {
  interface Method<TR> extends SinonSpy {}
}

interface IDb {
  set(key: string, value: string);
  get(key): string;
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

let kernel = new Kernel();
let mockDb = createMock<IDb>();

kernel.bind(toSelf(Api));
kernel.bind<IApi>(to<Api>());
kernel.bind<IDb>(toConst(mockDb));

let api = kernel.get<IApi>();

api.setName("John");

const spy = On(mockDb).get(method(mock => mock.set));

console.log("Set Called?", spy.calledWith("name", "John"));
console.log("Get mocked?", mockDb.get !== undefined )

//call with: ts-node --compiler ttypescript example-mock.ts