import { xo } from './xo';

/**
 * Object with one observable value property
 */
export default class ObservableValue<T> {
  /**
  * @constructor
  * @param value - initial value
  */
  constructor(value?: T) {
    if (value !== undefined) {
      this.value = value;
    }
  }
  /** Observable value property */
  @xo.observable
  value: T;
  /** Disposes observable */
  dispose() {
    xo.dispose(this);
  }
}
