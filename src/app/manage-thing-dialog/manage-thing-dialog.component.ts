import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Template, TemplateEvent } from '../model/template';
import { TemplateField } from '../model/template-field';
import { Thing } from '../model/thing';
import { TemplateService } from '../service/template.service';
import { ThingService } from '../service/thing.service';
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
  isShowing: boolean = false;
  fieldTypes = TemplateField.TYPES;
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
    this.selectedTemplate = this.templateService.getFirstDefaultTemplate();
    
    this.isShowing = true;
  }
  
  showEdit(selectedRows: Thing[]) {
    if (Utility.hasItems(selectedRows)) {
      this.type = 'edit';
      this.actOn = Thing.cloneFrom(selectedRows[0]);
      const template = this.templateService.getTemplateByName(this.actOn.templateType);
      if (template) {
        this.selectedTemplate = Template.cloneFrom(template);
        this.selectedTemplate.fields = this.actOn.fields;
      }
      
      this.isShowing = true;
    }
    else {
      Utility.showWarn('Select a Thing row to edit');
    }
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  toggleThingDialog(): void {
    this.isShowing ? this.hide() : this.showAdd();
  }
  
  submit(): void {
    if (!this.actOn || !this.actOn.isValid()) {
      Utility.showError('Enter a name for this Thing');
      return;
    }
    
    // Set in our template type and color as well
    this.actOn.applyTemplateTo(this.selectedTemplate);
    
    // Store the template fields into the Thing as well
    if (this.selectedTemplate?.fields) {
      this.actOn.fields = this.selectedTemplate?.fields;
    }
    
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
