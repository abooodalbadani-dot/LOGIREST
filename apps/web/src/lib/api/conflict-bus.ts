import { ConflictError } from './ConflictError';
import { Mutation } from '@tanstack/react-query';

export interface ConflictEventPayload {
  error: ConflictError;
  mutation: Mutation<any, any, any, any>;
  variables: any;
}

type ConflictListener = (payload: ConflictEventPayload) => void;

class ConflictBus {
  private listeners: ConflictListener[] = [];

  subscribe(listener: ConflictListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(payload: ConflictEventPayload) {
    this.listeners.forEach((l) => l(payload));
  }
}

export const conflictBus = new ConflictBus();
