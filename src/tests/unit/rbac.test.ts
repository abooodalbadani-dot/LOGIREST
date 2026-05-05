import { describe, it, expect } from 'vitest';
import { PERMISSION_MATRIX } from '@/types/rbac';

describe('PERMISSION_MATRIX', () => {
 it('AUDITOR can view grn', () => expect(PERMISSION_MATRIX.AUDITOR?.grn ?? []).toContain('view'));
 it('AUDITOR cannot post grn', () => expect(PERMISSION_MATRIX.AUDITOR?.grn ?? []).not.toContain('post'));
 it('ADMIN can post grn', () => expect(PERMISSION_MATRIX.ADMIN?.grn ?? []).toContain('post'));
 it('WH_KEEPER cannot post adjustment', () => expect(PERMISSION_MATRIX.WH_KEEPER?.adjustment ?? []).not.toContain('post'));
 it('INV_MGR can approve PR', () => expect(PERMISSION_MATRIX.INV_MGR?.pr ?? []).toContain('approve'));
 it('PROC_OFFICER can view issues', () => expect(PERMISSION_MATRIX.PROC_OFFICER?.issue ?? []).toContain('view'));
});
