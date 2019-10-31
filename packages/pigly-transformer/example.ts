import { Kernel, toClass, toSelf, toConst, when, injectedInto, to, SymbolFor } from 'pigly';
import { IFoo, Foo, IBar, Bar } from './_foo';

function entry() {
  let kernel = new Kernel();

  kernel.bind(toSelf(Foo));
  kernel.bind(toSelf(Bar));

  kernel.bind<IFoo>(to<Foo>());
  kernel.bind<IBar>(to<Bar>());

  kernel.bind<string>(
    when(injectedInto<Bar>(),
      toConst("hello")
    ));
  kernel.bind<string>(
    when(injectedInto(SymbolFor<Foo>()),
      toConst("world")
    ));

  let foo = kernel.get<IFoo>();

  console.log(foo);
}

console.log(entry.toString());
entry();

