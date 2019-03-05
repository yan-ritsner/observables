import { Observable } from './Observable';
import { Callback } from './Types';
import { Transaction } from './Transaction';
import { ComputedStack } from './ComputedStack';
import { ComputedData } from './ComputedData';

/**
 * Observable property data store.
 */
export class ObservableData {
  /** Property unique id */
  id: number;
  /** Owner object reference */
  target: object;
  /** Owner object property id */
  property: number;
  /** Current value */
  value: any;
  /** Previous value */
  prevValue: any;
  /** List of computed observers of this property */
  observers: ComputedData[];
  /** Map of indexes in the observers list by observer id */
  observersMap: Map<number, number>;
  /** List of subscription by sub id */
  subscriptions: Map<number, Callback>;
  /** Observable value was updates */
  isUpdated: boolean;
  /** Used by computed to indicates that this property is already observed */
  isObserved: boolean;
  /** Used by transaction to indicate that this observable update is already scheduled */
  isScheduled: boolean;
  /** Used by computed to indicate last observer */
  lastObserverId: number | null;
  /** Next subscription id counter */
  nextSubId: number;
  /** Next observable id */
  static nextId: number = 0;

  /**
   * @constructor
   * @param target - Owner object reference
   * @param property - Owner object property id
   */
  constructor(target: object, property: number) {
    this.target = target;
    this.property = property;
    this.id = ObservableData.nextId;
    ObservableData.nextId += 1;
  }

  /** Actual property name */
  get propertyName() {
    return Observable.getPropertyName(this.target, this.property);
  }
  /**
   * Returns observable value.
   * if there is computed on the stack,
   * pushes itself to the list of pending observables
   */
  getValue() {
    const computed = ComputedStack.peek();
    if (computed) computed.observe(this);
    return this.value;
  }
  /**
   * Set observable value.
   * Updates dependent computed observables,
   * notifies subscribers if no transaction is active.
   * @param value - new value
   */
  setValue(value: any) {
    this.updateValue(value);
    if (!this.isUpdated) return;
    this.updateObservers();
  }

  /**
   * Marks value as updated.
   * Forces dependencies recalculation and notifies subscribers
   **/
  staleValue() {
    this.prevValue = this.value;
    this.isUpdated = true;
    this.updateObservers();
  }

  /**
   * Updates value, set isUpdated and prevValue fields as well.
   * @param value - new value
   */
  updateValue(value: any) {
    if (this.value === value) return;
    if (this.isUpdated) {
      this.isUpdated = this.prevValue !== this.value;
    } else {
      this.prevValue = this.value;
      this.isUpdated = true;
    }
    this.value = value;
  }

  /**
   * Updates dependent computed observables
   * and notifies subscribers if no transaction is active.
   */
  updateObservers() {
    if (Transaction.isOpen) {
      Transaction.addObservable(this);
    } else {
      this.staleObservers();
      this.recomputeObservers();
      this.notifySubscribers();
    }
  }

  /**
   * Increments stale counter for all dependent computed observables
   */
  staleObservers() {
    if (this.observers == null) return;
    for (let i = this.observers.length - 1; i >= 0; i -= 1) {
      const computed = this.observers[i];
      computed.stale();
    }
  }
  /**
   * Decrements stale counter for all dependent computed observables.
   * And if counter reaches 0 recomputes.
   */
  recomputeObservers() {
    if (this.observers == null) return;
    for (let i = this.observers.length - 1; i >= 0; i -= 1) {
      const computed = this.observers[i];
      computed.recompute(this.isUpdated);
    }
  }

  /**
   * Add computed to th list of observers
   * @param observer - computed observer
   */
  addObserver(observer: ComputedData) {
    if (this.observers == null) {
      this.observers = [];
      this.observersMap = new Map();
    }
    const index = this.observers.length;
    this.observers.push(observer);
    this.observersMap.set(observer.id, index);
  }
  /**
   * Removes computed from the list of observers
   * @param id - computed observer id
   */
  removeObserver(id: number) {
    if (this.observers == null) return;
    const index = this.observersMap.get(id);
    if (index == null) return;
    this.observersMap.delete(id);
    const last = this.observers.pop();
    if (last == null) return;
    if (index === this.observers.length) return;
    this.observers[index] = last;
    this.observersMap.set(last.id, index);
  }
  /** Adds subscription callback that invoked in case of value change */
  addSubscription(callback: Callback): number {
    if (this.subscriptions == null) this.subscriptions = new Map();
    if (this.nextSubId == null) this.nextSubId = 0;
    const subId = this.nextSubId;
    this.nextSubId += 1;
    this.subscriptions.set(subId, callback);
    return subId;
  }
  /** Removed subscription callback that invoked in case of value change */
  removeSubscription(subId: number) {
    if (this.subscriptions == null) return;
    this.subscriptions.delete(subId);
  }
  /** Invokes all subscription callbacks that in case of value change */
  notifySubscribers() {
    if (this.isUpdated) {
      if (this.subscriptions != null &&
        this.subscriptions.size > 0) {
        this.subscriptions.forEach(sub => sub(this.value, this.prevValue));
      }
      this.isUpdated = false;
      this.prevValue = null;
    }
  }
}
