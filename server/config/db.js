
import { PrismaClient } from '../generated/prisma/index.js'; 
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.on('connect', () => {
  console.log('Successfully connected to the Neon database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

const adapter = new PrismaPg(pool); 
const prisma = new PrismaClient({ adapter });

export default prisma;