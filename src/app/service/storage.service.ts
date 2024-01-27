import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Template } from '../model/template';
import { TemplateFavorite } from '../model/template-favorite';
import { Thing } from '../model/thing';
import { UserAuth } from '../model/user-auth';
import { UserSettings } from '../model/user-settings';
import { AuthService } from './auth.service';

// Determine our base URL for all Node interactions
const BASE_URL = environment.baseUrl || 'http://localhost:4333/';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  defaultHeaders = { headers: { 'Content-Type': 'application/json' }};
  storedLimitDate: number | undefined;
  
  constructor(private http: HttpClient, private router: Router, private authService: AuthService) { }
  
  getAuthToken(): string {
    let toReturn = '?token=';
    if (this.authService.getAuth().isLoggedIn) {
      toReturn += this.authService.getAuth().authToken as string;
    }
    return toReturn;
  }
  
  performLogout(): void {
    const userObj = this.authService.getAuth();
    
    // If we're a demo account end our demo on logout
    // Note we wait to do afterLogout because we don't want to clear our variables and redirect until our call is complete
    if (userObj.isDemoAccount) {
      this.endDemo(userObj.username as string).subscribe().add(() => {
        this.afterLogout(userObj);
      });
    }
    else {
      this.afterLogout(userObj);
    }
  }
  
  afterLogout(userObj: UserAuth): void {
    userObj.setLoggedOut();
    
    // Navigate and refresh the page
    this.router.navigate(['/login']).finally(() => location.reload());
  }
  
  makeUrl(endpoint: string): string {
    return BASE_URL + endpoint + this.getAuthToken();
  }
  
  getAllThings(limitDate?: number): Observable<any> {
    // If we don't have a limitDate defined, fallback to our stored version, or default to -1 (all time)
    if (typeof limitDate !== 'number') {
      if (typeof this.storedLimitDate === 'number') {
        limitDate = this.storedLimitDate;
      }
      else {
        limitDate = -1;
      }
    }
    
    return this.http.get(this.makeUrl('things') + '&limit=' + limitDate);
  }
  
  deleteThings(toDeleteIds: string[]): Observable<any> {
    return this.http.post(this.makeUrl('things/delete'), {
      deleteIds: toDeleteIds
    }, this.defaultHeaders);
  }
  
  submitThing(body: Thing): Observable<any> {
    return this.http.post(this.makeUrl('things'), body, this.defaultHeaders);
  }
  
  getAllTemplates(): Observable<any> {
    return this.http.get(this.makeUrl('templates'));
  }
  
  deleteTemplate(nameToDelete: string, deleteThingsToo?: boolean): Observable<any> {
    return this.http.post(this.makeUrl('templates/delete'), {
      templateNameToDelete: nameToDelete,
      deleteThingsToo: deleteThingsToo || false
    }, this.defaultHeaders);
  }
  
  submitTemplate(body: Template): Observable<any> {
    return this.http.post(this.makeUrl('templates'), body, this.defaultHeaders);
  }
  
  getFavoriteTemplate(): Observable<any> {
    return this.http.get(this.makeUrl('templates/favorite'));
  }
  
  submitFavoriteTemplate(body: TemplateFavorite): Observable<any> {
    return this.http.post(this.makeUrl('templates/favorite'), body, this.defaultHeaders);
  }
  
  getSettings(): Observable<any> {
    return this.http.get(this.makeUrl('settings'));
  }
  
  submitSettings(body: UserSettings): Observable<any> {
    return this.http.post(this.makeUrl('settings'), body, this.defaultHeaders);
  }
  
  submitLogin(username: string, password: string, saveLogin?: boolean): Observable<any> {
    return this.http.post(this.makeUrl('login'), {
      username: username,
      password: password,
      saveLogin: saveLogin ? true : false
    }, this.defaultHeaders);
  }
  
  startDemo(): Observable<any> {
    return this.http.post(this.makeUrl('demo-start'), {}, this.defaultHeaders);
  }
  
  endDemo(username: string): Observable<any> {
    return this.http.post(this.makeUrl('demo-end'), {
      username: username
    }, this.defaultHeaders);
  }
  
  changePassword(username: string, currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(this.makeUrl('change-password'), {
      username: username,
      currentPassword: currentPassword,
      newPassword: newPassword
    });
  }
  
  requestNewAccount(username: string, email: string, note?: string): Observable<any> {
    return this.http.post(this.makeUrl('new-account'), {
      username: username,
      email: email,
      note: note
    }, this.defaultHeaders);
  }
}
