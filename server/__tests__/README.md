# Black Belt Platform Test Suite

This directory contains the comprehensive test suite for the Black Belt Platform backend.

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

## Test Files

- **`test-utils.ts`** - Reusable test utilities and mock data generators
- **`pricing-calculations.test.ts`** - Tests for pricing and financial calculations (23 tests)
- **`data-validation.test.ts`** - Tests for input validation and data integrity (57 tests)
- **`business-logic.test.ts`** - Tests for core business rules and logic (33 tests)

**Total: 113 tests across 3 test suites**

## Test Coverage

The test suite covers:

✅ **Pricing Calculations**
- Technical hour calculation (4 tax regimes)
- Discount tiers and application
- Proposal total calculation
- Currency rounding and edge cases

✅ **Data Validation**
- CNPJ (Brazilian company ID)
- Email, phone, names
- Enums and status codes
- Prices, quantities, dates
- Address validation

✅ **Business Logic**
- Entity management (tenants, sectors, people, clients, services)
- Multi-tenant data isolation
- Risk assessment calculations
- Service recommendations
- Pricing parameters

## Writing Tests

Use the mock data generators from `test-utils.ts`:

```typescript
import { createMockTenant, createMockClient } from "./test-utils";

it("should create tenant", () => {
  const tenant = createMockTenant({ name: "Test Company" });
  expect(tenant.name).toBe("Test Company");
});
```

## Documentation

See [TESTING.md](../TESTING.md) for comprehensive documentation including:
- Detailed test descriptions
- Running tests
- Adding new tests
- Best practices
- CI/CD integration
- Troubleshooting

## Test Statistics

- **Total Tests:** 113
- **Pass Rate:** 100%
- **Files:** 3 test suites
- **Execution Time:** ~400ms
