/**
 * Test Utilities for Black Belt Platform
 * 
 * This file contains helper functions and fixtures for testing.
 */

import { nanoid } from "nanoid";

/**
 * Create a mock tenant for testing
 */
export function createMockTenant(overrides: Partial<any> = {}) {
  return {
    id: nanoid(),
    name: "Test Company",
    cnpj: "12.345.678/0001-90",
    status: "active" as const,
    strategy: "shared_rls" as const,
    contactName: "John Doe",
    contactEmail: "john@testcompany.com",
    contactPhone: "+55 11 98765-4321",
    street: "Test Street",
    number: "123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock sector for testing
 */
export function createMockSector(tenantId: string, overrides: Partial<any> = {}) {
  return {
    id: nanoid(),
    tenantId,
    name: "Engineering",
    description: "Engineering department",
    responsibleName: "Jane Smith",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock person for testing
 */
export function createMockPerson(tenantId: string, sectorId: string | null = null, overrides: Partial<any> = {}) {
  return {
    id: nanoid(),
    tenantId,
    sectorId,
    name: "John Employee",
    position: "Software Engineer",
    email: "john.employee@testcompany.com",
    phone: "+55 11 99999-8888",
    employmentType: "own" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock client for pricing
 */
export function createMockClient(tenantId: string, overrides: Partial<any> = {}) {
  return {
    id: nanoid(),
    tenantId,
    name: "Client Company",
    cnpj: "98.765.432/0001-10",
    industry: "Technology",
    companySize: "medium" as const,
    contactName: "Bob Client",
    contactEmail: "bob@clientcompany.com",
    contactPhone: "+55 11 91111-2222",
    street: "Client Street",
    number: "456",
    city: "Rio de Janeiro",
    state: "RJ",
    zipCode: "20000-000",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock service for pricing
 */
export function createMockService(tenantId: string, overrides: Partial<any> = {}) {
  return {
    id: nanoid(),
    tenantId,
    name: "Risk Assessment Service",
    description: "Complete psychosocial risk assessment according to NR-01",
    category: "compliance",
    unitType: "hours" as const,
    basePrice: 150.00,
    estimatedDuration: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock pricing parameters
 */
export function createMockPricingParameters(tenantId: string, overrides: Partial<any> = {}) {
  return {
    id: nanoid(),
    tenantId,
    taxRegime: "simples_nacional" as const,
    fixedCosts: 5000.00,
    laborCosts: 3000.00,
    productiveHoursPerMonth: 160,
    profitMargin: 30.00,
    discountTier1Min: 10,
    discountTier1Rate: 5.00,
    discountTier2Min: 20,
    discountTier2Rate: 10.00,
    discountTier3Min: 50,
    discountTier3Rate: 15.00,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: nanoid(),
    name: "Test User",
    email: "testuser@example.com",
    loginMethod: "oauth",
    role: "user" as const,
    createdAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

/**
 * Mock database connection
 */
export function createMockDb() {
  const mockData: any = {
    tenants: [],
    sectors: [],
    people: [],
    clients: [],
    services: [],
    pricingParameters: [],
    proposals: [],
    proposalItems: [],
  };

  return {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          orderBy: (order: any) => ({
            limit: (limit: number) => ({
              offset: (offset: number) => Promise.resolve(mockData[table._.name] || []),
            }),
          }),
        }),
      }),
    }),
    insert: (table: any) => ({
      values: (data: any) => {
        const tableName = table._.name;
        if (!mockData[tableName]) mockData[tableName] = [];
        mockData[tableName].push(data);
        return Promise.resolve();
      },
      onDuplicateKeyUpdate: (options: any) => Promise.resolve(),
    }),
    update: (table: any) => ({
      set: (data: any) => ({
        where: (condition: any) => Promise.resolve(),
      }),
    }),
    delete: (table: any) => ({
      where: (condition: any) => Promise.resolve(),
    }),
  };
}

/**
 * Validate CNPJ format (simplified for testing)
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, "");
  return cleaned.length === 14;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
