import { Kernel, toConst, toSelf, whenAll, named, injectedInto, toClass, to, Scope, SymbolFor } from 'pigly';

function main() {
  const kernel = new Kernel();

  class A { constructor() { } };

  kernel.bind(SymbolFor<A>(), toSelf(A), Scope.Singleton);

  console.log(kernel.get<A>());
}

console.log(main.toString());

main();

