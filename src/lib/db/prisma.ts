import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Define a type for the global Prisma instance
declare global {
  var prismaGlobal: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient({
        // Optional: log database queries
        // log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.prismaGlobal;
}

export default prisma;
export { prisma }; 