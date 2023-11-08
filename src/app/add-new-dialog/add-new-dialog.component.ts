import { Component, inject } from '@angular/core';
import { Thing } from '../model/thing';
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
  show: boolean = false;
  
  toggleAddNewDialog(): void {
    this.show = !this.show;
    
    // If we're just opening the dialog, reset our state
    if (this.show) {
      this.toAdd = new Thing('');
    }
  }
  
  submitAddNew(): void {
    if (!this.toAdd || !this.toAdd.isValid()) {
      Utility.showError('Enter a name for this Thing');
      return;
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
