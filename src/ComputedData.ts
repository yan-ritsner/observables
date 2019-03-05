import { ObservableData } from './ObservableData';
import { ComputedStack } from './ComputedStack';
import { Fields } from './Fields';

/**
 * Computed property data store. Computed property can be observed as well.
 * Stores value that is computed based on some observable values and re-computes on changes.
 * `A. Computation`:
 * 1. Push computed to a global computed stack.
 * 2. Call getter function, that eventually will access some observables.
 *    when each observable is accessed it is attached to pending observables list
 *    of the computed on the top of the stack
 * 3. Pop computed, subscribe to all observables in the pending list that are not yet subscribed
 *    unsubscribe from the ones that are no longer observed.
 * `B. Re-computation`:
 *  On each observable change or at the end of the last transaction if there is one active :
 *  1. Mark recursively all dependent computed observers as stale, by incrementing stale counter.
 *     Stale counter ensures that all dependency observables if they are computed
 *     recalculated first.
 *  2. Go again recursively over the dependency tree(observable->computed)
 *     decrement stale counter on each entry, when counter reaches 0 ,
 *     this will mean that all dependencies are calculated
 *     recalculate computed itself.
 * `C. Reaction`
 *  Optionally computed can be used in reaction mode, if reaction callback specified.
 *  Reaction is computed and acts as computed tracking all observable dependencies,
 *  and can compute value based on dependencies.
 *  Unlike the computed it doesn't automatically re-compute value on change,
 *  but executes reaction callback instead, and computes value on demand.
 */
export class ComputedData extends ObservableData {
  /** Value getter callback */
  callback: () => any;
  /** List of dependency observables.*/
  observed: ObservableData[] = [];
  /** Pending dependency observables list */
  pendingObserved: ObservableData[] = [];
  /** Counts number of stale notification received from modified dependency observables. */
  staleCounter: number = 0;
  /** Indicates that at least one of the dependency observables changed - recompute needed */
  doRecompute: boolean;
  /** Optional reaction callback if specified will act as reaction */
  reaction: () => void;
  /** Stores last seen value revision if the field xRevision is set up on value.
    * Used by observable array to signal array contents change without actual value change. */
  revision: number;

  /**
   * @constructor
   * @param target - Owner object reference
   * @param property - Owner object property id
   */
  constructor(target: object, property: number) {
    super(target, property);
  }

  /**
   * Add observable to the list of pending dependencies.
   * @param observable - observable reference
   */
  observe(observable: ObservableData) {
    if (this === observable) return;
    if (observable.lastObserverId === this.id) return;
    observable.lastObserverId = this.id;
    this.pendingObserved.push(observable);
  }
  /**
   * Computes computed value
   * @param init - indicates first computation
   */
  compute(init: boolean = false) {
    ComputedStack.push(this);
    const value = this.callback.apply(this.target);
    ComputedStack.pop();
    this.subscribe();
    const revision = value != null ? value[Fields.Revision] : null;
    if (init) { // initial value
      this.value = value;
      // store revision if set up
      if (revision != null) {
        this.revision = revision;
      }
    } else { // value update
      this.updateValue(value);
      // if revision is set up check if it is changed from last time - if yes mark updated
      if (revision != null && !this.isUpdated && this.revision !== revision) {
        this.isUpdated = true;
        this.revision = revision;
      }
    }
  }
  /**
   * Recursively increments stale counter.
   */
  stale() {
    this.staleCounter += 1;
    this.staleObservers();
  }
  /**
   * Recursively decrements stale counter.
   * Recomputes compute value if stale counter reached 0
   * @param doRecompute - indicates that at least on dependency changes - recompute required.
   */
  recompute(doRecompute: boolean) {
    // Mark that this computed requires re-computation
    if (doRecompute && !this.doRecompute && this.staleCounter > 0) {
      this.doRecompute = true;
    }
    // Check that this computed was not re-computed before
    if (this.staleCounter > 0) {
      this.staleCounter -= 1;
      // Recompute when stale counter reaches 0
      if (this.staleCounter === 0 && this.doRecompute) {
        if (this.reaction != null) {
          this.reaction();
        }else {
          this.compute();
        }
        this.doRecompute = false;
      }
    }
    // Recursively update observers
    this.recomputeObservers();
    // Notify subscribers in case that computed updated
    this.notifySubscribers();
  }

  /** Checks if this computed is stale if yes recomputes */
  checkRecompute(): any {
    if (this.staleCounter > 0) {
      this.staleCounter = 0;
      this.compute();
      this.doRecompute = false;
    }
  }

  /**
   * Subscribes to the new pending observables and unsubscribes from unobserved
   */
  subscribe() {
    // Remove duplicates and mark observed data
    let index = 0;
    for (let i = 0; i < this.pendingObserved.length; i += 1) {
      const observable = this.pendingObserved[i];
      if (!observable.isObserved) {
        observable.lastObserverId = null;
        observable.isObserved = true;
        if (index !== i) this.pendingObserved[index] = observable;
        index += 1;
      }
    }
    if (index !== this.pendingObserved.length) {
      this.pendingObserved.length = index;
    }
    // Unsubscribe from unobserved
    for (let i = 0; i < this.observed.length; i += 1) {
      const observable = this.observed[i];
      observable.lastObserverId = null;
      if (observable.isObserved) {
        observable.isObserved = false;
      } else {
        observable.removeObserver(this.id);
      }
    }
    // Subscribe to the new observed
    for (let i = 0; i < this.pendingObserved.length; i += 1) {
      const observable = this.pendingObserved[i];
      if (observable.isObserved) {
        observable.isObserved = false;
        observable.addObserver(this);
      }
    }
    this.observed = this.pendingObserved;
    this.pendingObserved = [];
  }
  /**
   * Unsubscribes from all dependency observables.
   */
  unsubscribe() {
    for (let i = 0; i < this.observed.length; i += 1) {
      const observable = this.observed[i];
      observable.removeObserver(this.id);
    }
    this.observed = [];
  }
}
