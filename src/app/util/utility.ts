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
  
  static isValidString(toCheck: string): boolean {
    return true;
  }
}
