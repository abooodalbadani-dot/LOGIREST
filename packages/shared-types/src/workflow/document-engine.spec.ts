import { describe, it, expect } from 'vitest';
import { canPerformActionV2 } from './document-engine';

describe('canPerformActionV2', () => {
  // US3: Status locks should not be bypassable by role capabilities
  describe('status lock enforcement (takes precedence over role)', () => {
    it('should return false for POSTED kitchen request trying to SUBMIT (status lock)', () => {
      const result = canPerformActionV2(
        'kitchen_request',
        'FULFILLED' as any,
        'SUBMIT' as any,
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for POSTED purchase request trying to APPROVE (status lock)', () => {
      const result = canPerformActionV2(
        'pr',
        'APPROVED' as any,
        'SUBMIT' as any,
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for CANCELLED document with any role', () => {
      const result = canPerformActionV2(
        'pr',
        'CANCELLED' as any,
        'SUBMIT' as any,
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for POSTED issue trying to POST again', () => {
      const result = canPerformActionV2(
        'issue',
        'POSTED' as any,
        'POST' as any,
        'ADMIN',
      );
      expect(result).toBe(false);
    });
  });

  describe('valid transitions still work', () => {
    it('should allow DRAFT kitchen request to SUBMIT for ADMIN', () => {
      const result = canPerformActionV2(
        'kitchen_request',
        'DRAFT' as any,
        'SUBMIT' as any,
        'ADMIN',
      );
      expect(result).toBe(true);
    });

    it('should allow DRAFT purchase request to SUBMIT for PROC_OFFICER', () => {
      const result = canPerformActionV2(
        'pr',
        'DRAFT' as any,
        'SUBMIT' as any,
        'PROC_OFFICER',
      );
      expect(result).toBe(true);
    });

    it('should allow APPROVED purchase request to CONVERT_TO_PO for ADMIN', () => {
      const result = canPerformActionV2(
        'pr',
        'APPROVED' as any,
        'CONVERT_TO_PO' as any,
        'ADMIN',
      );
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return false for missing role', () => {
      const result = canPerformActionV2('pr', 'DRAFT' as any, 'SUBMIT' as any);
      expect(result).toBe(false);
    });

    it('should return false for unknown document type', () => {
      const result = canPerformActionV2(
        'unknown' as any,
        'DRAFT' as any,
        'SUBMIT' as any,
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for unknown action on valid status', () => {
      const result = canPerformActionV2(
        'pr',
        'DRAFT' as any,
        'VOID' as any,
        'ADMIN',
      );
      expect(result).toBe(false);
    });
  });
});
