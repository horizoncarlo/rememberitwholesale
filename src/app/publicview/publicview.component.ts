import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Thing } from '../model/thing';
import { AuthService } from '../service/auth.service';
import { PublicService } from '../service/public.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-publicview',
  templateUrl: './publicview.component.html',
  styleUrl: './publicview.component.css'
})
export class PublicviewComponent {
  loading: boolean = true;
  hasError: boolean = false;
  thing: Thing | null = null;
  
  constructor(public publicService: PublicService,
              public authService: AuthService,
              private router: Router) {
    this.publicService.thing$.subscribe({
      next: thing => {
        if (thing) {
          this.loading = false;
          this.thing = thing;
        }
      },
      error: err => {
        console.error(err);
        
        this.loading = false;
        this.hasError = true;
      }
    });
  }
  
  isMobileSize(): boolean {
    return Utility.isMobileSize();
  }
  
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
