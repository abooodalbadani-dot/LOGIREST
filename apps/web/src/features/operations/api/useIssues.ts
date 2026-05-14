import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { Issue, CreateIssueDTO, IssueLineItem } from '../types';
import { ISSUE_STATUS } from '@/contracts/statuses';


const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - 86400000 * d).toISOString();

const mockIssues: Issue[] = [
  {
    id: 'iss-001',
    document_number: 'ISS-2024-001',
    warehouse_id: 'wh-001',
    destination_dept_id: 'dept-kitchen-1',
    requested_by: 'chef-ali',
    status: ISSUE_STATUS.POSTED,
    lines: [
      {
        id: 'il-001',
        item_id: 'item-tomato',
        requested_qty: 10,
        qty: 10,
        lot_allocations: [
          { lot_number: 'LOT-T01', expiry_date: '2024-12-31', allocated_qty: 10 },
        ],
      },
    ],
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
    posted_at: daysAgo(2),
    posted_by: 'wh-keeper-1',
  },
  {
    id: 'iss-002',
    document_number: 'ISS-2024-002',
    warehouse_id: 'wh-001',
    destination_dept_id: 'dept-kitchen-2',
    requested_by: 'chef-sara',
    status: ISSUE_STATUS.DRAFT,
    lines: [
      {
        id: 'il-002',
        item_id: 'item-oil',
        requested_qty: 5,
        qty: 0,
        lot_allocations: [],
      },
      {
        id: 'il-003',
        item_id: 'item-salt',
        requested_qty: 2,
        qty: 2,
        lot_allocations: [
          { lot_number: 'LOT-S01', expiry_date: '2025-06-01', allocated_qty: 2 },
        ],
      },
    ],
    created_at: daysAgo(1),
    updated_at: daysAgo(0),
  },
  {
    id: 'iss-003',
    document_number: 'ISS-2024-003',
    warehouse_id: 'wh-002',
    destination_dept_id: 'dept-kitchen-1',
    requested_by: 'chef-ali',
    status: ISSUE_STATUS.POSTED,
    lines: [
      {
        id: 'il-004',
        item_id: 'item-cheese',
        requested_qty: 3,
        qty: 3,
        lot_allocations: [
          // Expired lot — triggers override flow
          { lot_number: 'LOT-C01', expiry_date: '2023-01-01', allocated_qty: 1, is_expired: true },
          { lot_number: 'LOT-C02', expiry_date: '2025-09-15', allocated_qty: 2 },
        ],
      },
    ],
    created_at: daysAgo(5),
    updated_at: daysAgo(4),
    posted_at: daysAgo(4),
    posted_by: 'wh-keeper-1',
  },
];

let nextId = 4;

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: async ({ signal }) => {
      await new Promise((r) => setTimeout(r, 700));
      if (signal?.aborted) throw new Error('Aborted');
      return [...mockIssues];
    },
  });
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: async ({ signal }) => {
      await new Promise((r) => setTimeout(r, 400));
      if (signal?.aborted) throw new Error('Aborted');
      const issue = mockIssues.find((i) => i.id === id);
      if (!issue) throw new Error('Issue not found');
      return { ...issue };
    },
    enabled: !!id,
  });
}

export function useCreateIssue(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    mutationFn: async (data: CreateIssueDTO) => {
      await new Promise((r) => setTimeout(r, 900));
      const newIssue: Issue = {
        id: `iss-00${nextId++}`,
        document_number: `ISS-2024-00${nextId}`,
        warehouse_id: data.warehouse_id,
        destination_dept_id: data.destination_dept_id,
        requested_by: 'current-user',
        status: ISSUE_STATUS.DRAFT,
        lines: data.lines.map((it, idx) => ({ 
          ...it, 
          id: `il-new-${idx}`,
          qty: it.lot_allocations.reduce((acc, l) => acc + l.allocated_qty, 0)
        })) as IssueLineItem[],
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockIssues.unshift(newIssue);
      return newIssue;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
    onConflict: options?.onConflict,
  });
}

export function usePostIssue(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    mutationFn: async (id: string) => {
      await new Promise((r) => setTimeout(r, 800));
      const idx = mockIssues.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error('Issue not found');
      const updated = {
        ...mockIssues[idx],
        status: ISSUE_STATUS.POSTED,
        posted_at: new Date().toISOString(),
        posted_by: 'current-user',
        updated_at: new Date().toISOString(),
      };
      mockIssues[idx] = updated;
      return updated;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      qc.invalidateQueries({ queryKey: ['issues', id] });
    },
    onConflict: options?.onConflict,
  });
}
