import { Component, EventEmitter, HostListener, OnDestroy, Output, signal, ViewChild, WritableSignal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Template, TemplateEvent } from '../model/template';
import { TemplateField } from '../model/template-field';
import { Thing } from '../model/thing';
import { TemplateService } from '../service/template.service';
import { SimpleUpload, ThingService } from '../service/thing.service';
import { UserService } from '../service/user.service';
import { TemplateDropdownComponent } from '../template-dropdown/template-dropdown.component';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-manage-thing-dialog',
  templateUrl: './manage-thing-dialog.component.html',
  styleUrls: ['./manage-thing-dialog.component.css']
})
export class ManageThingDialogComponent implements OnDestroy {
  imageMaxWidth: number = 200 as const;
  imageMaxHeight: number = 200 as const;
  
  type: 'add' | 'edit' = 'add';
  actOn: Thing = new Thing('');
  selectedTemplate: Template | null = null;
  selectedTemplateName: string | null = null;
  isShowing: boolean = false;
  hasShownPublicNote: boolean = false;
  dropHighlight: boolean = false;
  fieldTypes = TemplateField.TYPES;
  uploadList: SimpleUpload[] = [];
  uploadLoading: boolean = false;
  uploadProgress: WritableSignal<number> = signal(0);
  uploadTotal: WritableSignal<number> = signal(0);
  private dragDropCounter: number = 0; // Since dragleave fires when mousing over child elements, we track our drag enter vs leave counter and change our highlight based on that
  @ViewChild('manageThingDialog') manageThingDialog!: Dialog;
  @ViewChild('templateDropdown') templateDropdown!: TemplateDropdownComponent;
  @ViewChild('submitButton') submitButton!: Button;
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  @Output() onDelete = new EventEmitter<{ thing: Thing, event: Event }>();
  @Output() onEdit = new EventEmitter<Thing>();
  
  constructor(public things: ThingService,
              public templateService: TemplateService,
              public userService: UserService,
              private confirmationService: ConfirmationService) { }
  
  ngOnDestroy(): void {
    Utility.commonDialogDestory();
  }
  
  isAdd(): boolean {
    return this.type === 'add';
  }
  
  isEdit(): boolean {
    return this.type === 'edit';
  }
  
  showAdd(): void {
    this.type = 'add';
    this.actOn = new Thing('');
    const defaultTemplate = this.templateService.getFirstDefaultTemplate();
    this.templateNameChanged(defaultTemplate ? defaultTemplate.name : null, { ignoreOldFields: true });
    this.show();
  }
  
  showEdit(selectedRows: Thing[]) {
    if (Utility.hasItems(selectedRows)) {
      this.type = 'edit';
      this.actOn = Thing.cloneFrom(selectedRows[0]);
      this.selectedTemplateName = this.actOn.templateType;
      this.templateNameChanged(this.selectedTemplateName, { ignoreOldFields: true });
      this.show();
    }
    else {
      Utility.showWarn('Select a Thing row to edit');
    }
  }
  
  show(): void {
    if (Utility.isMobileSize() || this.userService.getUser().maximizeDialogs) {
      this.manageThingDialog.maximized = true;
    }
    
    this.templateDropdown.refreshData();
    
    this.uploadList = [];
    this.hasShownPublicNote = false;
    this.isShowing = true;
    Utility.commonDialogShow();
  }
  
