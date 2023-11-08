import { Component, inject } from '@angular/core';
import { Thing } from '../model/thing';
import { ThingService } from '../service/thing.service';

@Component({
  selector: 'add-new-dialog',
  templateUrl: './add-new-dialog.component.html',
  styleUrls: ['./add-new-dialog.component.css']
})
export class AddNewDialogComponent {
  things: ThingService = inject(ThingService);
  toAdd: Thing = new Thing('');
  show: boolean = false;
  
  toggleAddNewDialog(): void {
    this.show = !this.show;
  }
  
  submitAddNew(): void {
    this.things.saveNew(this.toAdd);
    console.log("ADD NEW", this.toAdd);
  }
  
  handleFocus(event: any, inputEl: HTMLElement) {
    if (inputEl) {
      inputEl.focus();
    }
  }
}
