import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

import {Kernel, toClass, toConst} from 'pigly';

let kernel = new Kernel();

interface IFoo{
  message: string;
}

class Foo implements IFoo{
  constructor(public message: string){}
}

kernel.bind<IFoo>(toClass(Foo, toConst("hello world")));

console.log(kernel.get<IFoo>());

new Vue({
  render: h => h(App),
}).$mount('#app')
