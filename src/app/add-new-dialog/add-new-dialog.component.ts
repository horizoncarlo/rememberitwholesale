import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Template, TemplateEvent } from '../model/template';
import { Thing } from '../model/thing';
import { TemplateService } from '../service/template.service';
import { ThingService } from '../service/thing.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-add-new-dialog',
  templateUrl: './add-new-dialog.component.html',
  styleUrls: ['./add-new-dialog.component.css']
})
export class AddNewDialogComponent {
  things: ThingService = inject(ThingService);
  toAdd: Thing = new Thing('');
  selectedTemplate: Template | null = null;
  isShowing: boolean = false;
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  
  show(): void {
    this.isShowing = true;
    
    // Reset our state as well
    this.toAdd = new Thing('');
    this.selectedTemplate = new Template(TemplateService.getDefaultName());
  }
  
  hide(): void { 
    this.isShowing = false;
  }
  
  toggleAddNewDialog(): void {
    this.isShowing ? this.hide() : this.show();
  }
  
  submitAddNew(): void {
    if (!this.toAdd || !this.toAdd.isValid()) {
      Utility.showError('Enter a name for this Thing');
      return;
    }
    
    // Set in our template type as well
    this.toAdd.templateType = this.selectedTemplate?.name as string;
    
    // Store the template fields into the Thing as well
    if (this.selectedTemplate?.fields) {
      this.toAdd.fields = this.selectedTemplate?.fields;
    }
    
    this.things.saveNew(this.toAdd);
    this.toggleAddNewDialog(); // Close our dialog
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
