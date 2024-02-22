import { Component, ViewChild } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Thing } from '../model/thing';
import { UserService } from '../service/user.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-quick-view-fields-dialog',
  templateUrl: './quick-view-fields-dialog.component.html',
  styleUrl: './quick-view-fields-dialog.component.css'
})
export class QuickviewFieldsDialogComponent {
  // Cast to Dialog instead of this component, so we can set the maximize flag
  @ViewChild('quickviewDialog') quickviewDialog!: Dialog;
  
  data: Thing | undefined;
  isShowing: boolean = false;
  
  constructor(private userService: UserService) { }
  
  getHeader(): string {
    if (this.data && this.data.name) {
      return this.data.name + ' - Fields (' + this._getFieldLength(this.data) + ' characters)';
    }
    return "Field Details";
  }
  
  private _getFieldLength(data: Thing): number {
    if (data && data.fieldsAsString &&
        Utility.isValidString(data.fieldsAsString)) {
      return data.fieldsAsString.length;
    }
    return 0;
  }
  
  show(data: Thing): void {
    // Auto maximize if we're on mobile or have the setting
    // Unless of course our incoming data is super small
    if (Utility.isMobileSize() ||
        (this.userService.getUser().maximizeDialogs &&
         this._getFieldLength(data) > 200)) {
      this.quickviewDialog.maximized = true;
    }
    
    this.data = data;
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  submit(): void {
    this.hide();
  }
}
