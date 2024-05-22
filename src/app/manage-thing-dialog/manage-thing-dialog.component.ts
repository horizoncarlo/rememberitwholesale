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

@Component({
  selector: 'riw-manage-thing-dialog',
  templateUrl: './manage-thing-dialog.component.html',
  styleUrls: ['./manage-thing-dialog.component.css']
})
export class ManageThingDialogComponent implements OnDestroy {
  type: 'add' | 'edit' = 'add';
  actOn: Thing = new Thing('');
  selectedTemplate: Template | null = null;
  selectedTemplateName: string | null = null;
  isShowing: boolean = false;
  fieldTypes = TemplateField.TYPES;
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
    if (this.actOn) {
      if (this.actOn.public) {
        this.actOn.generatePublicLink();
        this.actOn.copyPublicLink();
      }
      else {
        this.actOn.clearPublicLink();
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
}
