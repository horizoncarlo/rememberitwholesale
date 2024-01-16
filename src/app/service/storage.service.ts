import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Template } from '../model/template';
import { TemplateFavorite } from '../model/template-favorite';
import { Thing } from '../model/thing';
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
  
  constructor(private http: HttpClient, private authService: AuthService) { }
  
  getAuthToken(): string {
    let toReturn = '?token=';
    if (this.authService.getAuth().isLoggedIn) {
      toReturn += this.authService.getAuth().authToken as string;
    }
    return toReturn;
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
  
  deleteThing(deleteId: string): Observable<any> {
    return this.http.delete(this.makeUrl('things/' + deleteId));
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
  
  requestNewAccount(username: string, email: string, note?: string): Observable<any> {
    return this.http.post(this.makeUrl('new-account'), {
      username: username,
      email: email,
      note: note
    }, this.defaultHeaders);
  }
}
