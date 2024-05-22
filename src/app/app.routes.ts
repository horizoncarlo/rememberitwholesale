import { Routes } from '@angular/router';
import { DatatableComponent } from './datatable/datatable.component';
import { LoginGuard } from './guards/login-guard.guard';
import { LoginComponent } from './login/login.component';
import { PublicviewComponent } from './publicview/publicview.component';

export const routes: Routes = [
  {
    path: 'public',
    component: PublicviewComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: '**',
    component: DatatableComponent,
    canActivate: [LoginGuard]
  },
];