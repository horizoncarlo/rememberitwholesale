import { Injectable } from '@angular/core';
import { addDays, differenceInMilliseconds, differenceInMinutes, formatDistanceToNow, isAfter, subDays } from 'date-fns';
import { lastValueFrom } from 'rxjs';
import { Template } from '../model/template';
import { Thing } from '../model/thing';
import { DebugFlags } from '../util/debug-flags';
import { Utility } from '../util/utility';
import { StorageService } from './storage.service';
import { UserService } from './user.service';

const REMINDER_MINUTES_TO_WATCH = 60; // Minimum number of minutes remaining on a reminder before we observe it for completion, in case of the app being idle
const UPLOAD_BATCH_SIZE: number = 5 as const;

export interface SimpleUpload {
  // For storing in Thing
  name?: string,
  size?: number,
  url?: string,
  // For processing from the client
  file?: File,
  data?: string,
  // For both
  type?: 'image' | 'title'
};

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
  shownReminders: string[] = []; // List of recently overdue reminders we've shown, to prevent spamming the user
  cachedLimitDate: number | undefined;
  
  constructor(public backend: StorageService,
              public userService: UserService) { }
  
  markLoading() {
    this.loading = true;
    Utility.saveTableScrollPos();
  }
  
  doneLoading() {
    this.loading = false;
    Utility.loadTableScrollPos();
  }
  
  uploadSingleFile(thingId: string, file: File): Promise<any> {
    const toUpload = new FormData();
    toUpload.append('file', file, file.name);
    return lastValueFrom(this.backend.uploadThing(thingId, toUpload));
  }
  
  async uploadAllFiles(attachedThing: Thing, uploadList: SimpleUpload[]) {
    // Upload any files
    if (Utility.hasItems(uploadList)) {
      // We want to batch our uploads to not overwhelm the server
      let successCount = 0;
      let errorCount = 0;
      const batchCount = Math.floor(uploadList.length / UPLOAD_BATCH_SIZE);
      const batchLeftover = uploadList.length % UPLOAD_BATCH_SIZE;
      
      for (let i = 1; i <= batchCount; i++) {
        await handleBatchUpload((i-1)*UPLOAD_BATCH_SIZE, i*UPLOAD_BATCH_SIZE, uploadList, this);
      }
      if (batchLeftover > 0) {
        await handleBatchUpload(batchCount*UPLOAD_BATCH_SIZE, (batchCount*UPLOAD_BATCH_SIZE + batchLeftover), uploadList, this);
      }
      
      async function handleBatchUpload(indexStart: number, indexEnd: number, uploadList: SimpleUpload[], things: ThingService) {
        const currentBatchArray = uploadList.slice(indexStart, indexEnd);
        const batchPromises = currentBatchArray.map((currentFile: SimpleUpload) => {
          return new Promise(async (resolve, reject) => {
            try{
              await things.uploadSingleFile(attachedThing.id, currentFile.file as File);
              successCount++;
              resolve(successCount);
            }catch(err) {
              errorCount++;
              console.error("Failed to upload a file", err);
              return reject(err);
            }
          });
        });
        
        await Promise.allSettled(batchPromises);
      }
      
      if (errorCount > 0) {
        if (successCount > 0) {
          Utility.showWarn(`Saved your Thing but failed to upload ${errorCount} files (${successCount} succeeded)`, attachedThing.name);
        }
        else {
          Utility.showWarn(`Saved your Thing but failed to upload ALL ${errorCount} files`, attachedThing.name);
        }
      }
      else if (successCount > 0) {
        Utility.showSuccess(`Saved your Thing and uploaded ${successCount} files`, attachedThing.name);
      }
    }
  }
  
  saveThing(toSave: Thing,
            options?: {
              silent?: boolean,
              refreshFromServer?: boolean,
              onSuccess?: Function,
              uploadList?: SimpleUpload[]
            }): void {
    if (toSave && toSave.isValid()) {
      toSave.prepareForSave();
    }
    else {
      Utility.showError('Invalid Thing, ensure all fields are filled');
      return;
    }
    
    console.log("Going to save Thing", toSave);
    
    // Convert any uploaded files into a friendly list we can save in the Thing
    // Note we maintain our existing upload list, so that on the backend we can tell if there are any changes/deletions
    if (options && options.uploadList &&
        Utility.hasItems(options.uploadList)) {
      const newUploads = options.uploadList.map(upload => {
        return {
          name: upload.file?.name,
          size: upload.file?.size,
          type: upload.type
        } as SimpleUpload;
      });
      
      // Concat if we have an existing list
      if (Utility.hasItems(toSave.uploads) && toSave.uploads) {
        toSave.uploads = toSave.uploads?.concat(newUploads);
      }
      else {
        toSave.uploads = newUploads;
      }
    }
    
    this.markLoading();
    this.backend.submitThing(toSave).subscribe({
      next: async res => {
        if (options && options.uploadList &&
            Utility.hasItems(options.uploadList)) {
          await this.uploadAllFiles(toSave, options.uploadList);
        }
        else if (!options?.silent) {
          Utility.showSuccess('Successfully saved your Thing', toSave.name);
        }
        
        // Force reloading from the server when images are added to ensure we have updated links, or when the flag is requested
        if (options?.refreshFromServer || Utility.hasItems(toSave.uploads)) {
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
        Utility.showError('Failed to save your Thing');
        console.error(err);
      }
    }).add(() => this.doneLoading());
  }
  
  getExistingThing(toCheck: Thing): Thing | undefined {
    return this.data.find((currentThing) => currentThing.id === toCheck.id);
  }
  
  doesThingExist(toCheck: Thing): boolean {
    return this.getExistingThing(toCheck) !== null;
  }
  
  deleteThings(toDelete: Thing[], options?: { refreshFromServer?: boolean }): void {
    this.markLoading();
    this.backend.deleteThings(toDelete.map(thing => thing.id)).subscribe({
      next: res => {
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
      },
      error: err => {
        Utility.showError("Failed to delete " + toDelete.length + " Thing" + Utility.plural(toDelete));
        console.error(err);
      }
    }).add(() => this.doneLoading());
  }
  
  preGetAllThings(): void {
    this.markLoading();
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
    
    // Update our count if we're refreshing from a local cache or don't have the field yet
    if (this.thingCount === -1 || !details?.fromService) {
      this.thingCount = this.data.length;
    }
    
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
                Utility.showReminderComplete(toReturn,
                () => {
                  _this.completeReminder(toReturn);
                },
                () => {
                  _this.postponeReminder(toReturn);
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
            if (toReturn.hasFreshOverdueReminder() &&
                this.shownReminders.indexOf(toReturn.id) === -1) {
              this.shownReminders.push(toReturn.id);
              
              const _this = this;
              Utility.showReminderOverdue(toReturn,
              () => {
                _this.completeReminder(toReturn);
              },
              () => {
                _this.postponeReminder(toReturn);
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
    
    console.log((details && details.fromService ? "--> ": "") + "Get Things", this.data.length);
    console.log("Reminders", this.reminders.length);
    
    // Dispatch a resize event in case the rows changed
    Utility.fireWindowResize();
    setTimeout(() => { this.doneLoading() });
  }

  getAllThings(limitDate?: number): void {
    // Use any incoming limit date, otherwise use the previously cached limit date
    if (typeof limitDate === 'number') {
      this.cachedLimitDate = limitDate;
    }
    else if (typeof this.cachedLimitDate === 'number') {
      limitDate = this.cachedLimitDate;
    }
    
    this.preGetAllThings();
    this.backend.getAllThings(limitDate).subscribe({
      next: res => {
        // Unwrap the content from the server
        this.data = res.data as Thing[];
        
        // Overwrite the thingCount if we have metadata specifying it
        this.thingCount = -1;
        if (res.metadata) {
          if (Utility.isDefined(res.metadata.totalCount)) {
            this.thingCount = res.metadata.totalCount;
          }
        }
      },
      error: err => {
        this.doneLoading();
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
    this._removeReminder(markDone);
    
    delete markDone.reminder;
    this.saveThing(markDone, { silent: true });
  }
  
  postponeReminder(toPostpone: Thing): void {
    this._removeReminder(toPostpone);
    
    toPostpone.time = addDays(toPostpone.time as Date, 1);
    this.saveThing(toPostpone, { silent: true });
    Utility.showSuccess('Updated Reminder to tomorrow instead');
  }
  
  _removeReminder(toRemove: Thing): void {
    const removeIndex = this.remindersOverdue.indexOf(toRemove);
    if (removeIndex !== -1) {
      this.remindersOverdue.splice(removeIndex, 1);
    }
  }
  
  countThingsUsingTemplate(toCount: Template, showNotif?: boolean): number {
    let count = this.data.filter((thing: Thing) => toCount.name.toLowerCase() === thing.templateType.toLowerCase()).length;
    
    if (showNotif) {
      Utility.showInfo('Template "' + toCount.name + '" used in ' + count + ' Thing' + Utility.pluralNum(count));
    }
    return count;
  }
  
  loadedAndHasData(): boolean {
    return Utility.hasItems(this.data) || this.thingCount > 0;
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
