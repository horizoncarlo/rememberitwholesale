import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Thing } from '../model/thing';

const BASE_URL = 'http://localhost:4333/';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  defaultHeaders = { headers: { 'Content-Type': 'application/json' }};
  
  constructor(private http: HttpClient) { }
  
  getAllTemplates(): Observable<any> {
    // TODO Build Node functionality to get templates
    //return this.http.get(BASE_URL + 'templates');
    return new Observable((subscriber) => {
      // TODO For the real call we'd prepend our automatic, default, preset fields, like Milestone. For now return them as part of the test array
      return subscriber.next([
        {
          "name": "Milestone", // Note every template includes Name and Date/Time automatically. 'fields' array is optional
        },
        {
          "name": "Longboard",
          "fields": [
            {
              "property": "distance",
              "label": "Distance",
              "required": false,
              "type": "text"
            }
          ]
        },
        {
          "name": "Boardgame",
          "fields": [
            {
              "property": "numPlayers",
              "label": "Number of Players",
              "required": false,
              "type": "text"
            }
          ]
        }
      ]);
    });
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
