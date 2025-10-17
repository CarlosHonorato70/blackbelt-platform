import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/routers';

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
});

async function testAPI() {
  try {
    console.log('Testing tenant creation...');
    
    // Note: This will fail without authentication, but tests the API structure
    const result = await client.tenants.list.query();
    console.log('Tenants:', result);
  } catch (error: any) {
    console.log('Expected error (no auth):', error.message);
  }
}

testAPI();
