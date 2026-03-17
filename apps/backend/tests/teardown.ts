import { execSync } from 'child_process';

export default async () => {
  console.log('\n--- Cleaning Up ---');

  // Suppress pg connection termination errors during Docker shutdown
  process.on('uncaughtException', (error: any) => {
    if (error?.code === 'ERR_UNHANDLED_ERROR' && error?.context?.code === '57P01') {
      // Silently ignore pg connection termination errors during cleanup
      return;
    }
    // Re-throw other errors
    throw error;
  });

  // Wait for all connections to close
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('🛑 Stopping Docker containers...');
  try {
    execSync('docker-compose -f tests/docker-compose.test.yml down', { stdio: 'ignore' });
  } catch (error) {
    console.log(error.message);
  }

  // Wait a bit more for cleanup
  await new Promise((resolve) => setTimeout(resolve, 200));

  console.log('✅ Done.');
};
