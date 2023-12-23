import { Component } from '@angular/core';
import { FieldsetModule } from 'primeng/fieldset';
import { TypingHeaderComponent } from '../typing-header/typing-header.component';

@Component({
  standalone: true,
  selector: 'riw-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [
    FieldsetModule,
    TypingHeaderComponent
  ],
})
export class LoginComponent {
}