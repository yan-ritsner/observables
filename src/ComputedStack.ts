import { ComputedData } from './ComputedData';

/** Computed observables computation stack */
export class ComputedStack {
  /** Currently computing computed data stack */
  static data: ComputedData[] = [];
  /** Peeks computed from the stack - without removal */
  static peek(): ComputedData | null {
    const length = ComputedStack.data.length;
    if (length === 0) return null;
    return ComputedStack.data[length - 1];
  }
  /** Pushes computed to the stack */
  static push(computed: ComputedData): void {
    ComputedStack.data.push(computed);
  }
  /** Pops - removes computes from the stack */
  static pop(): void {
    ComputedStack.data.pop();
  }
}
