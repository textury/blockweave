import { BigNumber } from 'bignumber.js';

/**
 * Utility to convert AR to Winston and vice versa.
 */
export default class Ar {
  /**
   * Convert Winston to AR.
   * @param  {string} winstonString
   * @param  {boolean} formatted - Default is false
   * @param  {number} decimals - Default is 12
   * @param  {boolean} trim - Default is true
   * @returns {string} - The AR as string
   */
  public winstonToAr(winstonString: string, { formatted = false, decimals = 12, trim = true } = {}): string {
    const n = this.stringToBigNum(winstonString, decimals).shiftedBy(-12);
    return formatted ? n.toFormat(decimals) : n.toFixed(decimals);
  }

  public arToWinston(arString: string, { formatted = false } = {}) {
    const n = this.stringToBigNum(arString).shiftedBy(12);
    return formatted ? n.toFormat() : n.toFixed(0);
  }

  public compare(winstonStringA: string, winstonStringB: string): number {
    const a = this.stringToBigNum(winstonStringA);
    const b = this.stringToBigNum(winstonStringB);

    return a.comparedTo(b);
  }

  public isEqual(winstonStringA: string, winstonStringB: string): boolean {
    return this.compare(winstonStringA, winstonStringB) === 0;
  }

  public isLessThan(winstonStringA: string, winstonStringB: string): boolean {
    const a = this.stringToBigNum(winstonStringA);
    const b = this.stringToBigNum(winstonStringB);

    return a.isLessThan(b);
  }

  public isGreaterThan(winstonStringA: string, winstonStringB: string): boolean {
    const a = this.stringToBigNum(winstonStringA);
    const b = this.stringToBigNum(winstonStringB);

    return a.isGreaterThan(b);
  }

  public add(winstonStringA: string, winstonStringB: string): string {
    const a = this.stringToBigNum(winstonStringA);
    const b = this.stringToBigNum(winstonStringB);

    return a.plus(winstonStringB).toFixed(0);
  }

  public sub(winstonStringA: string, winstonStringB: string): string {
    const a = this.stringToBigNum(winstonStringA);
    const b = this.stringToBigNum(winstonStringB);
    return a.minus(winstonStringB).toFixed(0);
  }

  private stringToBigNum(stringValue: string, decimalPlaces: number = 12): BigNumber {
    const instance = BigNumber.clone({ DECIMAL_PLACES: decimalPlaces });
    return new instance(stringValue);
  }
}
