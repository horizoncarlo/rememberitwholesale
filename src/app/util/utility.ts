import { formatDistanceToNow } from "date-fns";
import isMobile from "is-mobile";
import { Thing } from "../model/thing";

export class Utility {
  static numberFormatter: Intl.NumberFormat = new Intl.NumberFormat();
  
  static showSuccess(message: string, header?: string, sticky?: boolean): void {
    this._dispatchGenericShow('message-success', { message: message, header: header, sticky: sticky });
  }

  static showInfo(message: string, header?: string, sticky?: boolean): void {
    this._dispatchGenericShow('message-info', { message: message, header: header, sticky: sticky });
  }

  static showWarn(message: string, header?: string, sticky?: boolean): void {
    this._dispatchGenericShow('message-warn', { message: message, header: header, sticky: sticky });
  }

  static showError(message: string, header?: string, sticky?: boolean): void {
    this._dispatchGenericShow('message-error', { message: message, header: header, sticky: sticky });
  }
  
  static clearMessages(): void {
    window.dispatchEvent(new CustomEvent('message-clear-all'));
  }
  
  static showReminderComplete(toMark: Thing, confirmCallback: Function): void {
    this._dispatchGenericShow('message-info', {
      message: toMark.name + ' (' + toMark.templateType + ') is due',
      header: 'Reminder NOW',
      sticky: true,
      confirmCallback: confirmCallback,
      thingId: toMark.id
    });
  }
  
  static showReminderOverdue(toMark: Thing, confirmCallback: Function): void {
    this._dispatchGenericShow('message-success', {
      message: toMark.name + ' (' + toMark.templateType + ') is overdue ' + (toMark.time ? formatDistanceToNow(toMark.time, { addSuffix: true }) : ''),
      header: 'Reminder Overdue',
      sticky: true,
      confirmCallback: confirmCallback,
      thingId: toMark.id
    });
  }
  
  static showSuccessSticky(message: string, header?: string) {
    this.showSuccess(message, header, true);
  }
  
  static showInfoSticky(message: string, header?: string) {
    this.showInfo(message, header, true);
  }
  
  static showWarnSticky(message: string, header?: string) {
    this.showWarn(message, header, true);
  }
  
  static showErrorSticky(message: string, header?: string) {
    this.showError(message, header, true);
  }
  
  private static _dispatchGenericShow(type: string, options: any): void {
    // Slightly rename our incoming variables to match what the component expects
    window.dispatchEvent(new CustomEvent(type, { detail: { summary: options.header, detail: options.message, ...options } }));
  }
  
  static fireWindowResize() {
    window.dispatchEvent(new Event('resize'));
  }

  static plural(toCheck: Array<any>): string {
    return this.getLength(toCheck) === 1 ? '' : 's';
  }
  
  static pluralNum(count: number): string {
    return count === 1 ? '' : 's';
  }
  
  static isMobileSize() : boolean {
    if (isMobile()) {
      return true;
    }
    if (document && document.body &&
        document.body.getBoundingClientRect() &&
        document.body.getBoundingClientRect().width < Utility.getCSSVarNum('mobile-breakpoint')) {
          return true;
    }
    return false;
  }

  static isString(str: any): boolean {
    return !!(str && typeof str === 'string');
  }
  
  static isNumber(toCheck: number | null | undefined): boolean {
    return !!(typeof toCheck === 'number' && !isNaN(toCheck));
  }
  
  static isValidString(str: any): boolean {
    return !!(str && typeof str === 'string' && str.trim().length > 0);
  }
  
  static isDefined(toCheck: any): boolean {
    return typeof toCheck !== 'undefined';
  }
  
  static isDefinedNotNull(toCheck: any): boolean {
    return this.isDefined(toCheck) && toCheck !== null;
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
  
  static formatNumber(toFormat: number): string {
    return this.numberFormatter.format(toFormat);
  }
  
  static debounceTimer: any = null;
  static debounce(func: Function, delay: number = 400): void { 
    const args = arguments;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => func.apply(args), delay);
  }
  
  static getCSSVarNum(name: string): number {
    const returnedVar = this.getCSSVar(name);
    if (returnedVar) {
      try{
        const toReturn = parseInt(returnedVar);
        if (this.isNumber(toReturn)) {
          return toReturn;
        }
      }catch(ignore) { }
    }
    return 0;
  }
  
  static getCSSVar(name: string): any {
    if (this.isValidString(name)) {
      if (name.indexOf('--') !== 0) {
        name = '--' + name;
      }
      
      const computed = getComputedStyle(document.body);
      if (computed) {
        return computed.getPropertyValue(name);
      }
    }
    return null;
  }
}
