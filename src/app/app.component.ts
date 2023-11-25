import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { formatDistanceToNow } from 'date-fns';
import { Confirmation, ConfirmationService, MenuItem, PrimeNGConfig, SortEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { GlobalSearchDialogComponent } from './global-search-dialog/global-search-dialog.component';
import { ManageTemplateDialogComponent } from './manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from './manage-thing-dialog/manage-thing-dialog.component';
import { Thing } from './model/thing';
import { TemplateService } from './service/template.service';
import { ThingService } from './service/thing.service';
import { DebugFlags } from './util/debug-flags';
import { Utility } from './util/utility';

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
    if (!DebugFlags.DEBUG_SIMULATE_LATENCY) {
      this.things.getAllThings();
    }
    else {
      this.things.loading = true;
      setTimeout(() => {
        this.things.getAllThings();
      }, 5000); // Simulate latency if requested
    }
    
    // Determine if we should default to the speed dial or not
    if (DebugFlags.DEBUG_FORCE_USE_DIAL ||
        Utility.isMobileSize()) {
      // TODO Also pull this from user settings
      this.useDial = true;
    }
    
    this.calcTableScrollHeight();
    window.addEventListener('resize', this.calcTableScrollHeight.bind(this));
    
    // Setup touch events for our dial being draggable
    if (this.useDial) {
      this.setupDialTouchEvents();
    }
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
          
          ele.addEventListener('touchmove', (event: TouchEvent) => {
            event.preventDefault(); // Necessary for performance, otherwise we get choppiness
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
                
                const badgeEle = document.getElementById('ddBadge');
                if (badgeEle) {
                  badgeEle.style.top = ele.style.top;
                  badgeEle.style.left = event.changedTouches[0].clientX + Utility.getCSSVarNum('dial-badge-size') - 5 + 'px';
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
    let middleSize: number = Utility.getCSSVarNum('dial-box-size');
    if (middleSize) {
      middleSize = middleSize / 2;
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
          visible: this.hasOneSelectedRow(),
          icon: "pi pi-pencil",
          command: () => {
              this.requestEditSelected();
          },
          tooltipOptions: {
            tooltipLabel: 'Edit Thing',
            tooltipPosition: 'bottom'
          }
        },
        {
          visible: this.hasSelectedRows(),
          icon: "pi pi-trash",
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
          visible: this.things.hasAnyReminders(),
          icon: "pi pi-clock",
          command: () => {
              this.toggleShowReminders();
          },
          tooltipOptions: {
            tooltipLabel: this.things.reminders.length + ' Reminder' + Utility.plural(this.things.reminders),
            tooltipPosition: 'bottom'
          }
        },
        {
          visible: !!this.thingTable,
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
      
      // TODO Consolidate this with `touchend` event so we're not repeating ourselves
      ele.style.top = newTop + 'px';
      ele.style.left = newLeft + 'px';
      if (this.speedDial && this.speedDial.el &&
          this.speedDial.el.nativeElement) {
        this.speedDial.el.nativeElement.style.top = ele.style.top;
        this.speedDial.el.nativeElement.style.left = ele.style.left;
      }
      const badgeEle = document.getElementById('ddBadge');
      if (badgeEle) {
        badgeEle.style.top = ele.style.top;
        badgeEle.style.left = newLeft + middleSize + Utility.getCSSVarNum('dial-badge-size') - 5 + 'px';
      }
    }
  }
  
  getDialBadgeTop(): string {
    const ele = document.getElementById('ddOverlay');;
    if (ele) {
      return ele.style.top;
    }
    return '';
  }
  
  getDialBadgeLeft(): string {
    const ele = document.getElementById('ddOverlay');;
    if (ele) {
      // TODO Clean up and centralize our various badge math
      return (parseInt(ele.style.left) -
              Utility.getCSSVarNum('dial-badge-size') +
              this.getDialBoxMiddleSize()*2) + 'px';
    }
    return '';
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
      let calcHeight = document.documentElement.getBoundingClientRect().height;
      
      // Always count the progress bar
      const progressHeight = Utility.getCSSVarNum('progress-bar-height');
      calcHeight -= progressHeight;
      
      // If we're not using the dial calculate the toolbar
      if (!this.useDial) {
        const toolbarHeight = Utility.getCSSVarNum('fixed-toolbar-height');
        calcHeight -= toolbarHeight;
      }
      
      // Determine if our paginator is showing, and if so account for it in our table scroll height
      let paginatorShowing = false;
      if (this.thingTable && typeof this.thingTable.rows === 'number' &&
          Utility.getLength(this.things.data) > this.thingTable.rows) {
        paginatorShowing = true;
      }
      if (paginatorShowing) {
        const paginatorHeight = Utility.getCSSVarNum('table-paginator-height');
        calcHeight -= paginatorHeight;
      }
      
      // Calculate for Reminders if needed
      if (this.showReminders) {
        const reminderEle = document.getElementById('reminders');
        if (reminderEle) {
          calcHeight -= reminderEle.getBoundingClientRect().height;
        }
      }
      
      // Have a minimum height, if we get below it, turn off internal scrolling, so we don't just have a super squished view
      if (calcHeight < 300) {
        this.tableScrollHeight = '100%';
        return;
      }
      
      this.tableScrollHeight = calcHeight + 'px';
    }, 0);
  }
  
  globalFilterTableByEvent(event: Event): void {
    if (event && event.target) {
      this.globalFilterTable((event.target as HTMLInputElement).value);
    }
  }
  
  async globalFilterTable(value: string): Promise<number> {
    return new Promise((resolve) => {
      this.thingTable.filterGlobal(value, 'contains');
      
      // Wait for the table to rerender
      setTimeout(() => {
        resolve(this.getThingTotalRecords());
      }, 500);
    });
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
  
  handleOverdueReminder(markDone: Thing): void {
    this.confirmationService.confirm({
      key: 'dialog',
      header: 'Complete Reminder',
      message: 'Did you want to mark this Reminder as done?',
      icon: 'pi pi-question-circle',
      accept: () => {
        this.things.completeReminder(markDone);
      },
    });
  }
  
  getRemindersForSplitButton(): MenuItem[] {
    let toReturn: MenuItem[] = [];
    
    // TODO Keep a hardcoded list of MenuItems in sync when things.reminders changes with Ang17 signals or rxjs/ngrx, since then we could use "command" in the item, and show a toast with more details when a reminder is clicked
    if (this.things.hasReminders()) {
      toReturn = toReturn.concat(this.things.reminders.map((reminder): MenuItem => {
        let message = '<b>' + reminder.name + '</b> ';
        if (reminder.time) {
          message += formatDistanceToNow(reminder.time, { addSuffix: true });
        }
        else {
          message += '???';
        }
        return { label: message };
      }));
    }
    
    if (this.things.hasRemindersOverdue()) {
      toReturn.push({
        label: '* Missed ' + Utility.getLength(this.things.remindersOverdue) + ' Reminder' + Utility.plural(this.things.remindersOverdue)
      });
    }
    
    return toReturn;
  }
  
  getNameColumnHeader(): string {
    if (this.things.loading) {
      return 'Name';
    }
    
    const total = Utility.getLength(this.things.data);
    const current = this.getThingTotalRecords();
    if (typeof current === 'number' && current !== total && total > current) {
      return 'Name (' + Utility.formatNumber(current) + ' of ' + Utility.formatNumber(total) + ')';
    }
    
    return 'Name (' + Utility.formatNumber(total) + ')';
  }
  
  getThingTotalRecords(): number {
    if (this.thingTable && typeof this.thingTable.totalRecords === 'number') {
      return this.thingTable.totalRecords;
    }
    return Utility.getLength(this.things.data);
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
    if (this.things.hasReminders()) {
      toReturn += Utility.getLength(this.things.reminders) + ' Reminder' + Utility.plural(this.things.reminders);
    }
    else if (this.things.hasRemindersOverdue()) {
      toReturn += Utility.getLength(this.things.remindersOverdue) + ' Overdue';
    }
    return toReturn;
  }
  
  confirmDeleteThing(toDelete: Thing, event: Event): void {
    if (this.manageThingDialog) {
      this.manageThingDialog.hide();
    }
    
    this.selectedRows = [toDelete];
    this.confirmDeleteSelected(event);
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
        opts.key = 'inline';
      }
      
      // If we're a dialog then put a generic header
      if (isDialog) {
        opts.header = header ? header : 'Confirmation';
        opts.key = 'dialog';
      }
      
      this.confirmationService.confirm(opts);
    }
    else {
      Utility.showWarn('Select a row to delete');
    }
  }
  
  toggleShowReminders(): void {
    this.showReminders = !this.showReminders;
    Utility.fireWindowResize();
  }
  
  toggleShowFilters(): void {
    this.showFilters = !this.showFilters;
    Utility.fireWindowResize();
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
