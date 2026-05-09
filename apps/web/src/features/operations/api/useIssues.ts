import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { Issue, CreateIssueDTO } from '../types';
import { ISSUE_STATUS } from '@/contracts/statuses';


const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - 86400000 * d).toISOString();

const mockIssues: Issue[] = [
 {
 id: 'iss-001',
 issueNumber: 'ISS-2024-001',
 warehouseId: 'wh-001',
 departmentId: 'dept-kitchen-1',
 requestedBy: 'chef-ali',
  status: ISSUE_STATUS.POSTED,
 items: [
 {
 id: 'il-001',
 itemId: 'item-tomato',
 requestedQuantity: 10,
 allocatedQuantity: 10,
 lots: [
 { lotNumber: 'LOT-T01', expiryDate: '2024-12-31', allocatedQuantity: 10 },
 ],
 },
 ],
 createdAt: daysAgo(3),
 updatedAt: daysAgo(2),
 postedAt: daysAgo(2),
 postedBy: 'wh-keeper-1',
 },
 {
 id: 'iss-002',
 issueNumber: 'ISS-2024-002',
 warehouseId: 'wh-001',
 departmentId: 'dept-kitchen-2',
 requestedBy: 'chef-sara',
  status: ISSUE_STATUS.DRAFT,
 items: [
 {
 id: 'il-002',
 itemId: 'item-oil',
 requestedQuantity: 5,
 allocatedQuantity: 0,
 lots: [],
 },
 {
 id: 'il-003',
 itemId: 'item-salt',
 requestedQuantity: 2,
 allocatedQuantity: 2,
 lots: [
 { lotNumber: 'LOT-S01', expiryDate: '2025-06-01', allocatedQuantity: 2 },
 ],
 },
 ],
 createdAt: daysAgo(1),
 updatedAt: daysAgo(0),
 },
 {
 id: 'iss-003',
 issueNumber: 'ISS-2024-003',
 warehouseId: 'wh-002',
 departmentId: 'dept-kitchen-1',
 requestedBy: 'chef-ali',
  status: ISSUE_STATUS.POSTED,
 items: [
 {
 id: 'il-004',
 itemId: 'item-cheese',
 requestedQuantity: 3,
 allocatedQuantity: 3,
 lots: [
 // Expired lot — triggers override flow
 { lotNumber: 'LOT-C01', expiryDate: '2023-01-01', allocatedQuantity: 1, isExpired: true },
 { lotNumber: 'LOT-C02', expiryDate: '2025-09-15', allocatedQuantity: 2 },
 ],
 },
 ],
 createdAt: daysAgo(5),
 updatedAt: daysAgo(4),
 postedAt: daysAgo(4),
 postedBy: 'wh-keeper-1',
 },
];

let nextId = 4;

export function useIssues() {
 return useQuery({
 queryKey: ['issues'],
 queryFn: async () => {
 await new Promise((r) => setTimeout(r, 700));
 return [...mockIssues];
 },
 });
}

export function useIssue(id: string) {
 return useQuery({
 queryKey: ['issues', id],
 queryFn: async () => {
 await new Promise((r) => setTimeout(r, 400));
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
 issueNumber: `ISS-2024-00${nextId}`,
 warehouseId: data.warehouseId,
 departmentId: data.departmentId,
 requestedBy: 'current-user',
  status: ISSUE_STATUS.DRAFT,
 items: data.items.map((it, idx) => ({ ...it, id: `il-new-${idx}` })),
 notes: data.notes,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
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
 postedAt: new Date().toISOString(),
 postedBy: 'current-user',
 updatedAt: new Date().toISOString(),
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
