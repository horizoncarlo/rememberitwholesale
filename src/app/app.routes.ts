import { Routes } from '@angular/router';
import { DatatableComponent } from './datatable/datatable.component';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '**',
    component: DatatableComponent
  },
];