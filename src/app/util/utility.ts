import { formatDistanceToNow } from "date-fns";
import isMobile from "is-mobile";
import { Thing } from "../model/thing";

export class Utility {
  static LS_AUTH_USERNAME: string = 'authUsername';
  static LS_AUTH_PASSWORD: string = 'authPassword';
  static numberFormatter: Intl.NumberFormat = new Intl.NumberFormat();
  // Store our scroll positions to revert to after a delete/add/etc.
  static windowScrollPos = 0;
  static tableScrollPos = 0;
  
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
  
  static clearReminderMessages(): void {
    window.dispatchEvent(new CustomEvent('message-clear-reminders'));
  }
  
  static showReminderComplete(toMark: Thing, confirmCallback: Function, postponeCallback: Function): void {
    this._dispatchGenericShow('message-info', {
      message: toMark.name + ' (' + toMark.templateType + ') is due',
      header: 'Reminder NOW',
      life: 10*1000,
      confirmCallback: confirmCallback,
      postponeCallback: postponeCallback,
      thingId: toMark.id
    });
  }
  
  static showReminderOverdue(toMark: Thing, confirmCallback: Function, postponeCallback: Function): void {
    this._dispatchGenericShow('message-success', {
      message: toMark.name + ' (' + toMark.templateType + ') is overdue ' + (toMark.time ? formatDistanceToNow(toMark.time, { addSuffix: true }) : ''),
      header: 'Reminder Overdue',
      life: 8*1000,
      confirmCallback: confirmCallback,
      postponeCallback: postponeCallback,
      thingId: toMark.id
    });
  }
  
  static showPublicLinkToast(forThing: Thing): void {
    this._dispatchGenericShow('message-info', {
      message: '',
      header: forThing.name + ' - public link ready',
      life: 6*1000,
      forThing: forThing
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
  
  static saveTableScrollPos(): void {
    this._handleTableScrollPos(true);
  }
  
  static loadTableScrollPos(): void {
    this._handleTableScrollPos();
  }
  
  private static _handleTableScrollPos(shouldSaveToVar?: boolean) {
    if (shouldSaveToVar) {
      this.windowScrollPos = document.documentElement.scrollTop;
    }
    else {
      document.documentElement.scrollTop = this.windowScrollPos;
    }
    
    const tableEles = document.getElementsByClassName('p-datatable-wrapper');
    if (this.hasItems(tableEles)) {
      if (shouldSaveToVar) {
        this.tableScrollPos = tableEles[0].scrollTop;
      }
      else {
        tableEles[0].scrollTop = this.tableScrollPos;
      }
    }
  }
  
  static getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  static getRandomFloat(min: number, max: number): number {
    return parseFloat(((Math.random() * (max - min)) + min).toFixed(3));
  }
  
  static getLocalStorageItem(key: string): string | null {
    return window.localStorage.getItem(key);
  }
  
  static setLocalStorageItem(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }
  
  static removeLocalStorageItem(key: string): void {
    window.localStorage.removeItem(key);
  }
  
  static getLocalUsername(): string | null {
    return this.getLocalStorageItem(this.LS_AUTH_USERNAME);
  }
  
  static commonDialogShow(): void {
    history.pushState({
      modalDialog: true,
      description: 'Extra state step to allow browser back button to close the dialog'
    }, '');
  }
  
  static commonDialogDestory(): void {
    // Remove our fake history element when the dialog is closed
    if (window.history &&
        window.history.state &&
        window.history.state.modalDialog) {
      history.back();
    }
  }
  
  static isImage(fileType: string) {
    const imageType = /^image\//;
    return imageType.test(fileType);
  }
  
  /**
   * Parse any URLs in our text and wrap them in HTML anchor tags and return the result
   * Note this only counts http: and https: as links, not www. prefixes, so it's somewhat limited
   * Buy hey, for a one liner it's not too shabby
   */
  static anchorUrlsInText(text: string): string {
    const urlRegex = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, url => {
      return '<a href="' + url + '" target="_blank">' + url + '</a>';
    });
  }
  
  static copyToClipboard(text: string): Promise<void> {
    /* TODO Given that the app currently isn't in an HTTPS environment, both of these approaches will fail.
     *      As a temporary workaround the "Insecure origins treated as secure" flag has been set in Chrome for the browsers I use
     *      Absolutely hacky and short term, so we should get HTTPS going properly
     */
    
    // Strip HTML or Markdown first, so for example if we want to copy a link it just grabs the link and not an anchor
    const strippedDiv = document.createElement('div');
    strippedDiv.innerHTML = text;
    const strippedText = strippedDiv.textContent || text;
    
    // Use the proper modern approach if necessary
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(strippedText);
    }
    
    // But in case we're not in a secure context or haven't been granted permission or a multitude of other reasons, fallback to the old deprecated approach
    return new Promise((resolve, reject) => {
      try{
        const tempInput = document.createElement('textarea');
        tempInput.hidden = true;
        tempInput.value = strippedText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        resolve();
      }catch (err) {
        console.error("Error copying to clipboard", err);
        return reject(err);
      }
    });
  }
}
