
export class UserSettings {
  // TODO Wrap user settings in a signal once migrated to Ang 17 so that any change will auto-persist to the backend, instead of RxJS
  forceDial: boolean = false;
  maximizeDialogs: boolean = false;
  paginatorTable: boolean = true;
  paginatorRows: number = 50;
  showFilters: boolean = false;
  showReminders: boolean = false;
  overdueLimitDays: number = 2;
  limitDate: number = -1;
  tableSortColumn: string = 'updated';
  tableSortOrder: number = -1;
  loginCount: number = 0; // Keep track of our login counts, which we can use for hiding tutorial info, etc.
  
  constructor(options?: {
      forceDial?: boolean,
      maximizeDialogs?: boolean,
      paginatorTable?: boolean,
      paginatorRows?: number,
      scrollTable?: boolean,
      showFilters?: boolean,
      showReminders?: boolean,
      overdueLimitDays?: number,
      limitDate?: number,
      tableSortColumn?: string,
      tableSortOrder?: number,
      loginCount?: number
    }) {
    
    if (options) {
      this.forceDial = this._assignSetting(options.forceDial, 'boolean', false);
      this.maximizeDialogs = this._assignSetting(options.maximizeDialogs, 'boolean', false);
      this.paginatorTable = this._assignSetting(options.paginatorTable, 'boolean', true);
      this.paginatorRows = this._assignSetting(options.paginatorRows, 'number', 50);
      this.showFilters = this._assignSetting(options.showFilters, 'boolean', false);
      this.showReminders = this._assignSetting(options.showReminders, 'boolean', false);
      this.overdueLimitDays = this._assignSetting(options.overdueLimitDays, 'number', 2);
      this.limitDate = this._assignSetting(options.limitDate, 'number', -1);
      this.tableSortColumn = this._assignSetting(options.tableSortColumn, 'string', 'updated');
      this.tableSortOrder = this._assignSetting(options.tableSortOrder, 'number', -1);
      this.loginCount = this._assignSetting(options.loginCount, 'number', 0);
    }
  }
  
  static cloneFrom(source: UserSettings): UserSettings {
    return new UserSettings({ ...source });
  }
  
  private _assignSetting(val: any, type: string, defaultVal: any): any {
    // If we're the proper type, return our value, otherwise default
    if (typeof val === type) {
      return val;
    }
    return defaultVal;
  }
}
