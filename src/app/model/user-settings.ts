
export class UserSettings {
  // TODO Wrap user settings in a signal once migrated to Ang 17 so that any change will auto-persist to the backend, instead of RxJS
  // TODO Will need a user profile page/dialog, with certain settings exposed that can't be dynamically set from the app (such as forcing the dial)
  // TODO Username concept for logging in: username: string
  forceDial: boolean = false;
  paginatorTable: boolean = true;
  paginatorRows: number = 50;
  scrollableTable: boolean = true;
  showFilters: boolean = false;
  showReminders: boolean = false;
  overdueLimitDays: number = 2;
  limitDate: number = -1;
  isLoggedIn: boolean = false; // TODO PRIORITY QUIDEL
  
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
      this.forceDial = options.forceDial || false;
      this.paginatorTable = options.paginatorTable || true;
      this.paginatorRows = options.paginatorRows || 50;
      this.scrollableTable = options.scrollTable || true;
      this.showFilters = options.showFilters || false;
      this.showReminders = options.showReminders || false;
      this.overdueLimitDays = options.overdueLimitDays || 2;
      this.limitDate = options.limitDate || -1;
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
