import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Template } from '../model/template';
import { TemplateField } from '../model/template-field';
import { Thing } from '../model/thing';
import { TemplateService } from './template.service';

const BASE_URL = 'http://localhost:4333/';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  defaultHeaders = { headers: { 'Content-Type': 'application/json' }};
  
  constructor(private http: HttpClient) { }
  
  // TODO Have a way to define default templates if the file isn't initialized yet. Likely in our Node service itself instead
  
  getAllTemplates(): Observable<any> {
    // TODO Build Node functionality to get templates
    //return this.http.get(BASE_URL + 'templates');
    return new Observable((subscriber) => {
      // TODO For the real call we'd prepend our automatic, default, preset fields, like Milestone. For now return them as part of the test array
      return subscriber.next([
        // Note every template includes Name and Date/Time automatically. 'fields' array is optional
        new Template(TemplateService.getMilestoneName()),
        new Template('Longboard', [ new TemplateField('distance', 'Distance (km)', false, 'number') ]),
        new Template('Boardgame', [ new TemplateField('numPlayers', 'Number of Players', true), new TemplateField('winner', 'Winner') ])
      ]);
    });
  }
  
  deleteTemplate(nameToDelete: string): Observable<any> {
    // TODO Node functionality to delete a template: return this.http.delete(BASE_URL + 'data/' + deleteId);
    return new Observable();
  }
  
  getAllData(): Observable<any> {
    return this.http.get(BASE_URL + 'data');
  }
  
  deleteData(deleteId: string): Observable<any> {
    return this.http.delete(BASE_URL + 'data/' + deleteId);
  }
  
  submitData(body: Thing): Observable<any> {
    return this.http.post(BASE_URL + 'data', body, this.defaultHeaders);
  }
}
