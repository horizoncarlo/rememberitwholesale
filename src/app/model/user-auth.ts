import { inject } from "@angular/core";
import { StorageService } from "../service/storage.service";
import { Utility } from "../util/utility";

export class UserAuth {
  username: string | null = null;
  authToken: string | null = null;
  isLoggedIn: boolean = false;
  hasCheckedStorage: boolean = false;
  processingCheckedStorage: boolean = false;
  
  async checkStoredLogin(): Promise<any> {
    this.hasCheckedStorage = true;
    
    // TODO QUIDEL PRIORITY - All this is extremely overdone. We can just return and store their hashed password as it's sha256, and do a login automatically if present, and don't locally store the auth token
    const possibleSavedToken = Utility.getLocalStorageItem(Utility.LS_SAVED_TOKEN);
    const possibleUsername = Utility.getLocalStorageItem(Utility.LS_AUTH_USERNAME);
    if (Utility.isValidString(possibleSavedToken) &&
        Utility.isValidString(possibleUsername)) {
        this.processingCheckedStorage = true;
        const ourPromise = new Promise((resolve, reject) => {
          this.username = possibleUsername;
          
          inject(StorageService).submitSavedToken(this.username as string, possibleSavedToken as string).subscribe({
            next: res => {
              if (res && res.authToken) {
                console.log("Logged in with savedToken=" + res.authToken);
                
                this.setLoggedIn(res.authToken, res.savedToken);
                return resolve(res.savedToken);
              }
              return reject('No auth token');
            },
            error: err => {
              console.error("Failed to use savedToken for login", err);
              return reject(err);
            }
          });
        }).finally(() => this.processingCheckedStorage = false);
      
      await ourPromise;
    }
  }
  
  setLoggedIn(authToken: string, savedToken?: string): void {
    this.authToken = authToken;
    this.isLoggedIn = true;
    
    if (savedToken) {
      Utility.setLocalStorageItem(Utility.LS_SAVED_TOKEN, savedToken);
      if (Utility.isValidString(this.username)) {
        Utility.setLocalStorageItem(Utility.LS_AUTH_USERNAME, this.username as string);
      }
    }
    else {
      Utility.removeLocalStorageItem(Utility.LS_SAVED_TOKEN);
      Utility.removeLocalStorageItem(Utility.LS_AUTH_USERNAME);
    }
  }
  
  setLoggedOut(): void {
    this.username = null;
    this.authToken = null;
    this.hasCheckedStorage = false;
    this.isLoggedIn = false;
    Utility.removeLocalStorageItem(Utility.LS_SAVED_TOKEN);
    Utility.removeLocalStorageItem(Utility.LS_AUTH_USERNAME);
  }
}