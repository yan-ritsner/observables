import { Callback, Property } from './Types';
import { ComputedData } from './ComputedData';
import { ObservableData } from './ObservableData';
import { Transaction } from './Transaction';
import { Fields } from './Fields';

/**
 * Static observable object function:
 * 1) observable, computed, action decorators implementation.
 * 2) subscribe, unsubscribe, notify, dispose helper methods.
 */
export class Observable {
  /**
   * Creates and stores mappings between property id and property name.
   * in the observable object prototype.
   * @param target - target object prototype.
   * @param property - target property.
   */
  static createProperty(target: object, property: Property): number {
    let targetProps = target[Fields.Props] as Map<Property, number>;
    let targetPropNames = target[Fields.PropNames] as Map<number, Property>;
    let targetPropId = target[Fields.PropId] as number;
    if (!targetProps) {
      target[Fields.Props] = targetProps = new Map<Property, number>();
      target[Fields.PropNames] = targetPropNames = new Map<number, Property>();
      target[Fields.PropId] = targetPropId = 0;
    }
    const currentPropId = targetPropId;
    targetProps.set(property, currentPropId);
    targetPropNames.set(currentPropId, property);
    target[Fields.PropId] += 1;
    return currentPropId;
  }

  /**
   * Returns (creates if not yet exists) new observable property data
   * @param target - target object.
   * @param property - target property.
  */
  static getObservable(target: object, property: number): ObservableData {
    let data = target[Fields.Data] as ObservableData[];
    if (!data) data = target[Fields.Data] = [];
    let observable = data[property];
    if (!observable) observable = data[property] = new ObservableData(target, property);
    return observable;
  }

  /**
   * Returns (creates if not yet exists) new computed property data
   * @param target - target object.
   * @param property - target property.
  */
  static getComputed(target: object, property: number): ComputedData {
    let data = target[Fields.Data] as ObservableData[];
    if (!data) data = target[Fields.Data] = [];
    let computed = data[property] as ComputedData;
    if (!computed) computed = data[property] = new ComputedData(target, property);
    return computed;
  }

  /**
   * Returns observable property data for the property name
   * @param target - target object.
   * @param property - target property.
   */
  static getProperty<T>(target: T, property: Property): ObservableData | null {
    target[property]; // init
    const targetProps = target[Fields.Props] as Map<Property, number>;
    if (!targetProps) return null;
    const propertyId = targetProps.get(property);
    if (propertyId == null) return null;
    const data = target[Fields.Data] as ObservableData[];
    if (!data) return null;
    const observable = data[propertyId] as ObservableData;
    return observable ? observable : null;
  }

  /**
   * Returns observable property name by id
   * @param target - target object.
   * @param property - target property.
   */
  static getPropertyName(target: object, property : number) {
    const targetPropNames = target[Fields.PropNames] as Map<number, Property>;
    if (!targetPropNames) return null;
    return targetPropNames.get(property);
  }

  /**
   * @xo.observable decorator implementation - converts decorated field to observable
   * @param target - target object
   * @param property - target property
   * @param descriptor - optional property descriptor
   */
  static observable(
    target: object,
    property: Property,
    descriptor?: PropertyDescriptor,
  ): any {
    const propertyId = Observable.createProperty(target, property);
    return {
      configurable: true,
      enumerable: true,
      get() {
        const observable = Observable.getObservable(this, propertyId);
        return observable.getValue();
      },
      set(value: any) {
        const observable = Observable.getObservable(this, propertyId);
        observable.setValue(value);
      },
    };
  }

  /**
   * @xo.computed decorator implementation - converts decorated property to computed
   * @param target - target object
   * @param property - target property
   * @param descriptor - optional property descriptor
   */
  static computed(
    target: object,
    property: Property,
    descriptor?: PropertyDescriptor,
  ): any {
    const propertyId = Observable.createProperty(target, property);
    return {
      configurable: true,
      enumerable: true,
      get() {
        if (!descriptor || !descriptor.get) return;
        const computed = Observable.getComputed(this, propertyId);
        if (computed.callback == null) {
          computed.callback = descriptor.get;
          computed.compute(true);
        } else {
          computed.checkRecompute();
        }
        return computed.getValue();
      },
      set(value: any) {
        if (!descriptor || !descriptor.set) return;
        Transaction.begin();
        descriptor.set.apply(this, [value]);
        Transaction.end();
      },
    };
  }

  /**
   * Creates and returns reaction.
   * Reaction is computed and acts as computed tracking all observable dependencies.
   * Unlike the computed it doesn't re-compute value on change,
   * but executes reaction callback instead.
   * @param callback - computation callback to track
   * @param reaction - reaction to invoke on change
   */
  static reaction(callback: () => any, reaction:() => void): ComputedData {
    const computed = new ComputedData(this, 0);
    computed.callback = callback;
    computed.reaction = reaction;
    return computed;
  }

  /**
   * @xo.action decorator implementation - converts decorated method to action.
   * Action acts as transaction
   * @param target - target object
   * @param property - target property
   * @param descriptor - optional property descriptor
   */
  static action(
    target: object,
    property: Property,
    descriptor?: PropertyDescriptor,
  ): any {
    return {
      configurable: true,
      enumerable: true,
      value(...args: any[]) {
        if (!descriptor || !descriptor.value) return;
        Transaction.begin();
        const ret = descriptor.value.apply(this, args);
        Transaction.end();
        return ret;
      },
    };
  }

  /**
   * Subscribes to changes on target observable or computed property.
   * @param target - target object
   * @param property - target property
   * @param callback - change callback
   * @returns subscription id
   */
  static subscribe<T>(
    target: T,
    property: keyof T,
    callback: Callback,
  ): number {
    const observable = Observable.getProperty(target, property);
    if (!observable) return -1;
    return observable.addSubscription(callback);
  }

  /**
   * Subscribes to changes on target observable or computed property.
   * @param target - target object
   * @param property - target property
   * @param subId - subscription id
   */
  static unsubscribe<T>(target: T, property: keyof T, subId: number): void {
    const observable = Observable.getProperty(target, property);
    if (!observable) return;
    observable.removeSubscription(subId);
  }

  /**
   * Force notify change on on target observable or computed property.
   * @param target - target object
   * @param property - target property
   */
  static notify<T>(target: T, property: keyof T): void {
    const observable = Observable.getProperty(target, property);
    if (!observable) return;
    observable.staleValue();
  }

  /** Disposes observable - unsubscribes computed properties */
  static dispose(target: object) {
    const observables = target[Fields.Data] as ObservableData[];
    for (let i = 0; i < observables.length; i += 1) {
      const observable = observables[i];
      if (observable instanceof ComputedData) {
        observable.unsubscribe();
      }
    }
  }
}
