import { Component, EventEmitter, Output } from '@angular/core';
import { UserSettings } from '../model/user-settings';
import { AuthService } from '../service/auth.service';
import { StorageService } from '../service/storage.service';
import { UserService } from '../service/user.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-user-profile-dialog',
  templateUrl: './user-profile-dialog.component.html',
  styleUrls: ['./user-profile-dialog.component.css']
})
export class UserProfileDialogComponent {
  @Output() onDialChanged = new EventEmitter<boolean>();
  isShowing: boolean = false;
  settings: UserSettings = new UserSettings();
  currentPassword: string = '';
  newPassword: string = '';
  
  constructor(public authService: AuthService,
              public storageService: StorageService,
              private userService: UserService) { }
  
  show(): void {
    // Refresh our settings from our most recent actual object
    // Note we don't directly use our settings since we want to have the option to Cancel/Save
    //  whereas the user settings auto-save on change
    this.settings = UserSettings.cloneFrom(this.userService.getUser());
    
    // Clear our passwords
    this.resetPasswordFields();
    
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  getSpeedDialLabel(): string {
    let message = 'Use speed dial instead of toolbar';
    if (Utility.isMobileSize()) {
      message += ' (Desktop only)';
    }
    return message;
  }
  
  resetPasswordFields(): void {
    this.currentPassword = '';
    this.newPassword = '';
  }
  
  changePassword(): void {
    if (!Utility.isValidString(this.currentPassword)) {
      Utility.showError('Missing current password');
      return;
    }
    if (!Utility.isValidString(this.newPassword)) {
      Utility.showError('Missing new password');
      return;
    }
    if (this.currentPassword === this.newPassword) {
      Utility.showWarn('Passwords are the same');
      return;
    }
    
    this.storageService.changePassword(this.authService.getAuth().username as string, this.currentPassword, this.newPassword).subscribe({
      next: res => {
        this.authService.getAuth().setLoggedIn(res.authToken, this.authService.getAuth().saveLogin ? res.password : null);
        
        Utility.showSuccess('Successfully changed your password');
        this.resetPasswordFields();
        this.hide();
      },
      error: err => {
        Utility.showError('Failed to change your password - is your Current Password correct?');
        console.error(err);
      }
    });
  }
  
  submit(): void {
    // Fire an event if the dial changed, as we might want to trigger off that
    if (this.settings.forceDial !== this.userService.getUser().forceDial) {
      this.onDialChanged.emit(this.settings.forceDial);
    }
    
    this.userService.data$.next(this.settings);
    Utility.showSuccess('Successfully saved your profile');
    Utility.fireWindowResize();
    
    this.hide();
  }
}
