export class Utility {
  loading: boolean = false;

  static showSuccess(message: string, header?: string): void {
    window.dispatchEvent(new CustomEvent('message-success', { detail: { summary: header, detail: message } }));
  }

  static showInfo(message: string, header?: string): void {
    window.dispatchEvent(new CustomEvent('message-info', { detail: { summary: header, detail: message } }));
  }

  static showWarn(message: string, header?: string): void {
    window.dispatchEvent(new CustomEvent('message-warn', { detail: { summary: header, detail: message } }));
  }

  static showError(message: string, header?: string): void {
    window.dispatchEvent(new CustomEvent('message-error', { detail: { summary: header, detail: message } }));
  }

  static plural(toCheck: Array<any>): string {
    return this.getLength(toCheck) === 1 ? '' : 's';
  }
  
  static pluralNum(count: number): string {
    return count === 1 ? '' : 's';
  }

  static isString(str: any): boolean {
    return !!(str && typeof str === 'string');
  }

  static isValidString(str: any): boolean {
    return !!(str && typeof str === 'string' && str.trim().length > 0);
  }

  static getLength(arrOrStr: Array<any> | string): number {
    if (this.isArray(arrOrStr) || this.isString(arrOrStr)) {
      return arrOrStr.length;
    }
    return 0;
  }

  static isObject(obj: any): boolean {
    return !!(obj && typeof obj === 'object');
  }

  static isArray(arr: any): boolean {
    return !!(arr && Array.isArray(arr));
  }

  static hasItems(arrOrObj: any): boolean {
    return !!(
      (this.isArray(arrOrObj) && arrOrObj.length > 0) ||
      (this.isObject(arrOrObj) && Object.keys(arrOrObj).length > 0)
    );
  }
}
