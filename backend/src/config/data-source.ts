import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import 'dotenv/config';
/**
 * Used by the TypeORM CLI (migrations) against the compiled output.
 * Schema changes happen only through migrations; synchronize stays false.
 */
console.log('process.env.DATABASE_URL>>',process.env.DATABASE_URL);
const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '..', '**', '*.entity.js')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.js')],
  synchronize: false,
});

export default AppDataSource;
