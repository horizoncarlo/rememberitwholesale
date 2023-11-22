import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { formatDistanceToNow } from 'date-fns';
import { ConfirmationService, MenuItem, PrimeNGConfig, SortEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { ManageTemplateDialogComponent } from './manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from './manage-thing-dialog/manage-thing-dialog.component';
import { Thing } from './model/thing';
import { TemplateService } from './service/template.service';
import { ThingService } from './service/thing.service';
import { Utility } from './util/utility';

const DEBUG_SIMULATE_LATENCY = false; // Debug toggle to delay our initial call for Things

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ConfirmationService]
})
export class AppComponent implements OnInit {
  @ViewChild('thingTable') thingTable!: Table;
  @ViewChild('manageTemplate') manageTemplateDialog!: ManageTemplateDialogComponent;
  @ViewChild('manageThing') manageThingDialog!: ManageThingDialogComponent;
  things: ThingService = inject(ThingService);
  templateService: TemplateService = inject(TemplateService);
  selectedRows: Thing[] = [];
  // TODO Features like showing reminders by default or not should be remembered (or set) in user settings and their eventual record, or at least local/session storage
  showReminders: boolean = false;
  
  constructor(private primengConfig: PrimeNGConfig,
              private confirmationService: ConfirmationService) { }
  
  ngOnInit(): void {
    // As part of PrimeNG config we need to manually enable ripple across the components
    this.primengConfig.ripple = true;
    
    // Get our initial data load
    if (!DEBUG_SIMULATE_LATENCY) {
      this.things.getAllThings();
    }
    else {
      this.things.loading = true;
      setTimeout(() => {
        this.things.getAllThings();
      }, 5000);
    }
  }
  
  getDialItems(): MenuItem[] {
    return [
        {
          icon: "pi pi-refresh",
          command: () => {
              this.things.getAllThings();
          },
        },
        {
          icon: "pi pi-plus-circle",
          command: () => {
              this.clearSelectedRows();
              this.manageThingDialog.showAdd();
          },
        },
        {
          icon: "pi pi-pencil",
          disabled: !this.hasOneSelectedRow(),
          command: () => {
              this.requestEditRow(this.manageThingDialog);
          },
        },
        {
          icon: "pi pi-trash",
          disabled: !this.hasSelectedRows(),
          command: () => {
              // TODO Would need a separate confirm dialog instead of inline on the speed dial - this.confirmDeleteSelected();
          },
        },
        {
          icon: "pi pi-list",
          command: () => {
              this.clearSelectedRows();
              this.manageTemplateDialog.show();
          },
        },
        {
          icon: "pi pi-clock",
          visible: this.things.hasReminders(),
          command: () => {
              this.toggleShowReminders();
          },
        },
        {
          icon: "pi pi-search",
          command: () => {
              Utility.showWarn("TODO - Show a search dialog");
          },
        },
    ];
  }
  
  globalFilterTable(event: any): void {
    this.thingTable.filterGlobal(event.target.value, 'contains');
  }
  
  filterFields(event: any): void {
    this.thingTable.filteredValue =
      this.things.data.filter((thing: Thing) => thing.getFieldsAsString().toLocaleLowerCase().indexOf(event.target.value.toLowerCase()) !== -1);
  }
  
  requestEditRow(editDialog: ManageThingDialogComponent): void {
    if (!editDialog) {
      Utility.showError("Couldn't find dialog to show");
      console.error("Edit Dialog was not passed to the edit request");
      return;
    }
    
    if (this.hasOneSelectedRow()) {
      editDialog.showEdit(this.selectedRows);
      this.clearSelectedRows();
    }
    else {
      Utility.showWarn('Select a single row to edit');
    }
  }
  
  getRemindersForSplitButton(): MenuItem[] {
    if (Utility.hasItems(this.things.reminders)) {
      return this.things.reminders.map((reminder): MenuItem => {
        let message = '<b>' + reminder.name + '</b> in ';
        if (reminder.time) {
          message += formatDistanceToNow(reminder.time);
        }
        else {
          message += '???';
        }
        return { label: message };
      });
    }
    return [];
  }
  
  getDeleteLabel(): string {
    let toReturn = 'Delete';
    if (this.hasSelectedRows()) {
      toReturn += ' ' + this.selectedRows.length + ' Thing' + Utility.plural(this.selectedRows);
    }
    return toReturn;
  }
  
  getReminderLabel(): string {
    let toReturn = '';
    if (Utility.hasItems(this.things.reminders)) {
      toReturn += this.things.reminders.length + ' Reminder' + Utility.plural(this.things.reminders);
    }
    return toReturn;
  }
  
  confirmDeleteSelected(event: Event): void {
    if (this.hasSelectedRows()) {
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Are you sure you want to delete ' + this.selectedRows.length + ' Thing' + Utility.plural(this.selectedRows) + '?',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.things.deleteThings(this.selectedRows);
          this.clearSelectedRows();
        },
        reject:() => {
          this.clearSelectedRows();
        },
      });
    }
    else {
      Utility.showWarn('Select a row to delete');
    }
  }
  
  toggleShowReminders(): void {
    this.showReminders = !this.showReminders;
  }
  
  clearSelectedRows(): void {
    this.selectedRows = [];
  }
  
  hasSelectedRows(): boolean {
    return Utility.hasItems(this.selectedRows);
  }
  
  hasOneSelectedRow(): boolean {
    return this.hasSelectedRows() && this.selectedRows.length === 1;
  }
  
  customSort(event: SortEvent) {
    if (event && event.data && event.field) {
      event.data.sort((thing1: any, thing2: any) => {
        const field: string = event.field as string;
        const value1 = thing1[field];
        const value2 = thing2[field];
        
        let result = null;
        
        // Get all our missing cases out of the way
        if (value1 === null && value2 !== null) {
          result = -1;
        }
        else if (value1 !== null && value2 === null) {
          result = 1;
        }
        else if (value1 === null && value2 === null) {
          result = 0;
        }
        // Can handle strings in a basic way
        else if (typeof value1 === 'string' && typeof value2 === 'string') {
          result = value1.localeCompare(value2);
        }
        // Handle Fields specifically, as we want to use their string version
        else if (field === 'fields') {
          result = (thing1 as Thing).getFieldsAsString().localeCompare((thing2 as Thing).getFieldsAsString());
        }
        // Fallback to a direct compare
        else {
          result = value1 < value2 ? -1 : value1 > value2 ? 1 : 0;
        }
        
        return (event.order || 0) * result;
      });
    }
  }
}
