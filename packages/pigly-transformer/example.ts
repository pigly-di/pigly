import { StandardKernel, Scope, SymbolFor, injectedInto, Constructor } from 'pigly';

interface ILogger {
  log(message: string): void;
}

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

class Application {
  constructor(private logger: ILogger) { }

  run() {
    this.logger.log('Application started!');
  }
}

function main() {
  const kernel = new StandardKernel()

  // Using transformer: bind<T>() auto-converts to bind(Symbol.for("T"))
  kernel.bind<ILogger>().to<ConsoleLogger>();
  kernel.bind<ConsoleLogger>().toClass(ConsoleLogger, ()=>[]).inSingletonScope();

  // Alternative: Using explicit symbols
  const $App = SymbolFor<Application>();
  const app = kernel.get<Application>();

  console.log('Symbol match:', kernel.get($App) === app); // true - same singleton instance
}

console.log(main.toString());
