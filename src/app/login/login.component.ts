import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from "@angular/router";
import { CheckboxModule } from 'primeng/checkbox';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StorageService } from '../service/storage.service';
import { UserService } from '../service/user.service';
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
  
  userService!: UserService;
  password: string | null = null;
  saveLogin: boolean = true;
  processing: boolean = false;
  
  constructor(private router: Router, private storageService: StorageService,
              private incomingUserService: UserService) {
    this.userService = incomingUserService;
  }
  
  submitLogin(): void {
    let abort = false;
    this.usernameIn.nativeElement.style.outline = 'none';
    this.passwordIn.nativeElement.style.outline = 'none';
    if (!Utility.isValidString(this.userService.getAuth().username)) {
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
    this.storageService.submitLogin(this.userService.getAuth().username as string, this.password as string, this.saveLogin).subscribe({
      next: res => {
        if (res && res.authToken) {
          console.log("Logged in with authToken=" + res.authToken);
          
          this.userService.getAuth().setLoggedIn(res.authToken, this.saveLogin);
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