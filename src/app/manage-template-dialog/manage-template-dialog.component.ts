import { Component } from '@angular/core';
import { TemplateEvent } from '../model/template';

@Component({
  selector: 'riw-manage-template-dialog',
  templateUrl: './manage-template-dialog.component.html',
  styleUrls: ['./manage-template-dialog.component.css']
})
export class ManageTemplateDialogComponent {
  operation: TemplateEvent['type'] = 'create';
  isShowing: boolean = false;
  
  show(event?: any): void {
    if (event) {
      // TODO Parse event to set the initial state of our dialog
      event = event as TemplateEvent;
      this.operation = event.type;
    }
    
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  toggleCreateTemplateDialog(): void {
    this.isShowing ? this.hide() : this.show();
  }
}
