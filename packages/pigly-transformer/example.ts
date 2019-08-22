import { Kernel, SymbolFor, to, toClass, toConst } from 'pigly';

interface IFoo {
  bar: IBar;
}

interface IBar {}

class Foo implements IFoo {
  constructor(public bar: IBar) { }
}

class Bar implements IBar {
  constructor(){
  }
}

let kernel = new Kernel();

kernel.bind<IFoo>(toClass(Foo, to<IBar>()));
kernel.bind<IBar>(toClass(Bar));

let foo = kernel.get<IFoo>();

console.log(foo);