  @HostListener('window:popstate', ['$event'])
  hide(): void {
    // If we're currently processing uploaded images let's warn the user
    if (this.uploadLoading) {
      this.confirmationService.confirm({
        target: this.submitButton?.el?.nativeElement as EventTarget,
        message: 'You are currently uploading files, are you sure you want to cancel?',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.isShowing = false;
        },
        reject:() => {
        },
      });
    }
    else {
      this.isShowing = false;
    }
  }
  
  toggleThingDialog(): void {
    this.isShowing ? this.hide() : this.showAdd();
  }
  
  isMobileSize(): boolean {
    return Utility.isMobileSize();
  }
  
  reminderCheckboxChanged() : void {
    if (this.actOn && this.actOn.reminder && !this.actOn.timeInFuture()) {
      Utility.showInfo('Normally Reminders are in the future');
    }
  }
  
  publicCheckboxChanged(): void {
    if (this.actOn && this.actOn.public) {
      // If we have an updated field that means we've been saved before
      if (this.actOn.updated) {
        this.actOn.copyPublicLink();
      }
      // Otherwise just notify the user they can come back to copy their link
      else if (!this.hasShownPublicNote) {
        this.hasShownPublicNote = true;
        Utility.showInfo("Your public link will be available after you save this Thing");
      }
    }
  }
  
  clickPublicLink(event: any): void {
    if (event && event.target) {
      event.target.select();
    }
    if (this.actOn) {
      this.actOn.copyPublicLink();
    }
  }
  
  templateNameChanged(newName: string | null, params?: { ignoreOldFields?: boolean }): void {
    this.selectedTemplateName = newName;
    let changedTemplate = this.templateService.getTemplateByName(this.selectedTemplateName);
    
    // Clone if we found a template, so that we can make changes without affecting the actual template
    if (changedTemplate) {
      let oldTemplate = (this.selectedTemplate ? Template.cloneFrom(this.selectedTemplate as Template) : {}) as Template;
      this.selectedTemplate = Template.cloneFrom(changedTemplate);
      
      // Apply any saved fields to our template
      // Of course only for editing, and only if the template hasn't changed
      if (this.isEdit() && Utility.hasItems(this.actOn.fields) &&
          this.actOn.templateType === this.selectedTemplate.name) {
        this.selectedTemplate.fields = this.actOn.fields;
      }
      // Otherwise reset our fields
      else {
        this.selectedTemplate.clearValuesFromFields();
      }
      
      // Apply our initial reminder state if we have it
      // Note if we've manually set reminder, we won't overwrite that
      if (this.isAdd() && !this.actOn.reminder) {
        this.actOn.reminder = this.selectedTemplate.initialReminder;
      }
      
      // Ignore any old fields if asked to
      if (params && params.ignoreOldFields) {
        oldTemplate = {} as Template;
      }
      
      // Now after our fields are setup we want to check if our previous template had any matching fields (by property)
      // Basically if we had something like Notes we want to re-apply the data from that instead of clearing it
      if (this.selectedTemplate && this.selectedTemplate.fields &&
          oldTemplate && oldTemplate.fields) {
        for (let i = 0; i < this.selectedTemplate.fields?.length; i++) {
          for (let j = 0; j < oldTemplate.fields.length; j++) {
            if (this.selectedTemplate.fields[i].property === oldTemplate.fields[j].property) {
              this.selectedTemplate.fields[i].value = oldTemplate.fields[j].value;
            }
          }
        }
      }
    }
  }
  
  async submit() {
    if (!this.actOn || !this.actOn.isValid()) {
      Utility.showError('Enter a name for this Thing');
      return;
    }
    
    // Set in our template type and color as well
    this.actOn.applyTemplateTo(this.selectedTemplate);
    
    // If we're editing, which means the Thing already exists, notify the parent as such
    if (this.things.doesThingExist(this.actOn)) {
      this.onEdit.emit(this.actOn);
    }
    
    // Setup our loading progress tracker
    this.uploadLoading = Utility.hasItems(this.uploadList);
    if (this.uploadLoading) {
      this.uploadProgress.set(0);
      this.uploadTotal.set(this.uploadList.length);
    }
    
    this.things.saveThing(this.actOn, {
      uploadList: this.uploadList,
      uploadProgress: this.uploadProgress,
      onSuccess: () => {
        this.uploadLoading = false;
        this.toggleThingDialog();
        
        // Copy and show our public link right after creation for ease
        if (this.actOn.public && this.isAdd()) {
          this.actOn.copyPublicLink(true);
          Utility.showPublicLinkToast(this.actOn);
        }
      }
    });
  }
  
  handleDeleteThing(event: Event): void {
    this.onDelete.emit({ thing: this.actOn, event: event });
  }
  
  handleTemplateEvent(event: any): void {
    this.hide();
    this.manageTemplateEvent.emit(event as TemplateEvent);
  }
  
  handleFocus(inputEl: HTMLElement): void {
    // If we're Editing, try to focus any Notes field, as realistically that's what we'll change most of the time
    // If we can't find a Notes field, try to focus the first field
    if (this.isEdit()) {
      let matchingFields = this.selectedTemplate?.fields?.filter(field => {
        return field?.property?.toLowerCase() === 'notes';
      });
      if (!matchingFields || matchingFields.length === 0) {
        if (this.selectedTemplate && this.selectedTemplate.fields && this.selectedTemplate.fields.length > 0) {
          matchingFields = [this.selectedTemplate.fields[0]];
        }
      }
      
      if (matchingFields && Array.isArray(matchingFields) && matchingFields.length > 0) {
        const noteEle = document.getElementById(matchingFields[0].property);
        if (noteEle) {
          inputEl = noteEle;
        }
      }
    }
    
    if (inputEl) {
      inputEl.focus();
    }
  }

  handleDragEnter(event: any) {
    event.preventDefault();
    this.dragDropCounter++;
    this.dropHighlight = true;
  }
  
  handleDragLeave(event: any) {
    this.dragDropCounter--;
    
    if (this.dragDropCounter <= 0) {
      this.dropHighlight = false;
    }
  }
  
  handleDraggedFiles(event: any) {
    event.preventDefault();
    this.dropHighlight = false;
    this.dragDropCounter = 0;
    
    // Get a list of files depending on our source
    let files = null;
    
    // Drag and drop from something like a file explorer
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      files = event.dataTransfer.files;
    }
    // Native file upload
    else if (event.target && event.target.files && event.target.files.length > 0) {
      files = event.target.files;
    }
    else {
      Utility.showWarn('Unknown drag and drop type requested');
    }
    
    if (files) {
      // Much nicer experience locally or on a fast connection
      // Instead of flashing the loading indicator and changing the dialog size
      //  we instead wait a second to see if the upload will just process
      const localWait = setTimeout(() => {
        this.uploadLoading = true;
        this.uploadProgress.set(0);
        this.uploadTotal.set(files.length);
      }, 1000);
      
      const promises = [];
      for (let i = 0; i < files.length; i++) {
        promises.push(this._readFile(files[i]));
      }
      
      Promise.allSettled(promises).then(res => {
        // Actual upload to the server isn't done until we save this Thing
      }).catch(err => {
        Utility.showError('Failed to upload files');
        console.error(err);
      }).finally(() => {
        if (localWait) {
          clearInterval(localWait);
        }
        this.uploadLoading = false;
        
        // Reset the field so that future onchange events will continue to fire
        (event.target as HTMLInputElement).value = '';
      });
    }
  }
  
  hasUploads(): boolean {
    return this.hasNewUploads() || Utility.hasItems(this.actOn.uploads);
  }
  
  hasNewUploads(): boolean {
    return Utility.hasItems(this.uploadList);
  }
  
  currentGalleryCount(): number {
    let toReturn = 0;
    toReturn += Utility.hasItems(this.uploadList) ? this.uploadList.length : 0;
    toReturn += Utility.hasItems(this.actOn.uploads) ? (this.actOn.uploads as any).length : 0; // Annoyingly getting around TS not detecting hasItems validates array existence
    return toReturn;
  }
  
  getUploadListOfImages(): any[] {
    let toReturn: any[] = [];
    if (this.hasUploads()) {
      if (Utility.hasItems(this.uploadList)) {
        toReturn = toReturn.concat(this.uploadList.filter(upload => upload.type === 'image'));
      }
      if (Utility.hasItems(this.actOn.uploads)) {
        toReturn = toReturn.concat((this.actOn.uploads as any).filter((upload: any) => upload.type === 'image'));
      }
      
    }
    return toReturn;
  }
  
  getUploadListOfFiles(): any[] {
    let toReturn: any[] = [];
    if (this.hasUploads()) {
      if (Utility.hasItems(this.uploadList)) {
        toReturn = toReturn.concat(this.uploadList.filter(upload => upload.type === 'title'));
      }
      if (Utility.hasItems(this.actOn.uploads)) {
        toReturn = toReturn.concat((this.actOn.uploads as any).filter((upload: any) => upload.type === 'title'));
      }
    }
    
    return toReturn;
  }
  
  removeUpload(toRemove: SimpleUpload, fromList: any[]) {
    const removeIndex = fromList?.indexOf(toRemove);
    if (typeof removeIndex === 'number' && removeIndex >= 0) {
      fromList.splice(removeIndex, 1);
    }
  }
  
  makeFullGalleryURL(basePath: string): string {
    return `${window.location.protocol}//${window.location.hostname}:4333/${basePath}`
  }
  
  private _readFile(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (this.isShowing) {
          this._processFile(file, reader.result);
          resolve(null);
        }
        else {
          reject('Dialog closed');
        }
      }
      
      reader.onerror = (e) => {
        reject(e);
      }
      
      // Start our reader based on our file type
      if (Utility.isImage(file.type)) {
        reader.readAsDataURL(file);
      }
      else {
        reader.readAsArrayBuffer(file);
      }
    }).finally(() => {
      this.uploadProgress.update(value => value+1);
    });
  }
  
  private _processFile(file: File, data: string | ArrayBuffer | null) {
    // If we're an image we can just process the content
    if (Utility.isImage(file.type) && data) {
      const image = new Image();
      image.src = data as string;
      
      image.onload = () => {
        // Abort if we're not showing the dialog
        if (!this.isShowing) {
          return;
        }
        
        const width = image.width;
        const height = image.height;
        const needResize = (width > this.imageMaxWidth) || (height > this.imageMaxHeight);
        
        // If we don't need to resize just mark the file for upload
        if (!needResize) {
          return;
        }
        
        // Otherwise scale but maintain the aspect ratio
        let newWidth, newHeight;
        if (width > height) {
          newHeight = height * (this.imageMaxWidth / width);
          newWidth = this.imageMaxWidth;
        }
        else {
          newWidth = width * (this.imageMaxHeight / height);
          newHeight = this.imageMaxHeight;
        }
        
        // Apply to the canvas and send along the scaled result
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const context = canvas.getContext('2d');
        context?.drawImage(image, 0, 0, newWidth, newHeight);
        
        this._addToUploadList({ file: file, name: file.name, data: canvas.toDataURL(file.type), type: 'image' });
      }
      
      image.onerror = (err) => {
        Utility.showError('Error on upload of files');
        console.error(err);
      }
    }
    // Add files to our upload list as they don't need extra processing
    else {
      this._addToUploadList({ file: file, name: file.name, data: file.name, type: 'title' });
    }
  }
  
  private _addToUploadList(toAdd: SimpleUpload): void {
    // If we have an existing file in our upload list with the same name, we remove it so this uploaded version will replace it
    if (Utility.hasItems(this.actOn.uploads) && this.actOn.uploads) {
      for (let i = this.actOn.uploads.length-1; i >= 0; i--) {
        if (toAdd.name === this.actOn.uploads[i].name) {
          this.actOn.uploads.splice(i, 1);
        }
      }
    }
    
    // Also an equally rare case, but uploading the same file without saving
    for (let i = this.uploadList.length-1; i >= 0; i--) {
      if (toAdd.name === this.uploadList[i].name) {
        this.uploadList.splice(i, 1);
      }
    }
    
    this.uploadList.push(toAdd);
  }
}
