import {Kernel} from 'pigly';

interface IFoo { }

interface IBar { }

class Foo implements IFoo {
  constructor(bar: IBar) { }
}
class Bar implements IBar { }

let kernel = new Kernel()

kernel.bind<IFoo>().to<Foo>();
kernel.bind<IBar>().to<Bar>();

let foo = kernel.get<IFoo>();
