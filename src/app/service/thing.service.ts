import { Injectable, inject } from '@angular/core';
import { Thing } from '../model/thing';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ThingService  {
  loading: boolean = false;
  data: Array<Thing> = [];
  backend: StorageService = inject(StorageService);
  
  constructor() { }
  
  saveNew(toAdd: Thing) {
    if (toAdd && toAdd.isValid()) {
      toAdd.prepareForSave();
    }
    
    this.loading = true;
    this.backend.submitData(toAdd).subscribe({
      next: res => {
        Utility.showSuccess('Successfully saved your new Thing', toAdd.name);
      },
      error: err => {
        Utility.showError('Failed to save your new Thing');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }

  getAll(): void {
    this.loading = true;
    this.backend.getData().subscribe({
      next: res => {
        this.data = res;
      },
      error: err => {
        Utility.showError('Failed to retrieve your data');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
}
