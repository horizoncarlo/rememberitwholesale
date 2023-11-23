import { Injectable, inject } from '@angular/core';
import { addMonths, differenceInMilliseconds, differenceInMinutes, formatDistanceToNow, isAfter, isBefore, subDays, subHours, subWeeks } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Template } from '../model/template';
import { Thing } from '../model/thing';
import { DebugFlags } from '../util/debug-flags';
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
  messageService: MessageService = inject(MessageService);
  
  saveThing(toSave: Thing, options?: { silent?: boolean, refreshFromServer?: boolean }): void {
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
          const foundThing = this.data.find((currentThing) => currentThing.id === toSave.id);
          if (!foundThing) { // Doesn't exist, so add
            this.data.push(toSave);
          }
          else {
            const foundAt = this.data.indexOf(foundThing);
            this.data.splice(foundAt, 1, toSave);
          }
          this.postGetAllThings();
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
                const foundAt = this.data.indexOf(toDelete[j]);
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
    this.messageService.clear(); // Remove any old sticky reminder notifications
    
    // Clean up any existing timeouts that may be around from a previous fetch
    if (Utility.hasItems(this.remindersCleanup)) {
      for (let i = 0; i < this.remindersCleanup.length; i++) {
        clearTimeout(this.remindersCleanup[i]);
      }
    }
    this.remindersCleanup = [];
  }
  
  postGetAllThings(): void {
    const nowDate = new Date();
    const monthAway = addMonths(new Date(), 1);
    
    this.data = this.data.map((current: Thing) => {
      const toReturn = Thing.cloneFrom(current);
      
      // Ensure that any reminders that are almost done clear properly in the app if left idle
      // This is probably needlessly complex and pointless, as the things and reminders will be refetched
      //  often enough through normal usage
      // But in case a user leaves the app idle, and has reminders that are about to complete,
      //  we want to track those and remove them and update the UI when they expire
      if (toReturn.reminder && toReturn.time) {
        // Handle reminders that are still in the future
        if (isAfter(toReturn.time, nowDate)) {
          // Only bother processing if the reminder is within a month
          if (isBefore(toReturn.time, monthAway)) {
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
        // Mark anything up to a day old as overdue
        else {
          const dayOld = subDays(nowDate, 1);
          if (isAfter(toReturn.time, dayOld)) {
            // If we just missed the reminder in the last hour notify with an option to complete on the screen
            const hourOld = subHours(nowDate, 1);
            if (isAfter(toReturn.time, hourOld)) {
              const _this = this;
              Utility.showReminderOverdue(toReturn, () => {
                _this.completeReminder(toReturn);
              });
            }
            
            this.remindersOverdue.push(toReturn);
          }
          // Anything really old (week+) should have it's reminder flag cleared
          else {
            const weekOld = subWeeks(nowDate, 1);
            if (isBefore(toReturn.time, weekOld)) {
              console.log('OLD Reminder "' + toReturn.name + '" (' + toReturn.templateType + ') will be cleared');
              
              delete toReturn.reminder;
              this.saveThing(toReturn, { silent: true });
            }
          }
        }
      }
      
      return toReturn;
    });
    
    // Sort our reminders with the closest to completion at the top
    this.reminders.sort((a, b) => { return (a.time && b.time) ? a.time?.getTime() - b.time?.getTime() : 0 });
    
    console.log("Get Things", this.data);
    console.log("Reminders", this.reminders);
    
    // Dispatch a resize event in case the rows changed
    Utility.fireWindowResize();
    this.loading = false;
  }

  getAllThings(): void {
    this.preGetAllThings();
    this.backend.getAllThings().subscribe({
      next: res => this.data = res,
      error: err => {
        this.loading = false;
        Utility.showError('Failed to retrieve your Things');
        console.error(err);
      },
      complete: () => this.postGetAllThings()
    });
  }
  
  completeReminder(markDone: Thing): void {
    const removeIndex = this.remindersOverdue.indexOf(markDone);
    if (removeIndex !== -1) {
      this.remindersOverdue.splice(removeIndex, 1);
    }
    
    delete markDone.reminder;
    this.saveThing(markDone, { silent: false });
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
