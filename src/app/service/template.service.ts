import { Injectable, inject } from '@angular/core';
import { Template } from '../model/template';
import { TemplateFavorite } from '../model/template-favorite';
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
  favorite?: TemplateFavorite;
  backend: StorageService = inject(StorageService);
  
  constructor() {
    // Automatically fetch our favorite on load
    this._getFavorite();
  }
  
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
  
  getTemplateByName(name: string): Template | null {
    if (Utility.hasItems(this.data)) {
      const toReturn: Template[] = this.data.filter((template) => name === template.name);
      if (Utility.hasItems(toReturn)) {
        return toReturn[0];
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
  
  getTemplateCount(): number {
    return Utility.hasItems(this.data) ? this.data.length : 0;
  }
  
  getAllTemplates(): void {
    this.loading = true;
    this.backend.getAllTemplates().subscribe({
      next: res => {
        // Cast our results for better type checking, and sort by name
        this.data = res.map((current: Template) => {
          return Template.cloneFrom(current);
        }).toSorted((a: Template, b: Template) => a.name.localeCompare(b.name));
        
        console.log("--> Get Templates", this.data);
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to retrieve your Templates');
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
        this.loading = false;
        Utility.showError('Failed to save your new Template');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
  
  saveFavorite(toAdd: TemplateFavorite): void {
    if (toAdd && toAdd.isValid()) {
      toAdd.prepareForSave();
    }
    else {
      Utility.showError('Invalid Template, ensure all fields are filled');
      return;
    }
    
    console.log("Going to save Favorite Template", toAdd);
    
    this.loading = true;
    this.backend.submitFavoriteTemplate(toAdd).subscribe({
      next: res => {
        this.favorite = toAdd;
        
        Utility.showSuccess('Successfully set your Favorite Template', this.favorite.name);
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to set your Favorite Template');
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
        // Note from an optimization point of view we're stuck with this call, without a rework
        // Because we don't know what Things the backend deleted alongside
        // We COULD return a list of deleted Thing IDs from this.backend.deleteTemplate
        if (deleteThingsToo) {
          this.things.getAllThings();
        }
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to delete "' + nameToDelete + '"');
        console.error(err);
      }
    });
  }
  
  private _getFavorite(): void {
    this.backend.getFavoriteTemplate().subscribe({
      next: res => {
        if (res && Utility.hasItems(res)) {
          // Clone to ensure we get our JSON data cast properly
          this.favorite = TemplateFavorite.cloneFrom(res);
        }
        else {
          delete this.favorite;
        }
      },
      error: err => {
        Utility.showError('Failed to retrieve your Favorite Template');
        console.error(err);
      }
    })
  }
  
  hasFavorite(): boolean {
    return this.favorite ? true : false;
  }
}
