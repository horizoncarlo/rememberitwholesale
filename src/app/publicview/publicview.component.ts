import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Thing } from '../model/thing';
import { AuthService } from '../service/auth.service';
import { PublicService } from '../service/public.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-publicview',
  templateUrl: './publicview.component.html',
  styleUrl: './publicview.component.css'
})
export class PublicviewComponent implements OnDestroy {
  private _thing_sub: Subscription;
  
  loading: boolean = true;
  hasError: boolean = false;
  thing: Thing | null = null;
  
  constructor(public publicService: PublicService,
              public authService: AuthService,
              private router: Router) {
    this._thing_sub = this.publicService.thing$.subscribe({
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
  
  ngOnDestroy(): void {
    if (this._thing_sub) {
      this._thing_sub.unsubscribe();
    }
  }  
  
  isMobileSize(): boolean {
    return Utility.isMobileSize();
  }
  
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
