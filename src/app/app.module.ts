import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { AppComponent } from './app.component';
import { ManageTemplateDialogComponent } from './manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from './manage-thing-dialog/manage-thing-dialog.component';
import { TemplateDropdownComponent } from './template-dropdown/template-dropdown.component';
import { ToastMessageComponent } from './toast-message/toast-message.component';

@NgModule({
  declarations: [
    AppComponent,
    ToastMessageComponent,
    TemplateDropdownComponent,
    ManageTemplateDialogComponent,
    ManageThingDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ButtonModule,
    CalendarModule,
    ColorPickerModule,
    ConfirmPopupModule,
    CheckboxModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    TableModule,
    ToastModule,
    TooltipModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
