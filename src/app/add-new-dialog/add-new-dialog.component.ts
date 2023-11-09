import { Component, inject } from '@angular/core';
import { Template } from '../model/template';
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
  show: boolean = false;
  
  toggleAddNewDialog(): void {
    this.show = !this.show;
    
    // If we're just opening the dialog, reset our state
    if (this.show) {
      this.toAdd = new Thing('');
      this.selectedTemplate = new Template(TemplateService.getMilestoneName());
    }
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
  
  handleFocus(event: any, inputEl: HTMLElement) {
    if (inputEl) {
      inputEl.focus();
    }
  }
  
  handleEnterKey(toCall: Function) {
    if (toCall) {
      toCall();
    }
  }
}
