import { Injectable, inject } from '@angular/core';
import { differenceInMilliseconds, differenceInMinutes, formatDistanceToNow, isAfter, subDays } from 'date-fns';
import { Template } from '../model/template';
import { Thing } from '../model/thing';
import { DebugFlags } from '../util/debug-flags';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';
import { UserService } from './user.service';

const REMINDER_MINUTES_TO_WATCH = 60; // Minimum number of minutes remaining on a reminder before we observe it for completion, in case of the app being idle

@Injectable({
  providedIn: 'root'
})
export class ThingService {
  loading: boolean = false;
  data: Thing[] = [];
  thingCount: number = -1;
  reminders: Thing[] = [];
  remindersOverdue: Thing[] = []; // Reminders that are a day or less old
  remindersCleanup: any[] = []; // List of setTimeout references for tracking and clearing
  backend: StorageService = inject(StorageService);
  userService: UserService = inject(UserService);
  
  saveThing(toSave: Thing, options?: { silent?: boolean, refreshFromServer?: boolean, onSuccess?: Function }): void {
    if (toSave && toSave.isValid()) {
      toSave.prepareForSave();
    }
    else {
      Utility.showError('Invalid Thing, ensure all fields are filled');
      return;
    }
    
    console.log("Going to save Thing", toSave);
    
    this.loading = true;
    this.backend.submitThing(toSave).subscribe({
      next: res => {
        if (!options?.silent) {
          Utility.showSuccess('Successfully saved your Thing', toSave.name);
        }
        
        if (options?.refreshFromServer) {
          this.getAllThings();
        }
        // If we don't want to do a full refresh, just update our local list instead
        else {
          this.preGetAllThings();
          const foundThing = this.getExistingThing(toSave);
          if (!foundThing) { // Doesn't exist, so add
            this.data.push(toSave);
          }
          else {
            const foundAt = this.data.indexOf(foundThing);
            this.data.splice(foundAt, 1, toSave);
          }
          this.postGetAllThings();
        }
        
        if (options?.onSuccess && typeof options?.onSuccess === 'function') {
          options.onSuccess(res);
        }
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to save your Thing');
        console.error(err);
      },
      complete: () => this.loading = false
    });
  }
  
  getExistingThing(toCheck: Thing): Thing | undefined {
    return this.data.find((currentThing) => currentThing.id === toCheck.id);
  }
  
  doesThingExist(toCheck: Thing): boolean {
    return this.getExistingThing(toCheck) !== null;
  }
  
  deleteThings(toDelete: Thing[], options?: { refreshFromServer?: boolean }): void {
    this.loading = true;
    let isMultiple = toDelete.length > 1;
    for (let i = 0; i < toDelete.length; i++) {
      this.backend.deleteThing(toDelete[i].id).subscribe({
        next: res => {
          // Ensure we only notify and refresh our data once
          if (!isMultiple ||
            isMultiple && i === toDelete.length-1) {
            Utility.showSuccess("Successfully deleted " + toDelete.length + " Thing" + Utility.plural(toDelete));
            
            if (options?.refreshFromServer) {
              this.getAllThings();
            }
            else {
              this.preGetAllThings();
              for (let j = 0; j < toDelete.length; j++) {
                // Try to just find our delete item, but if we can't, match by ID instead
                let foundAt = this.data.indexOf(toDelete[j]);
                if (foundAt === -1) {
                  const foundThing = this.data.find((currentThing) => currentThing.id === toDelete[j].id);
                  if (foundThing) {
                    foundAt = this.data.indexOf(foundThing);
                  }
                }
                
                if (foundAt !== -1) {
                  this.data.splice(foundAt, 1);
                }
              }
              this.postGetAllThings();
            }
          }
        },
        error: err => {
          this.loading = false;
          Utility.showError('Failed to delete "' + toDelete[i].name + '"');
          console.error(err);
        },
        complete: () => this.loading = false
      });
    }
  }
  
  preGetAllThings(): void {
    this.loading = true;
    this.reminders = [];
    this.remindersOverdue = [];
    Utility.clearReminderMessages(); // Remove any old sticky reminder notifications
    
    // Clean up any existing timeouts that may be around from a previous fetch
    if (Utility.hasItems(this.remindersCleanup)) {
      for (let i = 0; i < this.remindersCleanup.length; i++) {
        clearTimeout(this.remindersCleanup[i]);
      }
    }
    this.remindersCleanup = [];
  }
  
