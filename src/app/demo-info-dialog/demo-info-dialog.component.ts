import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'riw-demo-info-dialog',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
  ],
  templateUrl: './demo-info-dialog.component.html',
  styleUrl: './demo-info-dialog.component.css'
})
export class DemoInfoDialogComponent {
  isShowing: boolean = false;
  
  constructor(private router: Router) { }
  
  show(): void {
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  submit(): void {
    this.hide();
    this.router.navigate(['/']);
  }
}
