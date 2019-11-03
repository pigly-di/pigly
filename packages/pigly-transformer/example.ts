import { Kernel, toConst, toSelf, whenAll, named, injectedInto } from 'pigly';


class Foo {
  constructor(public a: string, public b: string) { }
}

function main() {
  let kernel = new Kernel();

  kernel.bind<string>(
    whenAll([
      injectedInto<Foo>(),
      named("a")
    ], toConst("foo")));

  kernel.bind<string>(
    whenAll([
      injectedInto<Foo>(),
      named("b")
    ], toConst("bar")));

  kernel.bind(toSelf(Foo));

  console.log(kernel.get<Foo>());
}

console.log(main.toString());

main();

