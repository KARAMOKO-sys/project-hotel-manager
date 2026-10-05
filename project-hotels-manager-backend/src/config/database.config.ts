// // src/config/database.config.ts
// import { TypeOrmModuleOptions } from '@nestjs/typeorm';
// import { config } from 'dotenv';
// import { join } from 'path';

// config();

// export const databaseConfig: TypeOrmModuleOptions = {
//   type: 'mysql',
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '3306', 10),
//   username: process.env.DB_USERNAME || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_DATABASE || 'db_hotels_manager',

//   // Entities
//   entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],

//   // Migrations
//   migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
//   migrationsTableName: 'migrations',
//   migrationsRun: process.env.NODE_ENV === 'production',

//   // Synchronization (NE JAMAIS utiliser en production)
//   synchronize: process.env.NODE_ENV === 'development',

//   // Logging
//   logging: process.env.NODE_ENV === 'development',
//   logger: 'advanced-console',

//   // Connection pool
//   extra: {
//     connectionLimit: 10,
//     acquireTimeout: 60000,
//     waitForConnections: true,
//   },

//   // Timezone
//   timezone: 'Z', // UTC
//   dateStrings: true,

//   // SSL (pour production)
//   ...(process.env.NODE_ENV === 'production' && {
//     ssl: {
//       rejectUnauthorized: false,
//     },
//   }),
// };

// export default databaseConfig;
