import { Kernel, SymbolFor, to, toClass, toConst } from 'pigly';
import { IFoo, Foo, IBar, Bar } from './_foo';

function entry() {
  let kernel = new Kernel();

  kernel.bind<IFoo>(toClass(Foo, to<IBar<number>>()));
  kernel.bind<IBar<string>>(toClass(Bar, toConst("hello")));
  kernel.bind<IBar<number>>(toClass(Bar, toConst(123)));

  let foo = kernel.get<IFoo>();

  console.log(foo);
}

console.log(entry.toString());
entry();

