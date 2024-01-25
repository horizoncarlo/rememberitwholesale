import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, Subscription, distinctUntilChanged } from "rxjs";
import { UserSettings } from "../model/user-settings";
import { Utility } from "../util/utility";
import { AuthService } from "./auth.service";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export class UserService implements OnDestroy {
  private _settings: UserSettings = new UserSettings(); // Start with a blank object, which we'll clone into from our actual results later
  private _autosave_sub: Subscription;
  
  ready$: BehaviorSubject<boolean> = new BehaviorSubject(false); // Data is loaded and we're ready to start saving changes
  data$: BehaviorSubject<UserSettings> = new BehaviorSubject(this._settings);
  
  constructor(private authService: AuthService, private storageService: StorageService) {
    this._autosave_sub = this.data$
      .pipe(
        distinctUntilChanged(
          (a, b) => JSON.stringify(a) === JSON.stringify(b)))
            .subscribe((newSettings: UserSettings) => {
      if (this.ready$.getValue()) {
        this.storageService.submitSettings(newSettings).subscribe({
          next: res => {
            console.log("Saved user settings", newSettings);
            this._settings = newSettings;
          },
          error: err => console.error("Failed to save user settings", err)
        });
      }
    });
  }
  
  setupSettings(): void {
    if (this.authService.getAuth().isLoggedIn) {
      this.storageService.getSettings().subscribe({
        next: res => {
          this._settings = UserSettings.cloneFrom(res);
          this.data$.next(this._settings);
          this.ready$.next(true);
          
          console.log("Loaded user settings", this.getUser());
        },
        error: err => {
          Utility.showError('Failed to load your user settings');
          console.error(err);
        },
      });
    }
  }
  
  ngOnDestroy(): void {
    if (this._autosave_sub) {
      this._autosave_sub.unsubscribe();
    }
  }
  
  getUser(): UserSettings {
    return this.data$.getValue();
  }
  
  /**
   * Set a property on our user object, which will automatically persist
   * Usage example: `this.userService.setUserProp('paginatorTable', false);`
   */
  setUserProp = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const _user: UserSettings = Object.assign({}, this._settings);
    _user[key] = value;
    this.data$.next(_user);
  };
}