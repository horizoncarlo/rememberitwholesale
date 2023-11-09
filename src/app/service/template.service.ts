import { Injectable, inject } from '@angular/core';
import { Template } from '../model/template';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateService  {
  loading: boolean = false;
  data: Template[] = [];
  backend: StorageService = inject(StorageService);
  
  constructor() { }
  
  static getMilestoneName(): string {
    return 'Milestone';
  }
  
  static getDefaultName(): string {
    return this.getMilestoneName();
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
  
  deleteTemplate(nameToDelete: string): void {
    // TODO Temporarily just remove from our local list
    this.data = this.data.filter((template) => template.name !== nameToDelete);
    Utility.showSuccess('Removed template "' + nameToDelete + '"');
    
    /*
    this.backend.deleteTemplate(nameToDelete).subscribe({
      next: res => {
      },
      error: err => {
        Utility.showError('Failed to retrieve your templates');
        console.error(err);
      },
      complete: () => this.loading = false
    });
    */
  }
}
