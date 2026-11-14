import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { startTransactionJobs } from './jobs/transaction.job';

const PORT = env.PORT || 5000;

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    startTransactionJobs();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
