import { faker } from '@faker-js/faker';

export type AnonymizationRule = {
  table: string;
  column: string;
  generate: () => string;
};

const PII_ANONYMIZATION_RULES: AnonymizationRule[] = [
  {
    table: 'user',
    column: 'name',
    generate: () => faker.person.fullName(),
  },
  {
    table: 'user',
    column: 'email',
    generate: () => faker.internet.email({ provider: 'logirest-staging.com' }),
  },
  {
    table: 'user',
    column: 'passwordHash',
    generate: () =>
      '$2b$10$StaticHashForStagingTestingOnlyDoNotUseInProduction',
  },
  {
    table: 'supplier',
    column: 'name',
    generate: () => `Supplier ${faker.location.country()} Branch`,
  },
  {
    table: 'supplier',
    column: 'contactEmail',
    generate: () => faker.internet.email({ provider: 'suppliers.com' }),
  },
  {
    table: 'supplier',
    column: 'contactPhone',
    generate: () => faker.phone.number({ style: 'international' }),
  },
];

export interface ItemCostFactor {
  itemId: string;
  factor: number;
}

export function generateItemFactor(): number {
  return 1 + (Math.random() - 0.5) * 0.3;
}

export function applyCostFactor(value: number, factor: number): number {
  return Math.round(value * factor * 100) / 100;
}

export function getAnonymizationRules(): AnonymizationRule[] {
  return PII_ANONYMIZATION_RULES;
}

export function getRulesForTable(table: string): AnonymizationRule[] {
  return PII_ANONYMIZATION_RULES.filter((r) => r.table === table);
}

export function sanitizeValue(table: string, column: string): string | null {
  const rule = PII_ANONYMIZATION_RULES.find(
    (r) => r.table === table && r.column === column,
  );
  return rule ? rule.generate() : null;
}
