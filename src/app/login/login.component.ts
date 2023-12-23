import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from "@angular/router";
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UserService } from '../service/user.service';
import { TypingHeaderComponent } from '../typing-header/typing-header.component';
import { Utility } from '../util/utility';

@Component({
  standalone: true,
  selector: 'riw-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [
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
  
  username: string | null = null;
  password: string | null = null;
  processing: boolean = false;
  
  constructor(private router: Router, private userService: UserService) { }
  
  submitLogin(): void {
    let abort = false;
    this.usernameIn.nativeElement.style.outline = 'none';
    this.passwordIn.nativeElement.style.outline = 'none';
    if (!Utility.isValidString(this.username)) {
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
    
    // TODO PRIORITY QUIDEL - For now do a fake hardcoded login to test the process
    this.processing = true;
    setTimeout(() => {
      this.processing = false;
      
      if (this.username === 'cgug' && this.password === 'test') {
        this.userService.getUser().isLoggedIn = true;
        this.router.navigate(['/']);
      }
      else {
        this.markUsernameInvalid();
        this.markPasswordInvalid();
        Utility.showError('Invalid login');
      }
    }, Utility.getRandomInt(800, 1300));
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