import { Injectable, inject } from '@angular/core';
import { Thing } from '../model/thing';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateService  {
  loading: boolean = false;
  data: Thing[] = [];
  backend: StorageService = inject(StorageService);
  
  constructor() { }
  
  static getCreateNewName(): string {
    return 'CREATE NEW';
  }
  
  static getMilestoneName(): string {
    return 'Milestone';
  }
  
  getAllTemplates(): void {
    this.loading = true;
    this.backend.getAllTemplates().subscribe({
      next: res => {
        this.data = res;
        // TODO Probably have to cast these to actual Template objects, just like our thing.service.ts
        console.log("Get Templates", this.data);
      },
      error: err => {
        Utility.showError('Failed to retrieve your templates');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
}
