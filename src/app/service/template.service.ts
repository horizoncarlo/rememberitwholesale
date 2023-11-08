import { Injectable, inject } from '@angular/core';
import { Thing } from '../model/thing';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateService  {
  loading: boolean = false;
  data: Array<Thing> = [];
  backend: StorageService = inject(StorageService);
  
  constructor() { }
  
  getAll(): void {
    this.loading = true;
    this.backend.getAllTemplates().subscribe({
      next: res => {
        this.data = res;
        console.error("GOT TEMPLATES", this.data);
      },
      error: err => {
        Utility.showError('Failed to retrieve your templates');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
}
