type ConflictInfo = {
  message: string;
  code: string;
  currentVersion?: number;
  updatedBy?: string;
  updatedAt?: string;
};

type Listener = (conflict: ConflictInfo | null) => void;

class ConflictStore {
  private conflict: ConflictInfo | null = null;
  private listeners: Set<Listener> = new Set();

  setConflict(conflict: ConflictInfo | null) {
    this.conflict = conflict;
    this.listeners.forEach(l => l(conflict));
  }

  getConflict() {
    return this.conflict;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const conflictStore = new ConflictStore();
