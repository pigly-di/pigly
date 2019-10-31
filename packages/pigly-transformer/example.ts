import { Kernel, SymbolFor, to, toClass, toConst, when, injectedInto } from 'pigly';
import { IFoo, Foo, IBar, Bar, IRay, Ray } from './_foo';

function entry() {
  let kernel = new Kernel();

  kernel.bind<IFoo>(toClass(Foo, to<IBar<string>>()));
  kernel.bind<IRay>(toClass(Ray, to<IBar<string>>()));

  kernel.bind<IBar<string>>(
    when(injectedInto<IFoo>(),
      toClass(Bar, toConst("hello"))))

  kernel.bind<IBar<string>>(
        when(injectedInto<IRay>(),
          toClass(Bar, toConst("world"))))

  let foo = kernel.get<IFoo>();
  let ray = kernel.get<IRay>();
  console.log(foo);
  console.log(ray);
}

console.log(entry.toString());
entry();

