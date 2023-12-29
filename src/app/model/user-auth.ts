import { Utility } from "../util/utility";

export class UserAuth {
  username: string | null = null;
  authToken: string | null = null;
  isLoggedIn: boolean = false;
  
  checkStoredLogin(): void {
    // TODO Should probably add a new storage service call to submit an existing authToken and get a fresh one, so that we sometimes nullify old tokens. Trying to avoid the tedium of token expiry and auto-refreshing
    const possibleAuthToken = Utility.getLocalStorageItem(Utility.LS_AUTH_TOKEN);
    const possibleUsername = Utility.getLocalStorageItem(Utility.LS_AUTH_USERNAME);
    if (Utility.isValidString(possibleAuthToken) &&
        Utility.isValidString(possibleUsername)) {
      console.log("Logged in with saved authToken=" + possibleAuthToken);
      this.username = possibleUsername;
      this.setLoggedIn(possibleAuthToken as string, true);
    }
  }
  
  setLoggedIn(authToken: string, saveLogin?: boolean): void {
    this.authToken = authToken;
    this.isLoggedIn = true;
    
    if (saveLogin) {
      Utility.setLocalStorageItem(Utility.LS_AUTH_TOKEN, authToken);
      if (Utility.isValidString(this.username)) {
        Utility.setLocalStorageItem(Utility.LS_AUTH_USERNAME, this.username as string);
      }
    }
    else {
      Utility.removeLocalStorageItem(Utility.LS_AUTH_TOKEN);
      Utility.removeLocalStorageItem(Utility.LS_AUTH_USERNAME);
    }
  }
  
  setLoggedOut(): void {
    this.username = null;
    this.authToken = null;
    this.isLoggedIn = false;
    Utility.removeLocalStorageItem(Utility.LS_AUTH_TOKEN);
    Utility.removeLocalStorageItem(Utility.LS_AUTH_USERNAME);
  }
}