  postGetAllThings(details?: { fromService?: boolean }): void {
    const nowDate = new Date();
    
    this.data = this.data.map((current: Thing) => {
      const toReturn = Thing.cloneFrom(current);
      
      // Ensure that any reminders that are almost done clear properly in the app if left idle
      // This is probably needlessly complex and pointless, as the things and reminders will be refetched
      //  often enough through normal usage
      // But in case a user leaves the app idle, and has reminders that are about to complete,
      //  we want to track those and remove them and update the UI when they expire
      if (toReturn.reminder && toReturn.time) {
        // Handle reminders that are still in the future
        if (toReturn.hasFutureReminder()) {
          // Only bother processing if the reminder is within a month
          if (toReturn.hasFarFutureReminder()) {
            this.reminders.push(toReturn);
            
            if (differenceInMinutes(toReturn.time, nowDate) <= REMINDER_MINUTES_TO_WATCH) {
              const _this = this;
              const timeoutMs = DebugFlags.DEBUG_FAST_REMINDERS ? 4000 : differenceInMilliseconds(toReturn.time, nowDate);
              const watchTimer = setTimeout(function() {
                // TODO Better notify on reminder complete - would be cool to do native app notification (vibrate, popup, etc.) to replace my need for a Reminder app. Note we need HTTPS to use JS native Notification
                Utility.showReminderComplete(toReturn, () => {
                  _this.completeReminder(toReturn);
                });
                
                if (Utility.hasItems(_this.reminders)) {
                  for (let i = _this.reminders.length-1; i >= 0; i--) {
                    if (toReturn && toReturn.id &&
                        toReturn.id ===_this.reminders[i].id) {
                      _this.reminders.splice(i, 1);
                    }
                  }
                }
              }, timeoutMs);
              
              this.remindersCleanup.push(watchTimer);
            }
          }
          // Can log far future reminders at least
          else {
            console.log('FAR Reminder "' + toReturn.name + '" (' + toReturn.templateType + ') ' + formatDistanceToNow(toReturn.time, { addSuffix: true }));
          }
        }
        // Deal with reminders that are passed: either overdue or need to be cleaned up
        else {
          if (this.isOverdueReminder(toReturn)) {
            // If we JUST missed the reminder notify with a toast and option to complete on the screen
            if (toReturn.hasFreshOverdueReminder()) {
              const _this = this;
              Utility.showReminderOverdue(toReturn, () => {
                _this.completeReminder(toReturn);
              });
            }
            
            this.remindersOverdue.push(toReturn);
          }
          // Anything older than overdue should have it's reminder flag cleared
          else {
            console.log('OLD Reminder "' + toReturn.name + '" (' + toReturn.templateType + ') will be cleared');
            
            delete toReturn.reminder;
            this.saveThing(toReturn, { silent: true });
          }
        }
      }
      
      return toReturn;
    });
    
    // Sort our reminders with the closest to completion at the top
    this.reminders.sort((a, b) => { return (a.time && b.time) ? a.time?.getTime() - b.time?.getTime() : 0 });
    
    console.log((details && details.fromService ? "--> ": "") + "Get Things", this.data);
    console.log("Reminders", this.reminders);
    
    // Dispatch a resize event in case the rows changed
    Utility.fireWindowResize();
    setTimeout(() => this.loading = false );
  }

  getAllThings(limitDate?: number): void {
    this.preGetAllThings();
    this.backend.getAllThings(limitDate).subscribe({
      next: res => {
        // Unwrap the content from the server
        this.data = res.data;
        
        // Default the Thing count, but overwrite if we have metadata specifying it
        this.thingCount = this.data.length;
        if (res.metadata) {
          if (Utility.isDefined(res.metadata.totalCount)) {
            this.thingCount = res.metadata.totalCount;
          }
        }
      },
      error: err => {
        this.loading = false;
        Utility.showError('Failed to retrieve your Things');
        console.error(err);
      },
      complete: () => this.postGetAllThings({ fromService: true })
    });
  }
  
  /**
   * Return true if we have a reminder that is in the past, up to X days old (user.overdueLimitDays setting)
   */
  isOverdueReminder(toCheck: Thing): boolean {
    return (toCheck && toCheck.reminder && toCheck.time &&
            isAfter(toCheck.time,
                    subDays(new Date(), this.userService.getUser().overdueLimitDays))) ? true: false;
  }
  
  completeReminder(markDone: Thing): void {
    const removeIndex = this.remindersOverdue.indexOf(markDone);
    if (removeIndex !== -1) {
      this.remindersOverdue.splice(removeIndex, 1);
    }
    
    delete markDone.reminder;
    this.saveThing(markDone, { silent: true });
  }
  
  countThingsUsingTemplate(toCount: Template, showNotif?: boolean): number {
    let count = this.data.filter((thing: Thing) => toCount.name.toLowerCase() === thing.templateType.toLowerCase()).length;
    
    if (showNotif) {
      Utility.showInfo('Template "' + toCount.name + '" used in ' + count + ' Thing' + Utility.pluralNum(count));
    }
    return count;
  }
  
  loadedAndHasData(): boolean {
    return !this.loading &&
           (Utility.hasItems(this.data) || this.thingCount > 0);
  }
  
  getReminderBadgeCount(): number {
    if (this.hasReminders()) {
      return Utility.getLength(this.reminders);
    }
    else if (this.hasRemindersOverdue()) {
      return Utility.getLength(this.remindersOverdue);
    }
    return 0;
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
