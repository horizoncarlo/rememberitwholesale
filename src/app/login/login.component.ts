import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from "@angular/router";
import { CheckboxModule } from 'primeng/checkbox';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../service/auth.service';
import { StorageService } from '../service/storage.service';
import { TypingHeaderComponent } from '../typing-header/typing-header.component';
import { Utility } from '../util/utility';

@Component({
  standalone: true,
  selector: 'riw-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [
    CheckboxModule,
    FieldsetModule,
    FormsModule,
    InputTextModule,
    ProgressSpinnerModule,
    TypingHeaderComponent
  ],
})
export class LoginComponent {
  @ViewChild('usernameIn') usernameIn!: ElementRef;
  @ViewChild('passwordIn') passwordIn!: ElementRef;
  
  password: string | null = null;
  saveLogin: boolean = true;
  processing: boolean = false;
  
  constructor(private router: Router, private storageService: StorageService,
              public authService: AuthService) { }
  
  submitLogin(): void {
    let abort = false;
    this.usernameIn.nativeElement.style.outline = 'none';
    this.passwordIn.nativeElement.style.outline = 'none';
    if (!Utility.isValidString(this.authService.getAuth().username)) {
      this.markUsernameInvalid();
      abort = true;
    }
    if (!Utility.isValidString(this.password)) {
      this.markPasswordInvalid();
      abort = true;
    }
    if (abort) {
      return;
    }
    
    this.processing = true;
    this.storageService.submitLogin(this.authService.getAuth().username as string, this.password as string, this.saveLogin).subscribe({
      next: res => {
        if (res && res.authToken) {
          console.log("Logged in with authToken=" + res.authToken);
          
          this.authService.getAuth().setLoggedIn(res.authToken, res.password);
          this.router.navigate(['/']);
        }
      },
      error: err => {
        this.markUsernameInvalid();
        this.markPasswordInvalid();
        Utility.showError('Invalid login');
      }
    }).add(() => this.processing = false);
  }
  
  resetField(toClear: HTMLInputElement): void {
    if (toClear) {
      toClear.value = '';
      toClear.focus();
    }
  }
  
  requestNewAccount(e: any): void {
    // TODO QUIDEL - Need to open a dialog here instead, so the user can enter a desired username and an email to get back to them and a note
    Utility.showWarn('Still working on this', 'Feature coming soon');
    
    const username = 'test-new-account';
    const email = 'test@gmail.com';
    const note = 'Hey dude it is me, your friend';
    
    e.preventDefault();
    this.processing = true;
    this.storageService.requestNewAccount(username, email, note).subscribe({
      next: res => {
        Utility.showInfoSticky("I'll email you at '" + email + "' as soon as possible with your new account details", "Request Sent");
      },
      error: err => {
        Utility.showError("Failed to send the email requesting your new account, try again later");
        console.error(err);
      }
    }).add(() => this.processing = false);
  }
  
  markUsernameInvalid(): void {
    this._markFieldInvalid(this.usernameIn);
  }
  
  markPasswordInvalid(): void {
    this._markFieldInvalid(this.passwordIn);
  }
  
  private _markFieldInvalid(ele: ElementRef): void {
    ele.nativeElement.style.outline = '1px solid red';
  }
}