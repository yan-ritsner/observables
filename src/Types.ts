import { ObservableArray } from './ObservableArray';

/** Observable property identifier */
export type Property = string | number | symbol;

/** Observable subscription callback */
export type Callback<T = any> = (value: T, prevValue: T) => void;

/** Observable Array change type */
export enum ArrayChangeType{
  /** Entry was updates */
  Update,
  /** Entry addedd/removed */
  Splice,
  /** Entire array replace */
  Replace,
}

/** Array update arguments */
export interface IArrayUpdate<T = any> {
  type: ArrayChangeType.Update;
  object: ObservableArray<T>;
  index: number;
  newValue: T;
  oldValue: T;
}

/** Array splice arguments */
export interface IArraySplice<T = any> {
  type: ArrayChangeType.Splice;
  object: ObservableArray<T>;
  index: number;
  added: T[] | null;
  removed: T[] | null;
}

/** Array replace arguments */
export interface IArrayReplace<T = any> {
  type: ArrayChangeType.Replace;
  object: ObservableArray<T>;
  newValue: T[];
  oldValue: T[];
}

/** Array arguments */
export type ArrayChange<T = any> = IArrayUpdate<T> | IArraySplice<T> | IArrayReplace<T>;

/** Array change callback */
export type ArrayChangeCallback<T = any> = (changeData: ArrayChange<T>) => void;
