export type StocktakeStatus = 'OPEN'|'COUNTING'|'REVIEW'|'POSTED'|'CANCELLED';
export interface StocktakeSession { id: string; session_number: string; warehouse_id: string; status: StocktakeStatus; snapshot_at: string; started_by: string; posted_at: string | null; posted_by: string | null; counts: StocktakeCount[]; }
export interface StocktakeCount { id: string; session_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; }; lot_id: string | null; snapshot_qty: number; counted_qty: number | null; variance: number | null; variance_reason: string | null; }
export interface WarehouseLockState { is_locked: boolean; session_id: string | null; session_number: string | null; lock_started_at: string | null; }
