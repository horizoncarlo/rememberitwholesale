import { Component, EventEmitter, HostListener, OnDestroy, Output, ViewChild } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Template, TemplateEvent } from '../model/template';
import { TemplateField } from '../model/template-field';
import { Thing } from '../model/thing';
import { TemplateService } from '../service/template.service';
import { ThingService } from '../service/thing.service';
import { UserService } from '../service/user.service';
import { TemplateDropdownComponent } from '../template-dropdown/template-dropdown.component';
import { Utility } from '../util/utility';

interface SimpleUpload { data: string, type: 'image' | 'title' };

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
  private dragDropCounter: number = 0; // Since dragleave fires when mousing over child elements, we track our drag enter vs leave counter and change our highlight based on that
  @ViewChild('manageThingDialog') manageThingDialog!: Dialog;
  @ViewChild('templateDropdown') templateDropdown!: TemplateDropdownComponent;
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  @Output() onDelete = new EventEmitter<{ thing: Thing, event: Event }>();
  @Output() onEdit = new EventEmitter<Thing>();
  
  constructor(public things: ThingService,
              public templateService: TemplateService,
              public userService: UserService) { }
  
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
    
    this.hasShownPublicNote = false;
    this.isShowing = true;
    Utility.commonDialogShow();
  }
  
  @HostListener('window:popstate', ['$event'])
  hide(): void {
    this.isShowing = false;
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
  
  submit(): void {
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
    
    this.things.saveThing(this.actOn);
    this.toggleThingDialog(); // Close our dialog
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
      this.uploadLoading = true;
      
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
        this.uploadLoading = false;
        
        // Reset the field so that future onchange events will continue to fire
        (event.target as HTMLInputElement).value = '';
      });
    }
  }
  
  hasUploads(): boolean {
    return Utility.hasItems(this.uploadList);
  }
  
  getUploadListOfImages(): SimpleUpload[] {
    if (this.hasUploads()) {
      return this.uploadList.filter(upload => upload.type === 'image');
    }
    return [];
  }
  
  getUploadListOfFiles(): SimpleUpload[] {
    if (this.hasUploads()) {
      return this.uploadList.filter(upload => upload.type === 'title');
    }
    return [];
  }
  
  removeUpload(toRemove: SimpleUpload) {
    const removeIndex = this.uploadList?.indexOf(toRemove);
    if (typeof removeIndex === 'number' && removeIndex >= 0) {
      this.uploadList.splice(removeIndex, 1);
    }
  }
  
  private _readFile(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        this._processFile(file, reader.result);
        resolve(null);
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
    });
  }
  
  private _processFile(file: File, data: string | ArrayBuffer | null) {
    // If weren't not an image we can just send the file along right away
    if (!Utility.isImage(file.type)) {
      this._sendFile(file, data);
      return;
    }
    // Otherwise determine if we need to resize the image
    else if (data) {
      const image = new Image();
      image.src = data as string;
      
      image.onload = () => {
        const width = image.width;
        const height = image.height;
        const needResize = (width > this.imageMaxWidth) || (height > this.imageMaxHeight);
        
        // If we don't need to resize just send along the file
        if (!needResize) {
          this._sendFile(file, data);
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
        
        this._sendFile(file, canvas.toDataURL(file.type));
      }
      
      image.onerror = (err) => {
        Utility.showError('Error on upload of files');
        console.error(err);
      }
    }
  }
  
  private _sendFile(file: File, data: string | ArrayBuffer | null) {
    // TTODO Need to change this call to be done on Save of thing, and actually send and receive on the server
    if (Utility.isImage(file.type)) {
      console.error("DATA", data);
      this.uploadList.push({ data: data as string, type: 'image' });
      // TTODO
      // const img = document.createElement('img');
      // img.classList.add('preview-image');
      // img.src = data as string;
      // document.getElementById('preview').appendChild(img);
    }
    else {
      console.error("DATA of file", file.name);
      this.uploadList.push({ data: file.name, type: 'title' });
      // TTODO
      // const text = document.createElement('div');
      // text.innerText = file.name + ' (' + (file.size/1000).toFixed(1) + 'kb)';
      // document.getElementById('preview').appendChild(text);
    }
    
    console.log("Would send file of size", file.size);
    return;
    
    /*
    var formData = new FormData();
  
    formData.append('imageData', fileData);
  
    $.ajax({
      type: 'POST',
      url: '/your/upload/url',
      data: formData,
      contentType: false,
      processData: false,
      success: function (data) {
        if (data.success) {
          alert('Your file was successfully uploaded!');
        } else {
          alert('There was an error uploading your file!');
        }
      },
      error: function (data) {
        alert('There was an error uploading your file!');
      }
    });
    */
    
    /*
    // TODO: On NodeJS side
    server.on('request', (req, res) => {
  
    if(req.url === '/' && req.method == 'GET') {
        return res.end(fs.readFileSync(__dirname + '/index.html'))
    }
  
    if(req.url=== '/upload' && req.method == 'POST') {
        const query = new URLSearchParams(req.url);
            const fileName = query.get(‘/upload?fileName’);
  
        req.on('data', chunk => {
            fs.appendFileSync(fileName, chunk); // append to a file on the disk
        })
  
  
        return res.end('Yay! File is uploaded.')
    }
    })
    */
  }
}

