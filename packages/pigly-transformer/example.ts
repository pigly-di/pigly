import { Kernel, toClass, toSelf, toConst, when, injectedInto, to, SymbolFor } from 'pigly';
import { IFoo, Foo, IBar, Bar } from './_foo';

function entry() {
  let kernel = new Kernel();

  kernel.bind(toSelf(Foo));

  kernel.bind<IFoo>(to<Foo>());
  kernel.bind<IBar>(toClass(Bar, toConst("hello")));
  kernel.bind<IBar>(toClass(Bar, toConst("world")));
  
  let foo = kernel.get<IFoo>();

  console.log(foo);
}

console.log(entry.toString());
entry();

