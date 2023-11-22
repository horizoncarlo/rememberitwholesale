import { Injectable, inject } from '@angular/core';
import { Template } from '../model/template';
import { Thing } from '../model/thing';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ThingService {
  loading: boolean = false;
  data: Thing[] = [];
  reminders: string[] = [];
  backend: StorageService = inject(StorageService);
  
  saveThing(toAdd: Thing): void {
    if (toAdd && toAdd.isValid()) {
      toAdd.prepareForSave();
    }
    else {
      Utility.showError('Invalid Thing, ensure all fields are filled');
      return;
    }
    
    console.log("Going to save Thing", toAdd);
    
    this.loading = true;
    this.backend.submitThing(toAdd).subscribe({
      next: res => {
        Utility.showSuccess('Successfully saved your Thing', toAdd.name);
        this.getAllThings();
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to save your Thing');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
  
  deleteThings(toDelete: Thing[]): void {
    this.loading = true;
    let isMultiple = toDelete.length > 1;
    for (let i = 0; i < toDelete.length; i++) {
      this.backend.deleteThing(toDelete[i].id).subscribe({
        next: res => {
          // Ensure we only refresh our data once
          if (!isMultiple ||
              isMultiple && i === toDelete.length-1) {
            Utility.showSuccess("Successfully deleted " + toDelete.length + " Thing" + Utility.plural(toDelete));
            this.getAllThings();
          }
        },
        error: err => {
          this.loading = false;
          Utility.showError('Failed to delete "' + toDelete[i].name + '"');
          console.error(err);
        }
      });
    }
  }

  getAllThings(): void {
    this.loading = true;
    this.reminders = [];
    
    const nowDate = new Date();
    this.backend.getAllThings().subscribe({
      next: res => {
        this.data = res.map((current: Thing) => {
          const toReturn = Thing.cloneFrom(current);
          
          if (toReturn.reminder && toReturn.time &&
              toReturn.time < nowDate) { // TODO QUIDEL Clean up check on whether reminders should show
              this.reminders.push(toReturn.name); // TODO Format reminder
          }
          
          return toReturn;
        });
        console.log("Get Things", this.data);
        console.log("Reminders", this.reminders);
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to retrieve your data');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
  
  countThingsUsingTemplate(toCount: Template, showNotif?: boolean): number {
    let count = this.data.filter((thing: Thing) => toCount.name.toLowerCase() === thing.templateType.toLowerCase()).length;
    
    if (showNotif) {
      Utility.showInfo('Template "' + toCount.name + '" used in ' + count + ' Thing' + Utility.pluralNum(count));
    }
    return count;
  }
}
