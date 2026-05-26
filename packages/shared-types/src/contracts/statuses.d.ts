export declare const PR_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly SUBMITTED: "SUBMITTED";
    readonly APPROVED: "APPROVED";
    readonly REJECTED: "REJECTED";
    readonly CANCELLED: "CANCELLED";
    readonly FULFILLED: "FULFILLED";
};
export type PRStatus = typeof PR_STATUS[keyof typeof PR_STATUS];
export declare const ALL_PR_STATUSES: readonly ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED", "FULFILLED"];
export declare const PO_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly SUBMITTED: "SUBMITTED";
    readonly APPROVED: "APPROVED";
    readonly REJECTED: "REJECTED";
    readonly CANCELLED: "CANCELLED";
    readonly PARTIAL: "PARTIAL";
    readonly FULFILLED: "FULFILLED";
};
export type POStatus = typeof PO_STATUS[keyof typeof PO_STATUS];
export declare const ALL_PO_STATUSES: readonly ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED", "PARTIAL", "FULFILLED"];
export declare const GRN_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly RECEIVED: "RECEIVED";
    readonly POSTED: "POSTED";
    readonly CANCELLED: "CANCELLED";
    readonly VOIDED: "VOIDED";
};
export type GRNStatus = typeof GRN_STATUS[keyof typeof GRN_STATUS];
export declare const ALL_GRN_STATUSES: readonly ["DRAFT", "RECEIVED", "POSTED", "CANCELLED", "VOIDED"];
export declare const STOCKTAKE_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly STARTED: "STARTED";
    readonly COUNTING: "COUNTING";
    readonly REVIEW: "REVIEW";
    readonly APPROVED: "APPROVED";
    readonly POSTED: "POSTED";
    readonly CLOSED: "CLOSED";
    readonly CANCELLED: "CANCELLED";
    readonly VOIDED: "VOIDED";
};
export type StocktakeStatus = typeof STOCKTAKE_STATUS[keyof typeof STOCKTAKE_STATUS];
export declare const ALL_STOCKTAKE_STATUSES: readonly ["DRAFT", "STARTED", "COUNTING", "REVIEW", "APPROVED", "POSTED", "CLOSED", "CANCELLED", "VOIDED"];
export declare const TRANSFER_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly IN_TRANSIT: "IN_TRANSIT";
    readonly RECEIVED: "RECEIVED";
    readonly POSTED: "POSTED";
    readonly CANCELLED: "CANCELLED";
    readonly VOIDED: "VOIDED";
};
export type TransferStatus = typeof TRANSFER_STATUS[keyof typeof TRANSFER_STATUS];
export declare const ALL_TRANSFER_STATUSES: readonly ["DRAFT", "IN_TRANSIT", "RECEIVED", "POSTED", "CANCELLED", "VOIDED"];
export declare const ISSUE_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly SUBMITTED: "SUBMITTED";
    readonly POSTED: "POSTED";
    readonly CANCELLED: "CANCELLED";
    readonly VOIDED: "VOIDED";
};
export type IssueStatus = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];
export declare const ALL_ISSUE_STATUSES: readonly ["DRAFT", "SUBMITTED", "POSTED", "CANCELLED", "VOIDED"];
export declare const ADJUSTMENT_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly SUBMITTED: "SUBMITTED";
    readonly APPROVED: "APPROVED";
    readonly REJECTED: "REJECTED";
    readonly POSTED: "POSTED";
    readonly CANCELLED: "CANCELLED";
    readonly VOIDED: "VOIDED";
};
export type AdjustmentStatus = typeof ADJUSTMENT_STATUS[keyof typeof ADJUSTMENT_STATUS];
export declare const ALL_ADJUSTMENT_STATUSES: readonly ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "POSTED", "CANCELLED", "VOIDED"];
export declare const KITCHEN_REQUEST_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly SUBMITTED: "SUBMITTED";
    readonly APPROVED: "APPROVED";
    readonly REJECTED: "REJECTED";
    readonly FULFILLED: "FULFILLED";
    readonly CANCELLED: "CANCELLED";
    readonly VOIDED: "VOIDED";
};
export type KitchenRequestStatus = typeof KITCHEN_REQUEST_STATUS[keyof typeof KITCHEN_REQUEST_STATUS];
export declare const ALL_KITCHEN_REQUEST_STATUSES: readonly ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "FULFILLED", "CANCELLED", "VOIDED"];
export declare const ALL_STATUSES: readonly ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "POSTED", "CANCELLED", "RECEIVED", "FULFILLED", "PARTIAL", "STARTED", "COUNTING", "IN_TRANSIT", "OPEN", "VOIDED", "REVIEW", "CLOSED", "VARIANCE_SUBMITTED", "COUNTING_COMPLETED", "ACTIVE", "INACTIVE"];
export type DocumentStatus = typeof ALL_STATUSES[number];
export declare function assertNever(x: never): never;
