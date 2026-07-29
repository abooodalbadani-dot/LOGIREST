import { describe, it, expect } from 'vitest';
import { PERMISSION_MATRIX } from '@/types/rbac';

describe('PERMISSION_MATRIX', () => {
 it('AUDITOR can view grn', () => expect(PERMISSION_MATRIX.AUDITOR?.grn ?? []).toContain('view'));
 it('AUDITOR cannot post grn', () => expect(PERMISSION_MATRIX.AUDITOR?.grn ?? []).not.toContain('post'));
 it('ADMIN can post grn', () => expect(PERMISSION_MATRIX.ADMIN?.grn ?? []).toContain('post'));
 it('WH_KEEPER cannot post adjustment', () => expect(PERMISSION_MATRIX.WH_KEEPER?.adjustment ?? []).not.toContain('post'));
 it('INV_MGR can approve PR', () => expect(PERMISSION_MATRIX.INV_MGR?.pr ?? []).toContain('approve'));
  it('PROC_OFFICER can view issues', () => expect(PERMISSION_MATRIX.PROC_OFFICER?.issue ?? []).toContain('view'));
  
  it('WH_KEEPER can count stocktake', () => expect(PERMISSION_MATRIX.WH_KEEPER?.stocktake ?? []).toContain('count'));
  it('WH_KEEPER cannot approve stocktake', () => expect(PERMISSION_MATRIX.WH_KEEPER?.stocktake ?? []).not.toContain('approve'));
  it('WH_KEEPER can view inventory_lots', () => expect(PERMISSION_MATRIX.WH_KEEPER?.inventory_lots ?? []).toContain('view'));
  it('WH_KEEPER can view inventory_movements', () => expect(PERMISSION_MATRIX.WH_KEEPER?.inventory_movements ?? []).toContain('view'));
  it('WH_KEEPER can create procurement_grn', () => expect(PERMISSION_MATRIX.WH_KEEPER?.procurement_grn ?? []).toContain('create'));
  it('INV_MGR can review_variance stocktake', () => expect(PERMISSION_MATRIX.INV_MGR?.stocktake ?? []).toContain('review_variance'));
  it('ADMIN can close stocktake', () => expect(PERMISSION_MATRIX.ADMIN?.stocktake ?? []).toContain('close'));
  it('INV_MGR can view inventory_lots', () => expect(PERMISSION_MATRIX.INV_MGR?.inventory_lots ?? []).toContain('view'));
  it('INV_MGR cannot create kitchen_requests', () => expect(PERMISSION_MATRIX.INV_MGR?.kitchen_requests ?? []).not.toContain('create'));
  it('INV_MGR can fulfill kitchen_requests', () => expect(PERMISSION_MATRIX.INV_MGR?.kitchen_requests ?? []).toContain('fulfill'));
  it('WH_KEEPER cannot create kitchen_requests', () => expect(PERMISSION_MATRIX.WH_KEEPER?.kitchen_requests ?? []).not.toContain('create'));
  it('INV_MGR cannot approve adjustment', () => expect(PERMISSION_MATRIX.INV_MGR?.adjustment ?? []).not.toContain('approve'));
  it('STORE_MGR cannot approve adjustment', () => expect(PERMISSION_MATRIX.STORE_MGR?.adjustment ?? []).not.toContain('approve'));
  it('INV_MGR cannot approve stocktake', () => expect(PERMISSION_MATRIX.INV_MGR?.stocktake ?? []).not.toContain('approve'));
});
