import { Injectable, inject } from '@angular/core';
import { Template } from '../model/template';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';
import { ThingService } from './thing.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateService  {
  things: ThingService = inject(ThingService);
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
  
  filteredData(hideDefaults: boolean = false): Template[] {
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
  
  getAllTemplates(): void {
    this.loading = true;
    this.backend.getAllTemplates().subscribe({
      next: res => {
        this.data = res.map((current: Template) => {
          return Template.cloneFrom(current);
        });
        console.log("Get Templates", this.data);
      },
      error: err => {
        Utility.showError('Failed to retrieve your templates');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
  
  saveNew(toAdd: Template): void {
    if (toAdd && toAdd.isValid()) {
      toAdd.prepareForSave();
    }
    else {
      Utility.showError('Invalid Template, ensure all fields are filled');
      return;
    }
    
    console.log("Going to save new Template", toAdd);
    
    this.loading = true;
    this.backend.submitTemplate(toAdd).subscribe({
      next: res => {
        Utility.showSuccess('Successfully saved your new Template', toAdd.name);
        this.getAllTemplates();
      },
      error: err => {
        Utility.showError('Failed to save your new Template');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
  
  deleteTemplate(nameToDelete: string, deleteThingsToo?: boolean): void {
    this.loading = true;
    this.backend.deleteTemplate(nameToDelete, deleteThingsToo).subscribe({
      next: res => {
        // Ensure we only refresh our data once
        Utility.showSuccess("Successfully deleted Template", nameToDelete);
        this.getAllTemplates();
        
        // Refresh our Things too if we deleted them
        if (deleteThingsToo) {
          this.things.getAllThings();
        }
      },
      error: err => {
        Utility.showError('Failed to delete "' + nameToDelete + '"');
        console.error(err);
        this.loading = false;
      }
    });
  }
}
