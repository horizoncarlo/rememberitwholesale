import { Injectable, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Thing } from '../model/thing';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ThingService  {
  data: Array<Thing> = [];
  backend: StorageService = inject(StorageService);
  
  constructor() { }

  getData(): void {
    console.error("GET DATA");
    this.backend.getData().subscribe({
      next: res => {
        console.error("RES", res);
        this.data = res;
      },
      error: err => {
        console.error("ERROR", err);
      }
    });
  }

  submitData(): void {
    this.backend.submitData(new Thing(uuidv4(), 'Test First', new Date())).subscribe({
      next: res => {
        console.error("RES", res);
      },
      error: err => {
        console.error("ERROR", err);
      }
    });
  }
}
