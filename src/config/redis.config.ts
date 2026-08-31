import { registerAs } from '@nestjs/config';

interface RedisConfiguration {
  url?: string;
  host: string;
  port: number;
  password?: string;
  tls: boolean;
  tlsRejectUnauthorized: boolean;
  cluster: boolean;
  sentinels?: string;
  sentinelName?: string;
}

export default registerAs(
  'redis',
  (): RedisConfiguration => ({
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
    tlsRejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    cluster: process.env.REDIS_CLUSTER === 'true',
    sentinels: process.env.REDIS_SENTINELS,
    sentinelName: process.env.REDIS_SENTINEL_NAME,
  }),
);
