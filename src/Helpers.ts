/** Global Helper function */
export class Helpers {
  /** returns true if references are actually to the same instance */
  public static is(x: any, y: any) {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y;
    }
    return x !== x && y !== y;
  }

  /** Check if two objects are shallow equal */
  public static shallowEqual(objA: any, objB: any) {
    if (Helpers.is(objA, objB)) return true;
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
      return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i += 1) {
      if (!Object.hasOwnProperty.call(objB, keysA[i]) ||
        !Helpers.is(objA[keysA[i]], objB[keysA[i]])) {
        return false;
      }
    }
    return true;
  }
}
