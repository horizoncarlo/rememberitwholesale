import { Component, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { Template, TemplateEvent } from '../model/template';
import { TemplateField } from '../model/template-field';
import { Thing } from '../model/thing';
import { TemplateService } from '../service/template.service';
import { ThingService } from '../service/thing.service';
import { TemplateDropdownComponent } from '../template-dropdown/template-dropdown.component';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-manage-thing-dialog',
  templateUrl: './manage-thing-dialog.component.html',
  styleUrls: ['./manage-thing-dialog.component.css']
})
export class ManageThingDialogComponent {
  type: 'add' | 'edit' = 'add';
  things: ThingService = inject(ThingService);
  templateService: TemplateService = inject(TemplateService);
  actOn: Thing = new Thing('');
  selectedTemplate: Template | null = null;
  selectedTemplateName: string | null = null;
  isShowing: boolean = false;
  fieldTypes = TemplateField.TYPES;
  @ViewChild('templateDropdown') templateDropdown!: TemplateDropdownComponent;
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  @Output() onDelete = new EventEmitter<{ thing: Thing, event: Event }>();
  @Output() onEdit = new EventEmitter<Thing>();
  
  isAdd(): boolean {
    return this.type === 'add';
  }
  
  isEdit(): boolean {
    return this.type === 'edit';
  }
  
  showAdd(): void {
    this.type = 'add';
    // Reset our state as well
    this.actOn = new Thing('');
    
    const defaultTemplate = this.templateService.getFirstDefaultTemplate();
    this.templateNameChanged(defaultTemplate ? defaultTemplate.name : null);
    
    this.show();
  }
  
  showEdit(selectedRows: Thing[]) {
    if (Utility.hasItems(selectedRows)) {
      this.type = 'edit';
      this.actOn = Thing.cloneFrom(selectedRows[0]);
      this.selectedTemplateName = this.actOn.templateType;
      this.templateNameChanged(this.selectedTemplateName);
      
      this.show();
    }
    else {
      Utility.showWarn('Select a Thing row to edit');
    }
  }
  
  show(): void {
    this.templateDropdown.refreshData();
    
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  toggleThingDialog(): void {
    this.isShowing ? this.hide() : this.showAdd();
  }
  
  shouldWrapReminder(): boolean {
    return Utility.isMobileSize();
  }
  
  reminderCheckboxChanged() : void {
    if (this.actOn && this.actOn.reminder && !this.actOn.timeInFuture()) {
      Utility.showInfo('Normally Reminders are in the future');
    }
  }
  
  templateNameChanged(newName: string | null): void {
    this.selectedTemplateName = newName;
    this.selectedTemplate = this.templateService.getTemplateByName(this.selectedTemplateName);
    
    // Clone if we found a template, so that we can make changes without affecting the actual template
    if (this.selectedTemplate) {
      this.selectedTemplate = Template.cloneFrom(this.selectedTemplate);
      
      // Apply any saved fields to our template
      // Of course only for editing
      if (this.isEdit() && this.actOn.fields) {
        this.selectedTemplate.fields = this.actOn.fields;
      }
      // Otherwise reset our fields
      else {
        this.selectedTemplate.clearValuesFromFields();
      }
      
      // Apply our initial reminder state if we have it
      // Note if we've manually set reminder, we won't overwrite that
      if (!this.actOn.reminder) {
        this.actOn.reminder = this.selectedTemplate.initialReminder;
      }
    }
  }
  
  submit(): void {
    if (!this.actOn || !this.actOn.isValid()) {
      Utility.showError('Enter a name for this Thing');
      return;
    }
    
    // Set in our template type and color as well
    // TODO This should probably be in thing.prepareForSave so it's done in a consistent way and not manually
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
    if (inputEl) {
      inputEl.focus();
    }
  }
  
  handleEnterKey(toCall: Function): void {
    if (toCall) {
      toCall();
    }
  }
}
