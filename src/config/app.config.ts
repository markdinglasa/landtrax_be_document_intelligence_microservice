import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import Entities from 'src/shared/infrastructure/database/entities';
import { DataSource } from 'typeorm';

/* type: database configuration
      this is for database configuration, we can configure our database credential here
      so app.module can use it
*/
export const getTypeOrmConfig = (configService: ConfigService): any => {
  /*---------------------------------
  | ONLY LOG THE ENV STUFF IF ITS DEV |
  -----------------------------------*/
  // const ENABLE_DATABASE_SYNCHRONIZATION: boolean =
  //   configService.get<string>('ENABLE_DATABASE_SYNCHRONIZATION') === 'true';
  // const ENABLE_DATABASE_DROP_SCHEMA: boolean =
  //   configService.get<string>('ENABLE_DATABASE_DROP_SCHEMA') === 'true';
  // If we are dropping schema, force synchronization so the schema is recreated.
  //const SHOULD_SYNCHRONIZE = ENABLE_DATABASE_SYNCHRONIZATION || ENABLE_DATABASE_DROP_SCHEMA;

  // Use ConfigService to get environment variables
  const DB_HOST = configService.get<string>('DB_HOST')!;
  const DB_PORT = Number.parseInt(configService.get('DB_PORT')!, 10);
  const DB_NAME = configService.get<string>('DB_NAME')!;
  const DB_USER = configService.get<string>('DB_USER')!;
  const DB_PASS = configService.get<string>('DB_PASSWORD')!;

  // Debug logging to check if environment variables are loaded
  console.log('=== DATABASE CONFIG DEBUG ===');
  console.log('DB_HOST:', DB_HOST);
  console.log('DB_PORT:', DB_PORT);
  console.log('DB_USER:', DB_USER);
  console.log('DB_NAME:', DB_NAME);
  console.log('DB_PASS:', DB_PASS ? '[PRESENT]' : '[MISSING]');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('==============================');

  return {
    type: 'mssql',
    host: DB_HOST || process.env.DB_HOST || 'localhost',
    port: DB_PORT || Number.parseInt(`${process.env.DB_PORT}`, 10) || 1433,
    username: DB_USER || process.env.DB_USER || 'sa',
    password: DB_PASS || process.env.DB_PASSWORD || '',
    database: DB_NAME || process.env.DB_NAME,
    entities: Object.values(Entities),
    synchronize: false, // ENABLE_DATABASE_SYNCHRONIZATION Allow auto sync when explicitly enabled or when dropSchema is true
    dropSchema: false, // ENABLE_DATABASE_DROP_SCHEMA Drops all tables/constraints when enabled (destructive)
    options: {
      enableArithAbort: true,
      trustServerCertificate: true,
    },
    //added logging for autosync
    // Enable query logging temporarily to debug login timeout
    logging: process.env.ENABLE_QUERY_LOGGING === 'true' ? ['query', 'error'] : false,
    // Enable migrations
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    migrationsRun: false,
    retryAttempts: 10,
    retryDelay: 3000,
    extra: {
      charset: 'utf8mb4_unicode_ci',
      // Connection pool settings for better performance
      connectionTimeout: 30000, // 30 secondsc
      requestTimeout: 30000, // 30 seconds (increased from default 15s)
      pool: {
        max: 50, // Maximum number of connections in the pool
        min: 2, // Minimum number of connections in the pool
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      },
      trustServerCertificate: true,
    },
    //seeds: ENABLE_DATABASE_SYNCHRONIZATION ? [__dirname + '/../seeds/*{.ts,.js}'] : [],
  };
};


config({ path: ['.dev.env', '.env'] });

const configService = new ConfigService();
const baseConfig = getTypeOrmConfig(configService);

const dataSource = new DataSource({
  ...baseConfig,
});

export default dataSource;