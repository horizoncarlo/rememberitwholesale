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
    // If this is our first attempt, try to restore an auth key from local storage
    if (!this._auth.hasCheckedStorage) {
      this._auth.checkStoredLogin().then(() => {
        this.router.navigate(['/']);
      });
    }

    return this._auth;
  }
  
  performLogout(): void {
    this._auth.setLoggedOut();
    
    // Navigate and refresh the page
    this.router.navigate(['/login']).finally(() => location.reload());
  }
}