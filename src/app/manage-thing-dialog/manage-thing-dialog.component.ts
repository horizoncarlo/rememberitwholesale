import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Template, TemplateEvent } from '../model/template';
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
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  
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
      console.error("EDIT", this.actOn);
      //this.selectedTemplate = new Template(this.actOn.templateType, 'inherit', this.actOn.fields);
      const template = this.templateService.getTemplateByName(this.actOn.templateType);
      if (template) {
        this.selectedTemplate = Template.cloneFrom(template);
        this.selectedTemplate.fields = this.actOn.fields;
      }
      
      // this.selectedTemplate = this.templateService.getTemplateByName(this.toAdd.templateType);
      // if (this.selectedTemplate) {
      //   this.selectedTemplate.fields = this.toAdd.fields;
      // }
      
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
    
    this.things.saveThing(this.actOn);
    this.toggleThingDialog(); // Close our dialog
  }
  
  handleTemplateEvent(event: any): void {
    this.hide();
    this.manageTemplateEvent.emit(event as TemplateEvent);
  }
  
  handleFocus(event: Event, inputEl: HTMLElement): void {
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
