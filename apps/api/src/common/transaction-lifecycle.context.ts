import { AsyncLocalStorage } from 'async_hooks';

export type PostCommitCallback = () => Promise<void> | void;

export const transactionLifecycleStore = new AsyncLocalStorage<
  Array<PostCommitCallback>
>();
