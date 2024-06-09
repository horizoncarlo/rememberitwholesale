import { Component, EventEmitter, HostListener, OnDestroy, Output, ViewChild } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { ManageThingDialogComponent } from '../manage-thing-dialog/manage-thing-dialog.component';
import { Thing } from '../model/thing';
import { UserService } from '../service/user.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-quick-view-fields-dialog',
  templateUrl: './quick-view-fields-dialog.component.html',
  styleUrl: './quick-view-fields-dialog.component.css'
})
export class QuickviewFieldsDialogComponent implements OnDestroy {
  // Cast to Dialog instead of this component, so we can set the maximize flag
  @ViewChild('quickviewDialog') quickviewDialog!: Dialog;
  @Output() onDelete = new EventEmitter<{ thing: Thing, event: Event }>();
  
  data: Thing | undefined;
  editDialog?: ManageThingDialogComponent;
  isShowing: boolean = false;
  
  constructor(private userService: UserService) { }
  
  ngOnDestroy(): void {
    Utility.commonDialogDestory();
  }
  
  getHeader(): string {
    if (this.data && this.data.name) {
      return this.data.name + ' - Fields (' + this._getFieldLength(this.data) + ' characters)';
    }
    return "Field Details";
  }
  
  private _getFieldLength(data: Thing): number {
    if (data && data.fieldsAsString && data.hasFieldsAsString()) {
      return data.fieldsAsString.length;
    }
    return 0;
  }
  
  show(data: Thing, editDialog: ManageThingDialogComponent): void {
    // Auto maximize if we're on mobile or have the setting
    // Unless of course our incoming data is super small
    if (Utility.isMobileSize() ||
        (this.userService.getUser().maximizeDialogs &&
         this._getFieldLength(data) > 200)) {
      this.quickviewDialog.maximized = true;
    }
    
    this.data = data;
    this.editDialog = editDialog;
    this.isShowing = true;
    Utility.commonDialogShow();
  }
  
  @HostListener('window:popstate', ['$event'])
  hide(): void {
    this.isShowing = false;
  }
  
  handleDeleteThing(event: Event): void {
    if (this.data) {
      this.hide();
      this.onDelete.emit({ thing: this.data, event: event });
    }
  }
  
  edit(): void {
    if (this.editDialog && this.data) {
      this.hide();
      this.editDialog.showEdit([this.data]);
    }
  }
  
  copy(): void {
    if (this.data && this._getFieldLength(this.data) > 0) {
      Utility.copyToClipboard(this.data.convertFieldsToString({ noLabels: true })).then(res => {
        Utility.showSuccess('Copied fields to your clipboard');
      }).catch(err => {
        Utility.showError('Failed to copy the fields to your clipboard');
        console.error(err);
      });
    }
  }
  
  submit(): void {
    this.hide();
  }
}
