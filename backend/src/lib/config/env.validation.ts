export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  API_PORT: number;
  API_HOST: string;
  PUBLIC_URL: string;
  DEFAULT_LOCALE: string;
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  INTERNAL_PROXY_SECRET?: string;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test.`);
  }

  const rawPort = config.API_PORT ?? 4300;
  const apiPort = Number(rawPort);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error(`Invalid API_PORT: ${String(rawPort)}. Must be an integer between 1 and 65535.`);
  }

  const apiHost = typeof config.API_HOST === 'string' && config.API_HOST.trim()
    ? config.API_HOST.trim()
    : '127.0.0.1';

  const publicUrl = typeof config.PUBLIC_URL === 'string' && config.PUBLIC_URL.trim()
    ? config.PUBLIC_URL.trim()
    : 'http://localhost:3300';

  const defaultLocale = typeof config.DEFAULT_LOCALE === 'string' && config.DEFAULT_LOCALE.trim()
    ? config.DEFAULT_LOCALE.trim()
    : 'en';

  if (nodeEnv === 'production') {
    if (!config.DATABASE_URL || typeof config.DATABASE_URL !== 'string') {
      throw new Error('DATABASE_URL is required in production.');
    }
    if (!config.BETTER_AUTH_SECRET || typeof config.BETTER_AUTH_SECRET !== 'string' || (config.BETTER_AUTH_SECRET as string).length < 32) {
      throw new Error('BETTER_AUTH_SECRET must be at least 32 characters in production.');
    }
    if (!config.INTERNAL_PROXY_SECRET || typeof config.INTERNAL_PROXY_SECRET !== 'string') {
      throw new Error('INTERNAL_PROXY_SECRET is required in production.');
    }
  }

  return {
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    API_PORT: apiPort,
    API_HOST: apiHost,
    PUBLIC_URL: publicUrl,
    DEFAULT_LOCALE: defaultLocale,
    DATABASE_URL: typeof config.DATABASE_URL === 'string' ? config.DATABASE_URL : undefined,
    BETTER_AUTH_SECRET: typeof config.BETTER_AUTH_SECRET === 'string' ? config.BETTER_AUTH_SECRET : undefined,
    INTERNAL_PROXY_SECRET: typeof config.INTERNAL_PROXY_SECRET === 'string' ? config.INTERNAL_PROXY_SECRET : undefined,
  };
}
