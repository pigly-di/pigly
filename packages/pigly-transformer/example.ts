import { Kernel, SymbolFor, to, toClass, toConst, when, injectedInto } from 'pigly';
import { IFoo, Foo, IBar, Bar } from './_foo';

function entry() {
  let kernel = new Kernel();

  kernel.bind<IBar>(toClass(Bar, toConst("hello world")));
  kernel.bind<IFoo>(toClass<Foo>());

  let foo = kernel.get<IFoo>();

  console.log(foo);
}

console.log(entry.toString());
entry();

