import { IProvider } from "./_provider";

/**
 * Provider with optional metadata about the injection target
 * Used to pass parameter names to toClass/toFunc providers
 */
export interface IProviderWithMetadata<T> {
  provider: IProvider<T>;
  target?: string;
}

/**
 * Type guard to check if a value is a provider with metadata
 */
export function isProviderWithMetadata<T>(value: any): value is IProviderWithMetadata<T> {
  return value && typeof value === 'object' && 'provider' in value && typeof value.provider === 'function';
}

/**
 * Extract provider from either raw provider or metadata wrapper
 */
export function extractProvider<T>(providerOrMeta: IProvider<T> | IProviderWithMetadata<T>): IProvider<T> {
  return isProviderWithMetadata(providerOrMeta) ? providerOrMeta.provider : providerOrMeta;
}

/**
 * Extract target name from provider metadata if available
 */
export function extractTarget<T>(providerOrMeta: IProvider<T> | IProviderWithMetadata<T>): string | undefined {
  return isProviderWithMetadata(providerOrMeta) ? providerOrMeta.target : undefined;
}
