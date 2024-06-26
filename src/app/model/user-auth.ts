import { inject } from "@angular/core";
import { StorageService } from "../service/storage.service";
import { Utility } from "../util/utility";

export class UserAuth {
  username: string | null = null;
  authToken: string | null = null;
  saveLogin: boolean = false;
  isLoggedIn: boolean = false;
  hasCheckedStorage: boolean = false;
  processingCheckedStorage: boolean = false;
  isDemoAccount: boolean = false;
  
  async checkStoredLogin(): Promise<any> {
    this.hasCheckedStorage = true;
    
    const possibleUsername = Utility.getLocalUsername();
    const possiblePassword = Utility.getLocalStorageItem(Utility.LS_AUTH_PASSWORD);
    if (Utility.isValidString(possibleUsername) &&
        Utility.isValidString(possiblePassword)) {
      if (!this.processingCheckedStorage) {
        this.processingCheckedStorage = true;
        const ourPromise = new Promise((resolve, reject) => {
          this.username = possibleUsername;
          
          inject(StorageService).submitLogin(this.username as string, possiblePassword as string).subscribe({
            next: res => {
              if (res && res.authToken) {
                console.log("Logged in with saved password");
                
                this.setLoggedIn(res.authToken, possiblePassword as string);
                this.isDemoAccount = res.isDemoAccount ? true : false;
                return resolve(res.authToken);
              }
              return reject('No auth token');
            },
            error: err => {
              console.error("Failed to use saved password for login", err);
              this.setLoggedOut();
              return reject(err);
            }
          });
        }).finally(() => this.processingCheckedStorage = false);
        
        return await ourPromise;
      }
    }
    return await new Promise((resolve, reject) => reject('No saved login'));
  }
  
  setLoggedIn(authToken: string, passwordToSave?: string): void {
    this.authToken = authToken;
    this.isLoggedIn = true;
    this.saveLogin = passwordToSave ? true : false;
    
    if (passwordToSave) {
      Utility.setLocalStorageItem(Utility.LS_AUTH_PASSWORD, passwordToSave);
      if (Utility.isValidString(this.username)) {
        Utility.setLocalStorageItem(Utility.LS_AUTH_USERNAME, this.username as string);
      }
    }
    else {
      Utility.removeLocalStorageItem(Utility.LS_AUTH_USERNAME);
      Utility.removeLocalStorageItem(Utility.LS_AUTH_PASSWORD);
    }
  }
  
  setLoggedOut(): void {
    this.username = null;
    this.authToken = null;
    this.hasCheckedStorage = false;
    this.processingCheckedStorage = false;
    this.isLoggedIn = false;
    this.saveLogin = false;
    this.isDemoAccount = false;
    Utility.removeLocalStorageItem(Utility.LS_AUTH_USERNAME);
    Utility.removeLocalStorageItem(Utility.LS_AUTH_PASSWORD);
  }
}