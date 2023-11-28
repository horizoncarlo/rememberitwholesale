import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Template } from '../model/template';
import { Thing } from '../model/thing';
import { UserSettings } from '../model/user-settings';

// Determine our base URL for all Node interactions
const BASE_URL = environment.baseUrl || 'http://localhost:4333/';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  defaultHeaders = { headers: { 'Content-Type': 'application/json' }};
  
  constructor(private http: HttpClient) { }
  
  getAllThings(): Observable<any> {
    return this.http.get(BASE_URL + 'things');
  }
  
  deleteThing(deleteId: string): Observable<any> {
    return this.http.delete(BASE_URL + 'things/' + deleteId);
  }
  
  submitThing(body: Thing): Observable<any> {
    return this.http.post(BASE_URL + 'things', body, this.defaultHeaders);
  }
  
  getAllTemplates(): Observable<any> {
    return this.http.get(BASE_URL + 'templates');
  }
  
  deleteTemplate(nameToDelete: string, deleteThingsToo?: boolean): Observable<any> {
    return this.http.post(BASE_URL + 'templates/delete', {
      templateNameToDelete: nameToDelete,
      deleteThingsToo: deleteThingsToo || false
    }, this.defaultHeaders);
  }
  
  submitTemplate(body: Template): Observable<any> {
    return this.http.post(BASE_URL + 'templates', body, this.defaultHeaders);
  }
  
  getSettings(): Observable<any> {
    return this.http.get(BASE_URL + 'settings');
  }
  
  submitSettings(body: UserSettings): Observable<any> {
    return this.http.post(BASE_URL + 'settings', body, this.defaultHeaders);
  }
}
