import { Injectable, inject } from '@angular/core';
import { differenceInMilliseconds, differenceInMinutes, isAfter, subDays } from 'date-fns';
import { Template } from '../model/template';
import { Thing } from '../model/thing';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';

const REMINDER_MINUTES_TO_WATCH = 60; // Minimum number of minutes remaining on a reminder before we observe it for completion, in case of the app being idle

@Injectable({
  providedIn: 'root'
})
export class ThingService {
  loading: boolean = false;
  data: Thing[] = [];
  reminders: Thing[] = [];
  remindersOverdue: Thing[] = []; // Reminders that are a day or less old
  remindersCleanup: any[] = []; // List of setTimeout references for tracking and clearing
  backend: StorageService = inject(StorageService);
  
  saveThing(toAdd: Thing, silent?: boolean): void {
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
        if (!silent) {
          Utility.showSuccess('Successfully saved your Thing', toAdd.name);
        }
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
    this.remindersOverdue = [];
    
    // Clean up any existing timeouts that may be around from a previous fetch
    if (Utility.hasItems(this.remindersCleanup)) {
      for (let i = 0; i < this.remindersCleanup.length; i++) {
        clearTimeout(this.remindersCleanup[i]);
      }
    }
    this.remindersCleanup = [];
    
    const _this = this;
    const nowDate = new Date();
    this.backend.getAllThings().subscribe({
      next: res => {
        this.data = res.map((current: Thing) => {
          const toReturn = Thing.cloneFrom(current);
          
          // Ensure that any reminders that are almost done clear properly in the app if left idle
          // This is probably needlessly complex and pointless, as the things and reminders will be refetched
          //  often enough through normal usage
          // But in case a user leaves the app idle, and has reminders that are about to complete,
          //  we want to track those and remove them and update the UI when they expire
          if (toReturn.reminder && toReturn.time) {
            if (isAfter(toReturn.time, nowDate)) {
              this.reminders.push(toReturn);
              
              if (differenceInMinutes(toReturn.time, nowDate) <= REMINDER_MINUTES_TO_WATCH) {
                const watchTimer = setTimeout(function() {
                  // TODO Better notify on reminder being done and needing to fire. Would be cool to do native app notification (vibrate, popup, etc.) to replace my need for a Reminder app. Not we need HTTPS to use JS native Notification
                  // TODO Also have a way to mark reminder as complete as soon as it pops
                  Utility.showInfoSticky(toReturn.name + ' (' + toReturn.templateType + ') is due', 'Reminder NOW');
                  
                  if (Utility.hasItems(_this.reminders)) {
                    for (let i = _this.reminders.length-1; i >= 0; i--) {
                      if (toReturn && toReturn.id &&
                          toReturn.id ===_this.reminders[i].id) {
                        _this.reminders.splice(i, 1);
                      }
                    }
                  }
                }, differenceInMilliseconds(toReturn.time, nowDate));
                
                this.remindersCleanup.push(watchTimer);
              }
            }
            // Mark anything up to a day old as overdue. Anything older is ignored (and should have it's reminder flag cleared)
            else {
              const dayOld = subDays(new Date(), 1);
              if (isAfter(toReturn.time, dayOld)) {
                this.remindersOverdue.push(toReturn);
              }
            }
          }
          
          return toReturn;
        });
        
        // Sort our reminders with the closest to completion at the top
        this.reminders.sort((a, b) => { return (a.time && b.time) ? a.time?.getTime() - b.time?.getTime() : 0 });
        
        console.log("Get Things", this.data);
        console.log("Reminders", this.reminders);
        
        // TODO Dispatch a resize event in case the rows changed
        window.dispatchEvent(new Event('resize'));
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to retrieve your Things');
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
  
  loadedAndHasData(): boolean {
    return !this.loading && Utility.hasItems(this.data);
  }
  
  hasReminders(): boolean {
    return Utility.hasItems(this.reminders);
  }
  
  hasRemindersOverdue(): boolean {
    return Utility.hasItems(this.remindersOverdue);
  }
  
  hasAnyReminders(): boolean {
    return this.hasReminders() || this.hasRemindersOverdue();
  }
}
