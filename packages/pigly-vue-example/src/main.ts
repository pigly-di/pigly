import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

import { Kernel, toClass, toConst } from 'pigly';
import { IFoo } from './service/_foo';

let kernel = new Kernel();

class Foo implements IFoo {
  constructor(public message: string) { }
}

kernel.bind<IFoo>(toClass(Foo, toConst("hello world")));

console.log(kernel.get<IFoo>());

new Vue({
  provide: {
    "$kernel" : kernel
  },
  render: h => h(App),
}).$mount('#app')
