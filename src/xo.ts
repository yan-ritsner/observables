import { Observable } from './Observable';
import { Observer } from './Observer';

/**
 * Helper class for decorators namespace.
 * for example @xo.observable
 * */
export const xo = {
  observable: Observable.observable,
  computed: Observable.computed,
  reaction: Observable.reaction,
  action: Observable.action,
  subscribe: Observable.subscribe,
  unsubscribe: Observable.unsubscribe,
  notify: Observable.notify,
  dispose: Observable.dispose,
  observer: Observer.observer,
};
