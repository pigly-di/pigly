import { Service } from "./_service";
import { IContext } from "./_context";

export class ResolveError extends Error {
  constructor(
    public service: Service, 
    public context?: IContext,
    public hadBindings: boolean = false,
    message: string = ""
  ) {
    super();
    this.message = this.buildMessage();
  }
  
  private buildMessage(): string {
    let serviceDescription = this.service.description || this.service.toString();
    let msg = `Could not resolve '${serviceDescription}'`;

    if (this.context) {
      const chain: string[] = [];
      let current = this.context;
      
      while (current) {
        const serviceStr = current.service.description || current.service.toString();
        const target = current.target ? ` (${current.target})` : '';
        const providerInfo = this.getProviderInfo(current.binding?.provider);
        const site = current.binding?.site ? ` ${current.binding.site}` : '';
        chain.push(`'${serviceStr}'${target}${providerInfo}${site}`);
        current = current.parent;
      }
      
      if (chain.length > 0) {
        msg += `\n\nResolution chain:\n${chain.map(step => `  → ${step}`).join('\n')}`;
      }
    }
    
    if (this.hadBindings) {
      msg += `\n\nAll providers for '${serviceDescription}' returned undefined.`;
    } else {
      msg += `\n\nNo providers bound for '${serviceDescription}'.`;
    }
    
    return msg;
  }

  private getProviderInfo(provider: any): string {
    if (!provider || !provider.meta) {
      return '';
    }
    
    const meta = provider.meta;
    const parts: string[] = [];
    
    if (meta.name) {
      parts.push(`via ${meta.name}`);
    }
    
    // Add specific metadata based on provider type
    if (meta.ctor) {
      parts.push(`(${meta.ctor.name})`);
    } else if (meta.to) {
      const toStr = meta.to.description || meta.to.toString();
      parts.push(`(${toStr})`);
    }
    
    return parts.length > 0 ? ` [${parts.join(' ')}]` : '';
  }
}

export class CyclicError extends Error{
  constructor(message){
    super(message);
  }
}