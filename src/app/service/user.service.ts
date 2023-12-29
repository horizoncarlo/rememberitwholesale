import { Injectable, OnDestroy, inject } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, Subscription, distinctUntilChanged } from "rxjs";
import { UserAuth } from "../model/user-auth";
import { UserSettings } from "../model/user-settings";
import { Utility } from "../util/utility";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export class UserService implements OnDestroy {
  private _settings: UserSettings = new UserSettings(); // Start with a blank object, which we'll clone into from our actual results later
  private _backend: StorageService = inject(StorageService); // TODO Check the app and see which services we want public/private. Remember public is necessary for template HTML access and binding
  private _autosave_sub: Subscription;
  private _auth: UserAuth = new UserAuth();
  private _hasCheckedStorage: boolean = false;
  
  ready$: BehaviorSubject<boolean> = new BehaviorSubject(false); // Data is loaded and we're ready to start saving changes
  data$: BehaviorSubject<UserSettings> = new BehaviorSubject(this._settings);
  
  constructor(private router: Router) {
    this._autosave_sub = this.data$
      .pipe(
        distinctUntilChanged(
          (a, b) => JSON.stringify(a) === JSON.stringify(b)))
            .subscribe((newSettings: UserSettings) => {
      if (this.ready$.getValue()) {
        this._backend.submitSettings(newSettings).subscribe({
          next: res => console.log("Saved user settings", newSettings),
          error: err => console.error("Failed to save user settings", err)
        });
      }
    });
    
    // TODO Temporarily we might not have a settings file, but once we have user login done we for sure will (at a minimum for their login information)
    this._backend.getSettings().subscribe({
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
  
  ngOnDestroy(): void {
    if (this._autosave_sub) {
      this._autosave_sub.unsubscribe();
    }
  }
  
  getUser(): UserSettings {
    return this.data$.getValue();
  }
  
  getAuth(): UserAuth {
    // If this is our first attempt, try to restore an auth key from local storage
    if (!this._hasCheckedStorage) {
      this._hasCheckedStorage = true;
      this._auth.checkStoredLogin();
    }
    
    return this._auth;
  }
  
  performLogout(): void {
    this._auth.setLoggedOut();
    
    this.router.navigate(['/login']);
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