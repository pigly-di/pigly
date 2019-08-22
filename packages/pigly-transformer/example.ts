import { Kernel, SymbolFor, to, toClass } from 'pigly';

interface IFoo {
  bar: IBar;
}

interface IBar {
  foo: IFoo;
}

class Foo implements IFoo {
  constructor(public bar: IBar) { }
}
class Bar implements IBar {
  foo: IFoo;
}

let kernel = new Kernel()

kernel.bind<IFoo>(toClass(Foo, to<IBar>(SymbolFor<IBar>())));
kernel.bind<IBar>(toClass(Bar));

let foo = kernel.get<IFoo>(SymbolFor<IFoo>());

console.log(foo);