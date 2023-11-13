import { Injectable, inject } from '@angular/core';
import { Thing } from '../model/thing';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ThingService  {
  loading: boolean = false;
  data: Thing[] = [];
  backend: StorageService = inject(StorageService);
  
  saveNew(toAdd: Thing) {
    if (toAdd && toAdd.isValid()) {
      toAdd.prepareForSave();
    }
    else {
      Utility.showError('Invalid Thing, ensure all fields are filled');
      return;
    }
    
    console.log("Going to save new Thing", toAdd);
    
    this.loading = true;
    this.backend.submitData(toAdd).subscribe({
      next: res => {
        Utility.showSuccess('Successfully saved your new Thing', toAdd.name);
        this.getAllThings();
      },
      error: err => {
        Utility.showError('Failed to save your new Thing');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
  
  deleteThings(toDelete: Thing[]) {
    this.loading = true;
    let isMultiple = toDelete.length > 1;
    for (let i = 0; i < toDelete.length; i++) {
      this.backend.deleteData(toDelete[i].id).subscribe({
        next: res => {
          // Ensure we only refresh our data once
          if (!isMultiple ||
              isMultiple && i === toDelete.length-1) {
            Utility.showSuccess("Successfully deleted " + toDelete.length + " Thing" + Utility.plural(toDelete));
            this.getAllThings();
          }
        },
        error: err => {
          Utility.showError('Failed to delete "' + toDelete[i].name + '"');
          console.error(err);
          this.loading = false;
        }
      });
    }
  }

  getAllThings(): void {
    this.loading = true;
    this.backend.getAllData().subscribe({
      next: res => {
        this.data = res.map((current: Thing) => {
          return Thing.cloneFrom(current);
        });
        console.log("Get Things", this.data);
      },
      error: err => {
        Utility.showError('Failed to retrieve your data');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
}
