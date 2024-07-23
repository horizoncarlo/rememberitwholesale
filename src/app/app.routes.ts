import { Routes } from '@angular/router';
import { DatatableComponent } from './datatable/datatable.component';
import { LoginGuard } from './guards/login-guard.guard';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
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