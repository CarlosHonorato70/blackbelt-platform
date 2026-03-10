import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Environment setup for tests
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = 'test-cookie-secret-minimum-32-characters-long-for-hmac';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
process.env.FRONTEND_URL = 'http://localhost:5000';
