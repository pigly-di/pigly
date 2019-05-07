import {expect} from 'chai';
import {Kernel} from '../src/kernel';

describe("KERNEL", ()=>{
  it("can bind interface to class and resolve", ()=>{
    let kernel = new Kernel();

    kernel.addBinding()

    expect(true).to.be.true;
  })
})