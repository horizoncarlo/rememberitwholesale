import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { PUBLIC_THING_PARAM, PUBLIC_USER_PARAM } from '../model/thing';
import { AuthService } from '../service/auth.service';
import { PublicService } from '../service/public.service';
import { Utility } from '../util/utility';

export const LoginGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  // Determine if we have a public Thing we're trying to access
  // In which case we load JUST that, and don't do any login hassle
  const toLoadId = (route.queryParams && Utility.isValidString(route.queryParams[PUBLIC_THING_PARAM])) ?
    route.queryParams[PUBLIC_THING_PARAM] : null;
  const username = (route.queryParams && Utility.isValidString(route.queryParams[PUBLIC_USER_PARAM])) ?
    route.queryParams[PUBLIC_USER_PARAM] : null;
  if (Utility.isValidString(toLoadId) && Utility.isValidString(username)) {
    inject(PublicService).loadPublicThing(toLoadId, username);
    
    if (!state.url.startsWith('/public')) {
      return inject(Router).navigate(['/public'], { queryParams: route.queryParams });
    }
  }
  // If we only have one parameter just notify of the failure and continue
  else if (Utility.isValidString(toLoadId) || Utility.isValidString(username)) {
    Utility.showErrorSticky('Failed to load public link - contact whoever gave it to you');
  }
  
  // Allow access to the public page
  if (state.url.startsWith('/public')) {
    return true;
  }
  
  // Otherwise two cases: we're logged in and can go wherever, or we're not and are forced to the login page
  const isLoggedIn = inject(AuthService).getAuth().isLoggedIn;
  if (state.url.startsWith('/login')) {
    if (isLoggedIn) {
      return inject(Router).navigate(['/'], { queryParams: route.queryParams });
    }
  }
  else if (!isLoggedIn) {
    return inject(Router).navigate(['/login'], { queryParams: route.queryParams });
  }
  return true;
};
