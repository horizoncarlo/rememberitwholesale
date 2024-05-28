import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AutoCompleteModule } from 'primeng/autocomplete';
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
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { OrderListModule } from 'primeng/orderlist';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SliderModule } from 'primeng/slider';
import { SpeedDialModule } from 'primeng/speeddial';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TriStateCheckboxModule } from 'primeng/tristatecheckbox';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { DatatableComponent } from './datatable/datatable.component';
import { GlobalSearchDialogComponent } from './global-search-dialog/global-search-dialog.component';
import { ManageTemplateDialogComponent } from './manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from './manage-thing-dialog/manage-thing-dialog.component';
import { PublicviewComponent } from './publicview/publicview.component';
import { QuickviewFieldsDialogComponent } from './quick-view-fields-dialog/quick-view-fields-dialog.component';
import { ReminderMessageComponent } from './reminder-message/reminder-message.component';
import { TemplateDropdownComponent } from './template-dropdown/template-dropdown.component';
import { ToastMessageComponent } from './toast-message/toast-message.component';
import { UserProfileDialogComponent } from './user-profile-dialog/user-profile-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    DatatableComponent,
    ToastMessageComponent,
    TemplateDropdownComponent,
    ManageTemplateDialogComponent,
    ManageThingDialogComponent,
    ReminderMessageComponent,
    GlobalSearchDialogComponent,
    UserProfileDialogComponent,
    QuickviewFieldsDialogComponent,
    PublicviewComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ButtonModule,
    AutoCompleteModule,
    CalendarModule,
    ColorPickerModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    CheckboxModule,
    ChipsModule,
    DialogModule,
    DragDropModule,
    DropdownModule,
    FloatLabelModule,
    InputTextModule,
    InputTextareaModule,
    OrderListModule,
    PanelModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    SliderModule,
    SpeedDialModule,
    SplitButtonModule,
    TableModule,
    ToastModule,
    TooltipModule,
    TriStateCheckboxModule
  ],
  providers: [
    provideRouter(routes)
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
