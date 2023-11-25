import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipsModule } from 'primeng/chips';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { DialogModule } from 'primeng/dialog';
import { DragDropModule } from 'primeng/dragdrop';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SpeedDialModule } from 'primeng/speeddial';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TriStateCheckboxModule } from 'primeng/tristatecheckbox';
import { AppComponent } from './app.component';
import { GlobalSearchDialogComponent } from './global-search-dialog/global-search-dialog.component';
import { ManageTemplateDialogComponent } from './manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from './manage-thing-dialog/manage-thing-dialog.component';
import { ReminderMessageComponent } from './reminder-message/reminder-message.component';
import { TemplateDropdownComponent } from './template-dropdown/template-dropdown.component';
import { ToastMessageComponent } from './toast-message/toast-message.component';

@NgModule({
  declarations: [
    AppComponent,
    ToastMessageComponent,
    TemplateDropdownComponent,
    ManageTemplateDialogComponent,
    ManageThingDialogComponent,
    ReminderMessageComponent,
    GlobalSearchDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ButtonModule,
    CalendarModule,
    ColorPickerModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    CheckboxModule,
    ChipsModule,
    DialogModule,
    DragDropModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    SpeedDialModule,
    SplitButtonModule,
    TableModule,
    ToastModule,
    TooltipModule,
    TriStateCheckboxModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
