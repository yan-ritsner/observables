import { ComputedData } from './ComputedData';
import { Observable } from './Observable';
import { xo } from './xo';

/**
 * Object with one computed value property
 */
export class ComputedValue<T> {
  /** Computed getter */
  get: () => T;
  /** Computed optional setter */
  set?: (value: T) => void;
  /**
   * @constructor
   * @param get - getter callback
   * @param set - setter callback
   */
  constructor(get: () => T, set?: (value: T) => void) {
    this.get = get;
    this.set = set;
  }
  /** Computed value property */
  @xo.computed
  get value(): T {
    return this.get();
  }
  set value(value: T) {
    if (this.set) {
      this.set(value);
    }
  }
  /** Disposes computed */
  dispose() {
    xo.dispose(this);
  }

  compute() : T {
    const computed = Observable.getProperty(this, 'value') as ComputedData;
    computed.compute(true);
    return computed.value;
  }
}
