import { ObservableData } from './ObservableData';

/**
 * Observable Transaction functionality.
 * Used by actions and computed observable setters
 * If code is wrapped in transaction begin and end,
 * any computed re-computations and observable change notifications will be suspended
 * until the topmost transaction end.
 */
export class Transaction {
  /** Active transaction counter */
  static count: number = 0;
  /** List of updated observables while transaction is active */
  static observables: ObservableData[] = [];

  /**
   * Increments transaction counter
   **/
  static begin() {
    Transaction.count += 1;
  }
  /**
   * Decrements transaction counter.
   * If reaches 0, recomputes affected computed observables,
   * and notifies subscribers
   **/
  static end() {
    Transaction.count -= 1;
    if (Transaction.count > 0) return;
    const observables = Transaction.observables;
    if (observables.length === 0) return;
    Transaction.observables = [];
    Transaction.staleObservers(observables);
    Transaction.updateObservers(observables);
  }
  /**
   * Adds observable to the pending list
   * @param observable - observable reference
   */
  static addObservable(observable: ObservableData) {
    if (observable.isScheduled) return;
    Transaction.observables.push(observable);
    observable.isScheduled = true;
  }
  /** Recursively increments stale counter of all affected computed observables */
  static staleObservers(observables : ObservableData[]) {
    for (let i = 0; i < observables.length; i += 1) {
      const observable = observables[i];
      observable.isScheduled = false;
      observable.staleObservers();
    }
  }
  /** Recursively recomputes all affected computed observables and notifies observable updates */
  static updateObservers(observables: ObservableData[]) {
    for (let i = 0; i < observables.length; i += 1) {
      const observable = observables[i];
      observable.recomputeObservers();
      observable.notifySubscribers();
    }
  }
  /** Indicates if there is an active transaction */
  static get isOpen() {
    return Transaction.count > 0;
  }
}
