import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { UserAuth } from "../model/user-auth";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _auth: UserAuth = new UserAuth();
  
  constructor(private router: Router) { }
  
  getAuth(): UserAuth {
    // If this is our first attempt, try to restore an auth key from local storage and navigate to the main app
    if (!this._auth.hasCheckedStorage) {
      this._auth.checkStoredLogin().then(res => {
        // Stay on our public page instead of forcing to the app
        if (!this.router.url || !this.router.url.startsWith('/public')) {
          this.router.navigate(['/']);
        }
      }).catch(ignored => {
        // Ignore any failure to retrieve a stored login
      });
    }

    return this._auth;
  }
}