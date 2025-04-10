import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { StorageService } from '../service/storage.service';
import { Utility } from '../util/utility';

@Component({
  standalone: true,
  selector: 'riw-new-account-dialog',
  templateUrl: './new-account-dialog.component.html',
  styleUrl: './new-account-dialog.component.css',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DialogModule,
  ]
})
export class NewAccountDialogComponent {
  @Output() onHide = new EventEmitter<null>();
  
  processing: boolean = false;
  isShowing: boolean = false;
  username: string = '';
  email: string = '';
  note: string | undefined;
  
  constructor(private storageService: StorageService) { }
  
  show(e: any): void {
    e.preventDefault();
    
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
    this.onHide.emit();
  }
  
  submit(): void {
    if (!Utility.isValidString(this.username) ||
        !Utility.isValidString(this.email)) {
      Utility.showError('Username and Email are required');
      return;
    }
    
    this.processing = true;
    this.storageService.requestNewAccount(this.username, this.email, this.note).subscribe({
      next: res => {
        Utility.showInfoSticky("I'll email you at '" + this.email + "' as soon as possible with your new account details", "Request Sent");
      },
      error: err => {
        if (err && typeof err.status === 'number' &&
            err.status === 429) {
          Utility.showError('Too many new account requests, try again later');
        }
        else {
          Utility.showError("Failed to send the email requesting your new account, try again later");
        }
        console.error(err);
      }
    }).add(() => this.processing = false);
  }
}
