
export class UserSettings {
  // TODO Wrap user settings in a signal once migrated to Ang 17 so that any change will auto-persist to the backend, instead of RxJS
  forceDial: boolean = false;
  paginatorTable: boolean = true;
  paginatorRows: number = 50;
  showFilters: boolean = false;
  showReminders: boolean = false;
  overdueLimitDays: number = 2;
  limitDate: number = -1;
  
  constructor(options?: {
      forceDial?: boolean,
      paginatorTable?: boolean,
      paginatorRows?: number,
      scrollTable?: boolean,
      showFilters?: boolean,
      showReminders?: boolean,
      overdueLimitDays?: number,
      limitDate?: number
    }) {
    
    if (options) {
      this.forceDial = typeof options.forceDial !== 'undefined' ? options.forceDial : false;
      this.paginatorTable = typeof options.paginatorTable !== 'undefined' ? options.paginatorTable : true;
      this.paginatorRows = typeof options.paginatorRows !== 'undefined' ? options.paginatorRows : 50;
      this.showFilters = typeof options.showFilters !== 'undefined' ? options.showFilters : false;
      this.showReminders = typeof options.showReminders !== 'undefined' ? options.showReminders : false;
      this.overdueLimitDays = typeof options.overdueLimitDays !== 'undefined' ? options.overdueLimitDays : 2;
      this.limitDate = typeof options.limitDate !== 'undefined' ? options.limitDate : -1;
    }
  }
  
  static cloneFrom(source: UserSettings): UserSettings {
    return new UserSettings({ ...source });
  }
  
  prepareForSave(): void {
    // TODO Clean up user settings before save
  }
  
  isValid(): boolean {
    // TODO isValid needed for user settings?: return Utility.isValidString(this.username);
    return true;
  }
}
