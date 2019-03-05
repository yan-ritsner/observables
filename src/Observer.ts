import { Helpers } from './Helpers';
import { ComputedData } from './ComputedData';
import { Fields } from './Fields';
import { Observable } from './Observable';

/**
 * Static observer component decorator implementation.
 */
export class Observer {

  /**
   * @xo.observer decorator implementation.
   * Overrides component renderer function the way that it is aromatically re-renders on
   * changes of any observables accessed inside original render.
   * @param constructor - component class constructor function
   */
  static observer(constructor: Function): any {
    const proto = constructor.prototype;
    const render = proto.render;
    const componentWillUnmount = proto.componentWillUnmount;

    // Overrides component render function
    // Wraps original render into computed value - calls force refresh on change
    proto.render = function () {
      let computedRender = this[Fields.ComputedRender] as ComputedData;
      if (!computedRender) {
        computedRender = Observable.reaction(render.bind(this), () => this.forceUpdate());
        this[Fields.ComputedRender] = computedRender;
      }
      computedRender.compute(true);
      return computedRender.value;
    };

    // Overrides component unmount function - disposes computed wrapper
    proto.componentWillUnmount = function () {
      const computedRender = this[Fields.ComputedRender] as ComputedData;
      if (computedRender) computedRender.unsubscribe();
      if (componentWillUnmount) componentWillUnmount.call(this);
      this[Fields.ComputedRender] = null;
    };

    // Overrides component should update function - uses props shallow equality compare
    proto.shouldComponentUpdate = function (nextProps: any, nextState: any) {
      if (this.state !== nextState) return true;
      const update = !Helpers.shallowEqual(this.props, nextProps);
      return update;
    };
  }
}
