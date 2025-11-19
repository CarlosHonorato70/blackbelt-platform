# Quick Start Guide - Testing Black Belt Platform

## Overview

The Black Belt Platform now has a comprehensive test suite with **113 tests** covering all critical functionality.

## Running Tests

### Run All Tests
```bash
pnpm test
```

**Expected Output:**
```
✓ server/__tests__/pricing-calculations.test.ts (23 tests)
✓ server/__tests__/data-validation.test.ts (57 tests)
✓ server/__tests__/business-logic.test.ts (33 tests)

Test Files  3 passed (3)
Tests  113 passed (113)
```

### Run Tests in Watch Mode
```bash
pnpm test --watch
```
This will re-run tests automatically when you change files.

### Run Specific Test File
```bash
pnpm test pricing-calculations
pnpm test data-validation
pnpm test business-logic
```

### Run with Coverage Report
```bash
pnpm test --coverage
```

## What's Being Tested?

### 1. Pricing Calculations (23 tests)
Validates financial calculations:
- ✅ Technical hour calculation (MEI, Simples Nacional, Lucro Presumido, Autonomous)
- ✅ Discount tiers (5%, 10%, 15% based on quantity)
- ✅ Proposal totals with multiple items
- ✅ Tax calculations
- ✅ Currency rounding

### 2. Data Validation (57 tests)
Ensures data integrity:
- ✅ CNPJ validation (Brazilian company ID)
- ✅ Email validation
- ✅ Phone validation (Brazilian format)
- ✅ Price and quantity validation
- ✅ Status codes and enums
- ✅ Date validation
- ✅ Address validation (ZIP code, states)

### 3. Business Logic (33 tests)
Verifies business rules:
- ✅ Tenant management
- ✅ Sector management
- ✅ People (employees) management
- ✅ Client management
- ✅ Service catalog
- ✅ Multi-tenant data isolation
- ✅ Risk level calculation
- ✅ Service recommendations

## Test Architecture

```
server/__tests__/
├── test-utils.ts                    # Mock data generators
├── pricing-calculations.test.ts     # Financial calculations
├── data-validation.test.ts          # Input validation
├── business-logic.test.ts           # Business rules
└── README.md                        # Test documentation
```

## Example: Running Your First Test

```bash
# 1. Install dependencies (if not already done)
pnpm install

# 2. Run all tests
pnpm test

# 3. You should see output like:
# ✓ 113 tests passed
```

## Understanding Test Output

### ✅ All Tests Passing
```
✓ server/__tests__/pricing-calculations.test.ts (23 tests)
Test Files  3 passed (3)
Tests  113 passed (113)
```
This means everything is working correctly!

### ❌ Test Failure
```
× server/__tests__/pricing-calculations.test.ts > should calculate price
  Expected: 100
  Received: 90
```
This indicates a bug that needs to be fixed.

## Common Testing Scenarios

### Test a New Feature
```typescript
import { describe, it, expect } from "vitest";
import { createMockTenant } from "./test-utils";

describe("New Feature", () => {
  it("should work correctly", () => {
    const tenant = createMockTenant();
    expect(tenant.name).toBeDefined();
  });
});
```

### Test Data Validation
```typescript
it("should validate email", () => {
  const email = "test@example.com";
  expect(isValidEmail(email)).toBe(true);
});
```

### Test Calculations
```typescript
it("should calculate total", () => {
  const price = 100;
  const quantity = 2;
  const total = price * quantity;
  expect(total).toBe(200);
});
```

## Troubleshooting

### Tests Don't Run
- Check if dependencies are installed: `pnpm install`
- Verify Node.js version: `node --version` (should be 20+)

### Tests Fail Unexpectedly
- Check if you have local changes
- Try: `git status` to see modified files
- Reset if needed: `git checkout .`

### Slow Test Execution
- Close unnecessary applications
- Tests should run in ~400ms
- If slower, check system resources

## Next Steps

1. **Read Full Documentation**: See `TESTING.md` for detailed information
2. **Explore Test Files**: Look at the test files in `server/__tests__/`
3. **Add Your Own Tests**: Follow the patterns in existing tests
4. **Run Tests Regularly**: Before committing code changes
5. **Keep Tests Updated**: When adding new features

## Key Benefits

✅ **Confidence**: Know your code works correctly  
✅ **Fast Feedback**: Tests run in under 1 second  
✅ **Documentation**: Tests show how the code should work  
✅ **Regression Prevention**: Catch bugs before production  
✅ **Refactoring Safety**: Change code with confidence  

## Resources

- **Full Documentation**: [TESTING.md](TESTING.md)
- **Test Directory**: [server/__tests__/README.md](server/__tests__/README.md)
- **Vitest Docs**: https://vitest.dev/

## Getting Help

If you encounter issues:
1. Check the error message carefully
2. Review the test file that's failing
3. Read the documentation
4. Ask for help with specific error messages

---

**Ready to test? Run:** `pnpm test`

Happy testing! 🧪✅
