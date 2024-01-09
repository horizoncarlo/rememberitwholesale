import { Component } from '@angular/core';
import { UserSettings } from '../model/user-settings';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/user.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-user-profile-dialog',
  templateUrl: './user-profile-dialog.component.html',
  styleUrls: ['./user-profile-dialog.component.css']
})
export class UserProfileDialogComponent {
  isShowing: boolean = false;
  settings: UserSettings = new UserSettings();
  
  constructor(public authService: AuthService, private userService: UserService) { }
  
  show(): void {
    // Refresh our settings from our most recent actual object
    // Note we don't directly use our settings since we want to have the option to Cancel/Save
    //  whereas the user settings auto-save on change
    this.settings = UserSettings.cloneFrom(this.userService.getUser());
    
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  submit(): void {
    // TODO Make forceDial apply dynamically on change here, currently have to refresh the browser
    this.userService.data$.next(this.settings);
    Utility.showSuccess('Successfully saved your profile');
    Utility.fireWindowResize();
    
    this.hide();
  }
}
