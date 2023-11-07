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
  
  getData(): Observable<any> {
    return this.http.get(BASE_URL + 'data');
  }
  
  submitData(body: Thing): Observable<any> {
    return this.http.post(BASE_URL + 'data', body, this.defaultHeaders);
  }
}
