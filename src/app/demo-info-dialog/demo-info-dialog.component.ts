import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Dialog, DialogModule } from 'primeng/dialog';
import { Utility } from '../util/utility';

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
  // Cast to Dialog instead of this component, so we can set the maximize flag
  @ViewChild('demoInfoDialog') demoInfoDialog!: Dialog;
  
  isShowing: boolean = false;
  
  constructor(private router: Router) { }
  
  show(): void {
    // Auto maximize if we're on mobile, because we've got a lot of text
    if (Utility.isMobileSize()) {
      this.demoInfoDialog.maximized = true;
    }
    
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
