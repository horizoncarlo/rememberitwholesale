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
  
  static getMilestoneName(): string {
    return 'Milestone';
  }
  
  static getDefaultName(): string {
    return this.getMilestoneName();
  }
  
  getFirstDefaultTemplate(): Template | null {
    if (Utility.hasItems(this.data)) {
      for (let i = 0; i < this.data.length; i++) {
        if (this.data[i].isDefault) {
          return this.data[i];
        }
      }
    }
    
    return null;
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
  
  countThingsForTemplate(toCount: Template, showNotif?: boolean): number {
    let count = this.data.filter((template) => toCount.name.toLowerCase() === template.name.toLowerCase()).length;
    
    if (showNotif) {
      Utility.showInfo('Template "' + toCount.name + '" used in ' + count + ' Thing' + Utility.pluralNum(count));
    }
    return count;
  }
  
  filteredData(hideDefaults: boolean = false) {
    return this.data.filter((template) => {
      if (hideDefaults) {
        return !template.isDefault;
      }
      return true;
    });
  }
  
  isNameUnique(nameToCheck: string): boolean {
    if (Utility.hasItems(this.data)) {
      return this.data.filter((template) => nameToCheck.toLowerCase() === template.name.toLowerCase()).length === 0;
    }
    return true;
  }
  
  deleteTemplate(nameToDelete: string, deleteThingsToo: boolean = false): void {
    // TODO Temporarily just remove from our local list
    this.data = this.data.filter((template) => template.name !== nameToDelete);
    Utility.showSuccess('Removed template "' + nameToDelete + '"');
    
    if (deleteThingsToo) {
      // TODO ThingService.deleteThing, or realistically have a part of our Node call take our flag and handle it in a single call
    }
    
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
