import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
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
  hasCached: boolean = false; // After our first fetch, we cache our `data`, and internally manage it and re-fetch when needed
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
  
  getTemplateByName(name: string | null): Template | null {
    if (Utility.isValidString(name) && Utility.hasItems(this.data)) {
      const toReturn: Template[] = this.data.filter((template) => name === template.name);
      if (Utility.hasItems(toReturn)) {
        return toReturn[0];
      }
    }
    return null;
  }
  
  getColorByTemplateName(name: string | null): string | null {
    const template = this.getTemplateByName(name);
    if (template && template.color) {
      return template.color;
    }
    return null;
  }  
  
  getFilteredData(hideDefaults: boolean = false): Template[] {
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
  
  getAllTemplatesObs(): Observable<any> {
    // If we are cached just return our current data
    if (this.hasCached) {
      return new Observable((subscriber) => {
        subscriber.next(this.data);
      });
    }
    
    this.loading = true;
    return this.backend.getAllTemplates().pipe(map(res => {
      if (Utility.isArray(res)) {
          // Cast our results for better type checking, and sort by name
          this.data = res.map((current: Template) => {
            return Template.cloneFrom(current);
          }).toSorted((a: Template, b: Template) => a.name.localeCompare(b.name));
          this.hasCached = true;
          
          console.log("--> Get Templates", this.data.length);
      }
      this.loading = false;
    }),
    catchError(err => {
      this.loading = false;
      Utility.showError('Failed to retrieve your Templates');
      console.error(err);
      throw(err);
    }));
  }
  
  getAllTemplates(): void {
    this.getAllTemplatesObs().subscribe({
      error: err => {
        Utility.showError('Failed to retrieve your Templates');
        console.error(err);
      }
    }).add(() => this.loading = false);
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
        this.hasCached = false;
        this.getAllTemplates();
      },
      error: err => {
        Utility.showError('Failed to save your new Template');
        console.error(err);
      }
    }).add(() => this.loading = false);
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
        Utility.showError('Failed to set your Favorite Template');
        console.error(err);
      }
    }).add(() => {
      this.loading = false;
      this.hasCached = false;
    });
  }
  
  deleteTemplate(nameToDelete: string, deleteThingsToo?: boolean): void {
    this.loading = true;
    this.backend.deleteTemplate(nameToDelete, deleteThingsToo).subscribe({
      next: res => {
        // Ensure we only refresh our data once
        Utility.showSuccess("Successfully deleted Template", nameToDelete);
        this.hasCached = false;
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
      },
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
