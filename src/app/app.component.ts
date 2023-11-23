import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { formatDistanceToNow } from 'date-fns';
import { isMobile } from 'is-mobile'; // TODO Remove and just use widths?
import { Confirmation, ConfirmationService, MenuItem, PrimeNGConfig, SortEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { GlobalSearchDialogComponent } from './global-search-dialog/global-search-dialog.component';
import { ManageTemplateDialogComponent } from './manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from './manage-thing-dialog/manage-thing-dialog.component';
import { Thing } from './model/thing';
import { TemplateService } from './service/template.service';
import { ThingService } from './service/thing.service';
import { Utility } from './util/utility';

const DEBUG_SIMULATE_LATENCY = false; // Debug toggle to delay our initial call for Things
const DEBUG_FORCE_USE_DIAL = false; // Debug to use the dial instead of toolbar regardless of screen size

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ConfirmationService]
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('thingTable') thingTable!: Table;
  @ViewChild('manageTemplate') manageTemplateDialog!: ManageTemplateDialogComponent;
  @ViewChild('manageThing') manageThingDialog!: ManageThingDialogComponent;
  @ViewChild('globalSearch') globalSearchDialog!: GlobalSearchDialogComponent;
  @ViewChild('speedDial') speedDial!: any;
  things: ThingService = inject(ThingService);
  templateService: TemplateService = inject(TemplateService);
  selectedRows: Thing[] = [];
  // TODO Features like showing filters/reminders by default or not should be remembered (or set) in user settings and their eventual record, or at least local/session storage
  showFilters: boolean = false;
  showReminders: boolean = false;
  useDial: boolean = false;
  isDialOpen = false;
  isDraggingDial: boolean = false;
  tableScrollHeight: string = '400px';
  
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
      }, 5000); // Simulate latency if requested
    }
    
    // Determine if we should default to the speed dial or not
    if (DEBUG_FORCE_USE_DIAL) {
      this.useDial = true;
    }
    else if (document.body.getBoundingClientRect().width < 700 || isMobile()) {
      // TODO Also pull this from user settings
      this.useDial = true;
    }
    
    this.calcTableScrollHeight();
    window.addEventListener('resize', this.calcTableScrollHeight.bind(this));
    
    this.setupDialTouchEvents();
  }
  
  ngOnDestroy(): void {
    window.removeEventListener('resize', this.calcTableScrollHeight);
  }
  
  setupDialTouchEvents(retryCount?: number): void {
    // Since touch* events aren't naturally supported on Angular 16 components, like (touchstart), we have to manually add the listeners
    // Support dragging the speed dial around
    if (this.useDial) {
      setTimeout(() => {
        const ele = document.getElementById('ddOverlay');
        if (ele) {
          const middleSize = this.getDialBoxMiddleSize();
          
          ele.addEventListener('touchstart', (event: TouchEvent) => {
            // TODO this.dialDragStart(e, null);
          });
          
          ele.addEventListener('touchmove', (event: TouchEvent) => {
            event.preventDefault();
            this.isDraggingDial = true;
            
            if (Utility.hasItems(event.changedTouches)) {
              ele.style.top = event.changedTouches[0].clientY - middleSize + 'px';
              ele.style.left = event.changedTouches[0].clientX - middleSize + 'px';
            }
          });
          
          ele.addEventListener('touchend', (event: TouchEvent) => {
            if (this.isDraggingDial) {
              this.isDraggingDial = false;
              
              ele.style.backgroundColor = 'transparent';
              
              if (Utility.hasItems(event.changedTouches)) {
                ele.style.top = event.changedTouches[0].clientY - middleSize + 'px';
                ele.style.left = event.changedTouches[0].clientX - middleSize + 'px';
                
                if (this.speedDial && this.speedDial.el &&
                    this.speedDial.el.nativeElement) {
                  this.speedDial.el.nativeElement.style.top = ele.style.top;
                  this.speedDial.el.nativeElement.style.left = ele.style.left;
                }
              }
            }
          });
          
          ele.addEventListener('touchcancel', (e: any) => {
            this.isDraggingDial = false;
          });
        }
        else {
          if (typeof retryCount !== 'number') {
            retryCount = 0;
          }
          
          if (retryCount < 20) {
            setTimeout(() => {
              this.setupDialTouchEvents(retryCount);
            }, 200);
            retryCount++;
          }
        }
      }, 0);
    }
  }
  
  getDialBoxMiddleSize(): number {
    let middleSize = Utility.getCSSVar('dial-box-size');
    if (middleSize) {
      middleSize = parseInt(middleSize) / 2;
    }
    if (isNaN(middleSize) || typeof middleSize !== 'number') {
      middleSize = 0;
    }
    return middleSize;
  }
  
  getDialItems(): MenuItem[] {
    return [
        {
          icon: "pi pi-plus-circle",
          command: () => {
              this.clearSelectedRows();
              this.manageThingDialog.showAdd();
          },
          tooltipOptions: {
            tooltipLabel: 'New Thing',
            tooltipPosition: 'bottom'
          }
        },
        {
          icon: "pi pi-pencil",
          visible: this.hasOneSelectedRow(),
          command: () => {
              this.requestEditSelected();
          },
          tooltipOptions: {
            tooltipLabel: 'Edit Thing',
            tooltipPosition: 'bottom'
          }
        },
        {
          icon: "pi pi-trash",
          visible: this.hasSelectedRows(),
          command: () => {
            this.confirmDeleteSelected(null, true);
          },
          tooltipOptions: {
            tooltipLabel: 'Delete',
            tooltipPosition: 'bottom'
          }
        },
        {
          icon: "pi pi-list",
          command: () => {
              this.clearSelectedRows();
              this.manageTemplateDialog.show();
          },
          tooltipOptions: {
            tooltipLabel: this.getManageTemplateLabel(),
            tooltipPosition: 'bottom'
          }
        },
        {
          icon: "pi pi-clock",
          visible: this.things.hasReminders(),
          command: () => {
              this.toggleShowReminders();
          },
          tooltipOptions: {
            tooltipLabel: this.things.reminders.length + ' Reminder' + Utility.plural(this.things.reminders),
            tooltipPosition: 'bottom'
          }
        },
        {
          icon: "pi pi-search",
          command: () => {
            this.globalSearchDialog.show();
          },
          tooltipOptions: {
            tooltipLabel: 'Global Search',
            tooltipPosition: 'bottom'
          }
        },
    ];
  }
  
  dialDragStart(event: DragEvent): void {
    const ele = event.target as HTMLElement;
    
    // TODO Fix drag cursor being not-allowed
    if (ele) {
      ele.style.backgroundColor = 'var(--primary-color)';
    }
  }
  
  dialDragEnd(event: DragEvent): void {
    const ele = event.target as HTMLElement;
    if (ele) {
      ele.style.backgroundColor = 'transparent';
      
      const middleSize = this.getDialBoxMiddleSize();
      let newTop = event.clientY - middleSize;
      let newLeft = event.clientX - middleSize;
      
      // Ensure we can't drag outside the browser
      if (newTop < 0) {
        newTop = 0;
      }
      if (newLeft < 0) {
        newLeft = 0;
      }
      
      ele.style.top = newTop + 'px';
      ele.style.left = newLeft + 'px';
      if (this.speedDial && this.speedDial.el &&
          this.speedDial.el.nativeElement) {
        this.speedDial.el.nativeElement.style.top = ele.style.top;
        this.speedDial.el.nativeElement.style.left = ele.style.left;
      }
    }
  }
  
  /**
   * When clicking the overlay, pass through to click the speed dial underneath
   */
  dialOverlayClickthru(event: Event): void {
    event.preventDefault();
    
    if (!this.isDialOpen) {
      if (this.speedDial && this.speedDial.el &&
          this.speedDial.el.nativeElement) {
        const ele = this.speedDial.el.nativeElement.querySelector('button');
        if (ele) {
          setTimeout(() => { ele.click(); }, 0); // Need to finish handling our current event before we try clicking on the underlying element
        }
      }
      
      this.isDialOpen = !this.isDialOpen;
    }
  }
  
  calcTableScrollHeight(): void {
    setTimeout(() => { // Wait for the current table to resolve and then do our calculations
      let toReturn = document.documentElement.getBoundingClientRect().height;
      
      // If we're not using the dial calculate the toolbar
      if (!this.useDial) {
        const toolbarHeight = Utility.getCSSVar('fixed-toolbar-height');
        if (toolbarHeight && !isNaN(parseInt(toolbarHeight))) {
          toReturn -= parseInt(toolbarHeight);
        }
      }
      
      // Determine if our paginator is showing, and if so account for it in our table scroll height
      let paginatorShowing = false;
      if (this.thingTable && typeof this.thingTable.rows === 'number' &&
          Utility.getLength(this.things.data) > this.thingTable.rows) {
        paginatorShowing = true;
      }
      if (paginatorShowing) {
      const paginatorHeight = Utility.getCSSVar('table-paginator-height');
        if (paginatorHeight && !isNaN(parseInt(paginatorHeight))) {
          toReturn -= parseInt(paginatorHeight);
        }
      }
      
      // Calculate for Reminders if needed
      if (this.showReminders) {
        const reminderEle = document.getElementById('reminders');
        if (reminderEle) {
          toReturn -= reminderEle.getBoundingClientRect().height;
        }
      }
      
      // Have a minimum height, if we get below it, turn off internal scrolling, so we don't just have a super squished view
      if (toReturn < 300) {
        this.tableScrollHeight = '100%';
        return;
      }
      
      this.tableScrollHeight = toReturn + 'px';
    }, 0);
  }
  
  globalFilterTableByEvent(event: Event): void {
    if (event && event.target) {
      this.globalFilterTable((event.target as HTMLInputElement).value);
    }
  }
  
  globalFilterTable(value: string): void {
    this.thingTable.filterGlobal(value, 'contains');
  }
  
  filterFields(event: any): void {
    this.thingTable.filteredValue =
      this.things.data.filter((thing: Thing) => thing.getFieldsAsString().toLocaleLowerCase().indexOf(event.target.value.toLowerCase()) !== -1);
  }
  
  requestEditSelected(): void {
    if (this.hasOneSelectedRow()) {
      this.manageThingDialog.showEdit(this.selectedRows);
      this.clearSelectedRows();
    }
    else {
      Utility.showWarn('Select a single row to edit');
    }
  }
  
  requestEditReminder(toEdit: Thing): void {
    if (toEdit) {
      this.manageThingDialog.showEdit([toEdit]);
    }
    else {
      Utility.showWarn('Select a Reminder to edit');
    }
  }
  
  getRemindersForSplitButton(): MenuItem[] {
    // TODO Keep a hardcoded list of MenuItems in sync when things.reminders changes with rxjs/ngrx, since then we could use "command" in the item, and show a toast with more details when a reminder is clicked
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
  
  getNameColumnHeader(): string {
    if (this.things.loading) {
      return 'Name';
    }
    
    const total = this.things.data ? this.things.data.length : 0;
    
    if (this.thingTable && typeof this.thingTable.totalRecords === 'number') {
      const current = this.thingTable ? this.thingTable.totalRecords : 0;
      if (current !== total) {
        return 'Name (' + Utility.formatNumber(current) + ' of ' + Utility.formatNumber(total) + ')';
      }
    }
    
    return 'Name (' + Utility.formatNumber(total) + ')';
  }
  
  getManageTemplateLabel(): string {
    if (this.templateService.loading) {
      return 'Manage Templates';
    }
    return 'Manage ' + this.templateService.getTemplateCount() + ' Template' + Utility.plural(this.templateService.data);
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
  
  confirmDeleteSelected(event: Event | null, isDialog?: boolean, header?: string): void {
    if (this.hasSelectedRows()) {
      const opts: Confirmation = {
        message: 'Are you sure you want to delete ' + this.selectedRows.length + ' Thing' + Utility.plural(this.selectedRows) + '?',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.things.deleteThings(this.selectedRows);
          this.clearSelectedRows();
        },
        reject:() => {
          this.clearSelectedRows();
        },
      };
      
      // Set a target if we got an event to use
      if (event) {
        opts.target = event.target as EventTarget;
      }
      
      // If we're a dialog then put a generic header
      if (isDialog) {
        opts.header = header ? header : 'Confirmation';
      }
      
      this.confirmationService.confirm(opts);
    }
    else {
      Utility.showWarn('Select a row to delete');
    }
  }
  
  toggleShowReminders(): void {
    this.showReminders = !this.showReminders;
    this.calcTableScrollHeight();
  }
  
  toggleShowFilters(): void {
    this.showFilters = !this.showFilters;
    this.calcTableScrollHeight();
  }
  
  clearSelectedRows(): void {
    this.selectedRows = [];
  }
  
  rowSelectedCount(): number {
    return Utility.getLength(this.selectedRows);
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
