import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { UserService } from '../service/user.service';

export const LoginGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const isLoggedIn = inject(UserService).getUser().isLoggedIn;
  
  // Two cases: we're logged in and can go wherever, or we're not and are forced to the login page
  if (state.url === '/login') {
    if (isLoggedIn) {
      return inject(Router).navigate(['/']);
    }
  }
  else if (!isLoggedIn) {
    return inject(Router).navigate(['/login']);
  }
  return true;
};
