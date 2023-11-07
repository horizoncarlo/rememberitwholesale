import { Component } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Thing } from '../model/thing';

@Component({
  selector: 'add-new-dialog',
  templateUrl: './add-new-dialog.component.html',
  styleUrls: ['./add-new-dialog.component.css']
})
export class AddNewDialogComponent {
  toAdd: Thing = new Thing(uuidv4(), '');
  show: boolean = false;
  
  toggleAddNewDialog(): void {
    this.show = !this.show;
  }
  
  submitAddNew(): void {
    console.log("ADD NEW", this.toAdd);
  }
  
  handleFocus(event: any, inputEl: HTMLElement) {
    if (inputEl) {
      inputEl.focus();
    }
  }
}
