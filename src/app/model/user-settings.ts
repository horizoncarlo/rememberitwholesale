
export class UserSettings {
  // TODO Wrap user settings in a signal once migrated to Ang 17 so that any change will auto-persist to the backend, instead of RxJS
  // TODO Username concept for logging in: username: string
  useDial: boolean = false;
  paginatorTable: boolean = true;
  paginatorRows: number = 50;
  scrollableTable: boolean = true;
  showFilters: boolean = false;
  showReminders: boolean = false;
  overdueLimitDays: number = 2;
  
  constructor(options?: {
      useDial?: boolean,
      paginatorTable?: boolean,
      paginatorRows?: number,
      scrollTable?: boolean,
      showFilters?: boolean,
      showReminders?: boolean,
      overdueLimitDays?: number
    }) {
    
    if (options) {
      this.useDial = options.useDial || false;
      this.paginatorTable = options.paginatorTable || true;
      this.paginatorRows = options.paginatorRows || 50;
      this.scrollableTable = options.scrollTable || true;
      this.showFilters = options.showFilters || false;
      this.showReminders = options.showReminders || false;
      this.overdueLimitDays = options.overdueLimitDays || 2;
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
