import { Kernel, SymbolFor, to, toClass, toConst } from 'pigly';
import { IFoo, Foo, IBar, Bar } from './_foo';

function entry() {
  let kernel = new Kernel();

  kernel.bind<IFoo>(toClass(Foo, to<IBar>()));
  kernel.bind<IBar>(toClass(Bar));

  let foo = kernel.get<IFoo>();

  console.log(foo);

  
}
entry();

