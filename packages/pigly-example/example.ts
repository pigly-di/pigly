import { Kernel, toSelf, to } from 'pigly';

interface INinja {
  weapon: IWeapon;
}
interface IWeapon {
  name: string;
}

class Ninja implements INinja {
  constructor(public weapon: IWeapon) { }
}

class Axe implements IWeapon {
  name = "axe";
}

let kernel = new Kernel();

kernel.bind<INinja>(toSelf(Ninja));
kernel.bind<IWeapon>(toSelf(Axe));

let ninja = kernel.get<INinja>();

console.log("ninja", ninja);

//call with: ts-node --compiler ttypescript example-mock.ts
