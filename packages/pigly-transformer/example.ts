import { Kernel, toClass, toConst, when, injectedInto } from 'pigly';
import { IFoo, Foo, IBar, Bar } from './_foo';

function entry() {
  const _ = Foo; //todo work out a way to keep the import
  let kernel = new Kernel();

  kernel.bind<IFoo>(toClass<Foo>());
  kernel.bind<IBar>(toClass<Bar>());

  kernel.bind<string>(
    when(injectedInto<IBar>(),
      toConst("hello")
    ));
  kernel.bind<string>(
    when(injectedInto<IFoo>(),
      toConst("world")
    ));

  let foo = kernel.get<IFoo>();

  console.log(foo);
}

console.log(entry.toString());
entry();

