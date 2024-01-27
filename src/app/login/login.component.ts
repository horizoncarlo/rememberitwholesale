import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from "@angular/router";
import { CheckboxModule } from 'primeng/checkbox';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DemoInfoDialogComponent } from '../demo-info-dialog/demo-info-dialog.component';
import { NewAccountDialogComponent } from '../new-account-dialog/new-account-dialog.component';
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
    DemoInfoDialogComponent,
    NewAccountDialogComponent,
    ProgressSpinnerModule,
    TypingHeaderComponent,
  ],
})
export class LoginComponent {
  @ViewChild('usernameIn') usernameIn!: ElementRef;
  @ViewChild('passwordIn') passwordIn!: ElementRef;
  @ViewChild('newAccount') newAccountDialog!: NewAccountDialogComponent;
  @ViewChild('demoInfo') demoInfoDialog!: DemoInfoDialogComponent;
  
  password: string | null = null;
  saveLogin: boolean = true;
  processing: boolean = false;
  
  constructor(private router: Router, private storageService: StorageService,
              public authService: AuthService) { }
  
  submitLogin(): void {
    // If we're already processing just chill
    if (this.processing) {
      return;
    }
    
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
          console.log("Logged in with authToken");
          
          this.authService.getAuth().setLoggedIn(res.authToken, res.password);
          this.router.navigate(['/']);
        }
      },
      error: err => {
        if (err && typeof err.status === 'number' &&
            err.status === 429) {
          Utility.showError('Too many login attempts, try again later');
        }
        else {
          this.markUsernameInvalid();
          this.markPasswordInvalid();
          Utility.showError('Invalid login');
        }
      }
    }).add(() => this.processing = false);
  }
  
  tryDemoMode(e: any): void {
    if (this.processing) {
      return;
    }
    
    this.processing = true;
    this.storageService.startDemo().subscribe({
      next: res => {
        if (res && res.authToken) {
          console.log("Started a demo");
          
          const ourAuth = this.authService.getAuth();
          ourAuth.isDemoAccount = true;
          ourAuth.username = res.username;
          ourAuth.setLoggedIn(res.authToken, res.password);
          
          // Show a dialog to inform the user about the demo
          this.demoInfoDialog.show();
        }
      },
      error: err => {
        if (err && typeof err.status === 'number' &&
            err.status === 429) {
          Utility.showError("You've had too many demos for today, try again later");
        }
        else {
          Utility.showError("Error trying to setup a demo, try again later");
        }
      }
    }).add(() => this.processing = false);
    
    e.preventDefault();
  }
  
  resetField(toClear: HTMLInputElement): void {
    if (toClear) {
      toClear.value = '';
      toClear.focus();
    }
  }
  
  handleFocus(inputEl: HTMLElement): void {
    if (inputEl) {
      inputEl.focus();
    }
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