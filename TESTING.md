# Test Documentation - Black Belt Platform

## Overview

This document describes the comprehensive test suite for the Black Belt Platform. The tests are designed to validate the core functionality, business logic, and data validation of the platform.

## Test Structure

The test suite is organized into three main categories:

### 1. Pricing Calculations (`pricing-calculations.test.ts`)

Tests for pricing and financial calculations across different tax regimes.

**Coverage:**

- Technical hour calculation for 4 tax regimes (MEI, Simples Nacional, Lucro Presumido, Autonomous)
- Discount calculations based on quantity tiers
- Proposal total calculations with multiple items
- Input validation for prices, quantities, and discounts
- Edge cases handling (large numbers, small decimals, rounding)

**Key Tests:**

- `should calculate technical hour for MEI regime` - Validates MEI pricing formula
- `should calculate technical hour for Simples Nacional regime` - Validates SN pricing with tax considerations
- `should apply tier 1/2/3 discount` - Validates discount application at different quantity levels
- `should calculate proposal total with multiple items` - Tests complete proposal calculation
- `should round currency values correctly` - Ensures proper financial rounding

**Total Tests:** 23

### 2. Data Validation (`data-validation.test.ts`)

Tests for input validation and data integrity across all entities.

**Coverage:**

- CNPJ validation (Brazilian company identifier)
- Email validation
- Phone number validation (Brazilian format)
- Name validation
- Status and enum validation (tenant status, company size, tax regime)
- Price and quantity validation
- Date validation
- Address validation (ZIP code, state codes)

**Key Tests:**

- `should validate correct CNPJ format` - Validates Brazilian company ID
- `should validate email with subdomain` - Email validation with complex formats
- `should validate Brazilian phone` - Phone validation with Brazilian format
- `should reject negative price` - Ensures financial data integrity
- `should accept all valid sizes` - Validates enum consistency
- `should validate ZIP code with formatting` - Brazilian postal code validation

**Total Tests:** 57

### 3. Business Logic (`business-logic.test.ts`)

Tests for core business rules and entity relationships.

**Coverage:**

- Tenant management (creation, status, multi-tenant isolation)
- Sector management (association with tenants)
- People management (employees, contractors)
- Client management (for proposals)
- Service management (catalog)
- Pricing parameters configuration
- Multi-tenant data isolation
- Risk level calculation
- Service recommendations based on risk

**Key Tests:**

- `should create tenant with required fields` - Basic entity creation
- `should isolate data by tenant ID` - Multi-tenant data isolation
- `should calculate risk level from probability and severity` - Risk assessment logic
- `should recommend services based on risk level` - Business intelligence
- `should have increasing discount rates` - Business rules validation
- `should allow person without sector` - Flexible data modeling

**Total Tests:** 33

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test --watch
```

### Run Tests with Coverage

```bash
pnpm test --coverage
```

### Run Specific Test File

```bash
pnpm test pricing-calculations
pnpm test data-validation
pnpm test business-logic
```

## Test Utilities

The test suite includes a comprehensive set of utilities in `test-utils.ts`:

### Mock Data Generators

- `createMockTenant()` - Generate test tenant
- `createMockSector()` - Generate test sector
- `createMockPerson()` - Generate test employee/contractor
- `createMockClient()` - Generate test client for proposals
- `createMockService()` - Generate test service
- `createMockPricingParameters()` - Generate pricing configuration
- `createMockUser()` - Generate test user

### Validation Helpers

- `isValidCNPJ()` - Validate Brazilian company ID
- `isValidEmail()` - Validate email format

### Mock Database

- `createMockDb()` - In-memory mock database for testing

## Test Statistics

**Total Tests:** 113
**Test Files:** 3
**Test Utilities:** 1
**Pass Rate:** 100%

### Breakdown by Category

- Pricing Calculations: 23 tests (20%)
- Data Validation: 57 tests (50%)
- Business Logic: 33 tests (30%)

## Test Coverage Areas

### ✅ Fully Covered

- Pricing calculations (all 4 tax regimes)
- Discount tier logic
- Data validation (CNPJ, email, phone, etc.)
- Tenant/sector/people management
- Multi-tenant isolation
- Risk level calculation
- Service recommendations

### 🔄 Partially Covered

- Database operations (using mocks)
- API endpoints (tRPC routers)
- Authentication/authorization
- File uploads
- Report generation

### ❌ Not Covered (Future Work)

- End-to-end UI tests
- Performance tests
- Load tests
- Integration tests with real database
- OAuth flow testing

## Adding New Tests

### 1. Create Test File

Create a new file in `server/__tests__/` with the `.test.ts` extension:

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something", () => {
    expect(true).toBe(true);
  });
});
```

### 2. Use Test Utilities

Import and use mock data generators:

```typescript
import { createMockTenant } from "./test-utils";

it("should create tenant", () => {
  const tenant = createMockTenant({ name: "Test" });
  expect(tenant.name).toBe("Test");
});
```

### 3. Follow Naming Conventions

- Test files: `feature-name.test.ts`
- Test suites: `describe("Feature Name", ...)`
- Test cases: `it("should do something specific", ...)`

### 4. Test Structure

```typescript
describe("Feature", () => {
  describe("Sub-feature", () => {
    it("should handle normal case", () => {});
    it("should handle edge case", () => {});
    it("should handle error case", () => {});
  });
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Assertions**: Use descriptive assertion messages
3. **Mock Data**: Use test utilities for consistent mock data
4. **Edge Cases**: Test boundary conditions and edge cases
5. **Error Handling**: Test both success and failure scenarios
6. **Naming**: Use clear, descriptive test names that explain what is being tested

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: pnpm test

- name: Generate Coverage
  run: pnpm test --coverage
```

## Troubleshooting

### Tests Fail Due to Database Connection

- Ensure `DATABASE_URL` is not set when running unit tests
- Unit tests use mocks and don't require a real database

### Import Errors

- Ensure all dependencies are installed: `pnpm install`
- Check TypeScript configuration in `vitest.config.ts`

### Test Timeout

- Increase timeout in test: `it("test", async () => { ... }, 10000)`
- Check for infinite loops or blocking operations

## Future Improvements

1. **Integration Tests**: Add tests with real database connections
2. **E2E Tests**: Add Playwright tests for full user flows
3. **Performance Tests**: Add benchmarks for critical operations
4. **Security Tests**: Add tests for authentication and authorization
5. **API Tests**: Add tests for tRPC endpoints with mock context
6. **Coverage Target**: Aim for 80%+ code coverage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## Maintenance

Tests should be reviewed and updated:

- When adding new features
- When modifying existing features
- When fixing bugs
- During code refactoring
- During quarterly code reviews

Last Updated: November 2024
