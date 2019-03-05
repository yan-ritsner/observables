import { Fields } from './Fields';
import { ArrayChangeCallback, ArrayChangeType } from './Types';
import { xo } from './xo';

/**
 * Observable array.
 * 1. Has data - underlying array property as observable.
 * 2. Provides most of standard array functions proxies.
 * 3. Provides subscribe/unsubscribe functionality to receive underlying array update notifications.
 * 4. `Important` ObservableArray doesn't support indexer accessor ([])
 *     as it is not possible without using es6 proxy to define indexer with custom get/set.
 *     Use get/set methods instead, or non observable/reactive data[];
 **/
export class ObservableArray<T = any> {

  /** Underlying data array observable */
  @xo.observable
  data: T[];
  /** Data array revision value - incremented with each update */
  revision: number = 0;
  /** Subscriptions callbacks map by id */
  subscriptions: Map<number, ArrayChangeCallback<T>>;
  /** Next subscriptions id */
  subIdGen: number = 0;

  /**
   * @constructor
   * @param data - initial array value
   */
  constructor(data: T[] = []) {
    this.data = data;
  }

  /** Underlying data array length*/
  get length(): number {
    return this.data.length;
  }

  /**
   * Subscribe to array changes
   * @param callback - callback function
   */
  subscribe(callback: ArrayChangeCallback<T>): number {
    if (this.subscriptions == null) {
      this.subscriptions = new Map<number, ArrayChangeCallback<T>>();
    }
    const subId = this.subIdGen;
    this.subIdGen += 1;
    this.subscriptions.set(subId, callback);
    return subId;
  }

  /**
   * Unsubscribe from array changes
   * @param callback - callback function
   */
  unsubscribe(subId: number) {
    if (this.subscriptions == null) return;
    this.subscriptions.delete(subId);
  }

  /** Force notify data observable prop update */
  notifyDataChange() {
    xo.notify(this, 'data');
  }

  /** Notify array entry update at specific index */
  notifyUpdate(index: number, oldValue: T, newValue: T) {
    if (this.subscriptions == null) return;
    this.subscriptions.forEach((callback) => {
      callback({
        index,
        oldValue,
        newValue,
        type: ArrayChangeType.Update,
        object: this,
      });
    });
  }

  /** Notify entire array replace*/
  notifyReplace(oldValue: T[], newValue: T[]) {
    if (this.subscriptions == null) return;
    this.subscriptions.forEach((callback) => {
      callback({
        oldValue,
        newValue,
        type: ArrayChangeType.Replace,
        object: this,
      });
    });
  }

  /** Notify array splice (add/remove items)*/
  notifySplice(index: number, added: T[] | null, removed: T[] | null) {
    if (this.subscriptions == null) return;
    this.subscriptions.forEach((callback) => {
      callback({
        index,
        added,
        removed,
        type: ArrayChangeType.Splice,
        object: this,
      });
    });
  }

  /** Increments array revision */
  updateRevision() {
    this.revision += 1;
    this.data[Fields.Revision] += this.revision;
  }

  /** Returns entry at specified index */
  get(index: number): T {
    return this.data[index];
  }

  /** Sets entry at specified index */
  @xo.action
  set(index: number, value: T) {
    const oldValue = this.data[index];
    this.data[index] = value;
    this.updateRevision();
    this.notifyDataChange();
    this.notifyUpdate(index, oldValue, value);
  }

  /** Assigns new array data */
  @xo.action
  assign(data: T[]) {
    const oldData = this.data;
    this.data = data;
    this.updateRevision();
    this.notifyReplace(oldData, this.data);
  }

  /** Clear entire array */
  @xo.action
  clear() {
    const oldData = this.data;
    this.data = [];
    this.updateRevision();
    this.notifyReplace(oldData, this.data);
  }

  /** Splice array at index (add/remove items) */
  @xo.action
  splice(start: number, deleteCount: number, ...items: T[]): T[] {
    const removed = Array.prototype.splice.apply(this.data, arguments);
    this.updateRevision();
    this.notifyDataChange();
    this.notifySplice(start, items, removed);
    return removed;
  }

  /** Inserts items at the end of array */
  @xo.action
  push(...items: T[]): number {
    const start = this.data.length;
    Array.prototype.push.apply(this.data, arguments);
    this.updateRevision();
    this.notifyDataChange();
    this.notifySplice(start, items, null);
    return this.data.length;
  }

  /** Removes the last element from an array and returns it. */
  @xo.action
  pop(): T | undefined {
    const value = this.data.pop();
    this.updateRevision();
    this.notifyDataChange();
    this.notifySplice(this.data.length, null, value ? [value] : null);
    return value;
  }

  /** Removes the first element from an array and returns it */
  @xo.action
  shift(): T | undefined {
    const value = this.data.shift();
    this.updateRevision();
    this.notifyDataChange();
    this.notifySplice(0, null, value ? [value] : null);
    return value;
  }

  /** Inserts new elements at the start of an array. */
  @xo.action
  unshift(...items: T[]): number {
    Array.prototype.unshift.apply(this.data, arguments);
    this.updateRevision();
    this.notifyDataChange();
    this.notifySplice(0, items, null);
    return this.data.length;
  }

  /** Removes element from array */
  @xo.action
  remove(item: T): boolean {
    const index = this.indexOf(item);
    if (index < 0) return false;
    this.data.splice(index, 1);
    this.updateRevision();
    this.notifySplice(index, null, [item]);
    return true;
  }

  /** Returns slice of the array - without modifying original */
  slice(start?: number, end?: number) {
    return this.data.slice(start, end);
  }

  /** Copies and sorts underlying array - without modifying original */
  sort(compareFn?: (a: T, b: T) => number) : T[] {
    return this.slice().sort(compareFn);
  }

  /**
   * Returns the value of the first element in the array where predicate is true,
   * and undefined otherwise.
   **/
  find(predicate: (item: T, index: number, array: T[]) => boolean, thisArg?: any): T | undefined {
    return this.data.find(predicate, thisArg);
  }

  /**
   * Returns the index of the first element in the array where predicate is true,
   * and -1 otherwise.
   **/
  findIndex(predicate: (item: T, index: number, array: T[]) => boolean, thisArg?: any): number {
    return this.data.findIndex(predicate, thisArg);
  }

  /** Returns the index of the first occurrence of a value in an array. */
  indexOf(searchElement: T, fromIndex?: number): number {
    return this.data.indexOf(searchElement, fromIndex);
  }

  /** Determines whether all the members of an array satisfy the specified test. */
  every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
    return this.data.every(callbackfn, thisArg);
  }

  /**
   * Determines whether the specified callback function
   * returns true for any element of an array.
   * */
  some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
    return this.data.some(callbackfn, thisArg);
  }

  /** Performs the specified action for each element in an array. */
  forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
    return this.data.forEach(callbackfn, thisArg);
  }

  /** Calls a defined callback function on each element of an array, and returns an array that */
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
    return this.data.map(callbackfn, thisArg);
  }

  /** Returns the elements of an array that meet the condition specified in a callback function. */
  filter(callbackfn: (value: T, index: number, array: T[]) => any, thisArg?: any): T[] {
    return this.data.filter(callbackfn, thisArg);
  }
}
