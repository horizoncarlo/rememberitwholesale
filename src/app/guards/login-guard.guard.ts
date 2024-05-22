import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { PUBLIC_THING_PARAM } from '../model/thing';
import { AuthService } from '../service/auth.service';
import { PublicService } from '../service/public.service';
import { Utility } from '../util/utility';

export const LoginGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  // Determine if we have a public Thing we're trying to access
  // In which case we load JUST that, and don't do any login hassle
  const toLoadId = (route.queryParams && Utility.isValidString(route.queryParams[PUBLIC_THING_PARAM])) ?
    route.queryParams[PUBLIC_THING_PARAM] : null;
  if (toLoadId) {
    inject(PublicService).loadPublicThing(toLoadId);
    
    if (!state.url.startsWith('/public')) {
      return inject(Router).navigate(['/public'], { queryParams: route.queryParams });
    }
  }
  
  // Allow access to the public page
  if (state.url.startsWith('/public')) {
    return true;
  }
  
  // Otherwise two cases: we're logged in and can go wherever, or we're not and are forced to the login page
  const isLoggedIn = inject(AuthService).getAuth().isLoggedIn;
  if (state.url.startsWith('/login')) {
    if (isLoggedIn) {
      return inject(Router).navigate(['/']);
    }
  }
  else if (!isLoggedIn) {
    return inject(Router).navigate(['/login']);
  }
  return true;
};
