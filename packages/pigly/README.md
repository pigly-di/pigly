# Pigly 
unobtrusive, manually configured, dependency-injection. 

## Philosophy 

* don't pollute the code-base with DI concerns


## Usage

let kernel = new Kernel();

kernel.bind(Symbol.for("IWeapon"), to({type: "sword"}));



