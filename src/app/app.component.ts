import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { addHours, formatDistanceToNow } from 'date-fns';
import { Confirmation, ConfirmationService, MenuItem, PrimeNGConfig, SortEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { GlobalSearchDialogComponent } from './global-search-dialog/global-search-dialog.component';
import { ManageTemplateDialogComponent } from './manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from './manage-thing-dialog/manage-thing-dialog.component';
import { TemplateField } from './model/template-field';
import { Thing } from './model/thing';
import { UserSettings } from './model/user-settings';
import { TemplateService } from './service/template.service';
import { ThingService } from './service/thing.service';
import { UserService } from './service/user.service';
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
  userService: UserService = inject(UserService);
  fieldTypes = TemplateField.TYPES;
  selectedRows: Thing[] = [];
  showFilters: boolean = false;
  showReminders: boolean = false;
  useDial: boolean = false;
  isDialOpen = false;
  isDraggingDial: boolean = false;
  tableScrollHeight: string = '400px';
  limitDate: number = 60*24*30; // Limit to 1 month by default
  limitDateOptions: { value: number, label: string }[] = [
    { value: 60, label: '1 hour'},
    { value: 60*8, label: '8 hours'},
    { value: 60*24, label: '1 day'},
    { value: 60*24*7, label: '1 week'},
    { value: 60*24*30, label: '1 month'},
    { value: 60*24*30*3, label: '3 months'},
    { value: 60*24*30*6, label: '6 months'},
    { value: 60*24*30*8, label: '8 months'},
    { value: 60*24*365, label: '1 year'},
    { value: 60*24*365*2, label: '2 years'},
    { value: 60*24*365*3, label: '3 years'},
    { value: -1, label: 'All Time (may be slow)'},
  ];
  
  constructor(private primengConfig: PrimeNGConfig,
              private confirmationService: ConfirmationService) { }
  
  ngOnInit(): void {
    // Right on initial render determine if we should use the dial, to prevent flicker
    // We'll load this later from user settings as well
    if (DebugFlags.DEBUG_FORCE_USE_DIAL ||
      Utility.isMobileSize()) {
      this.useDial = true;
    }
    
    // TODO Simplify and centralize loading (probably a new service), instead of a flag in things/templates/etc.
    this.things.loading = true;
    this.userService.ready$.subscribe({
      next: (isReady) => {
        if (!isReady) {
          return;
        }
        
        // As part of PrimeNG config we need to manually enable ripple across the components
        this.primengConfig.ripple = true;
        
        // Get our initial data load
        if (!DebugFlags.DEBUG_SIMULATE_LATENCY) {
          this.refreshThings();
        }
        else {
          this.things.loading = true;
          setTimeout(() => {
            this.refreshThings();
          }, 5000); // Simulate latency if requested
        }
        
        // Determine if we should default to the speed dial or not based on our user settings
        if (this.userService.getUser().forceDial) {
          this.useDial = true;
        }
        
        // Set our various UI flags
        this.showFilters = this.userService.getUser().showFilters;
        this.showReminders = this.userService.getUser().showReminders;
        this.limitDate = this.userService.getUser().limitDate;
        
        this.calcTableScrollHeight();
        window.addEventListener('resize', this.calcTableScrollHeight.bind(this));
        
        // Setup touch events for our dial being draggable
        if (this.useDial) {
          this.setupDialTouchEvents();
        }
        
        // Setup an orientation listener to resize if a native device changes from portrait to landscape or back
        screen.orientation.addEventListener("change", (event) => {
          Utility.fireWindowResize();
        });
      }
    });
  }
  
  ngOnDestroy(): void {
    window.removeEventListener('resize', this.calcTableScrollHeight);
  }
  
  refreshThings(): void {
    this.things.getAllThings(this.limitDate);
  }
  
  changeLimitDate(): void {
    this.userService.setUserProp('limitDate', this.limitDate);
    this.refreshThings();
  }
  
  getUser(): UserSettings {
    return this.userService.getUser();
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
          visible: this.templateService.hasFavorite(),
          icon: "pi pi-heart-fill",
          command: () => {
              this.quickfillFavoriteThing();
          },
          tooltipOptions: {
            tooltipLabel: 'Use Favorite Template',
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
            tooltipLabel: (Utility.getLength(this.things.reminders) + Utility.getLength(this.things.remindersOverdue)) +
                           ' Reminder' + Utility.plural(this.things.reminders),
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
    this.genericBadgeDropEvent(event.target as HTMLElement,
                               { x: event.clientX, y: event.clientY });
  }
  
  genericBadgeDropEvent(ele: HTMLElement, pos: { x: number, y: number }) {
    if (ele) {
      this.isDraggingDial = false;
      ele.style.backgroundColor = 'transparent';
      
      const middleSize = this.getDialBoxMiddleSize();
      let newTop = pos.y - middleSize;
      let newLeft = pos.x - middleSize;
      
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
      
      const badgeEle = document.getElementById('ddBadge');
      if (badgeEle) {
        badgeEle.style.top = ele.style.top;
        badgeEle.style.left = newLeft + middleSize + Utility.getCSSVarNum('dial-badge-size') - 5 + 'px';
      }
    }
  }
  
  setupDialTouchEvents(retryCount?: number): void {
    // Since touch* events aren't naturally supported on Angular 16 components, like (touchstart), we have to manually add the listeners
    // Support dragging the speed dial around
    if (this.useDial) {
      setTimeout(() => {
        const ele = document.getElementById('ddOverlay');
        if (ele) {
          ele.addEventListener('touchmove', (event: TouchEvent) => {
            event.preventDefault(); // Necessary for performance, otherwise we get choppiness
            this.isDraggingDial = true;
            
            if (Utility.hasItems(event.changedTouches)) {
              const middleSize = this.getDialBoxMiddleSize();
              ele.style.top = event.changedTouches[0].clientY - middleSize + 'px';
              ele.style.left = event.changedTouches[0].clientX - middleSize + 'px';
            }
          });
          
          ele.addEventListener('touchend', (event: TouchEvent) => {
            if (this.isDraggingDial) {
              if (Utility.hasItems(event.changedTouches)) {
              this.genericBadgeDropEvent(ele, { x: event.changedTouches[0].clientX,
                                                y: event.changedTouches[0].clientY });
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
  
  doneEditThing(toEdit: Thing): void {
    this.clearSelectedRows();
  }
  
  requestEditSelected(): void {
    if (this.hasOneSelectedRow()) {
      this.manageThingDialog.showEdit(this.selectedRows);
    }
    else {
      Utility.showWarn('Select a single row to edit');
    }
  }
  
  requestEditReminder(toEdit: Thing): void {
    if (toEdit) {
      this.selectedRows = [toEdit];
      this.manageThingDialog.showEdit(this.selectedRows);
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
  
  isFavoriteByName(name: string): boolean {
    return (Utility.isValidString(name) &&
            name.indexOf('Favorite - ') === 0);
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
  
  confirmDeleteSelected(event: Event | null, isDialog?: boolean, header?: string): void {
    if (this.hasSelectedRows()) {
      // If we only have a single Thing show it's name, otherwise use the selected number of rows
      const message = 'Are you sure you want to delete ' +
        (this.selectedRows.length === 1 ?
          ('the "' + this.selectedRows[0].name + '"') :
          (this.selectedRows.length)) +
        ' Thing' + Utility.plural(this.selectedRows) + '?';
      
      const opts: Confirmation = {
        message: message,
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.things.deleteThings(this.selectedRows);
          this.clearSelectedRows();
          
          if (this.manageThingDialog) {
            this.manageThingDialog.hide();
          }
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
  
  quickfillFavoriteThing(): void {
    const favorite = this.templateService.favorite;
    if (favorite) {
      const opts: Confirmation = {
        key: 'favorite',
        accept: () => {
          // Construct a Thing from the settings in our Favorite Template and dialog
          const toSave = new Thing('Favorite - ');
          toSave.name += Utility.isValidString(favorite.nameSuffix) ? favorite.nameSuffix : favorite.name;
          toSave.time = addHours(new Date(), favorite.timeRange || 0);
          toSave.reminder = favorite.autoReminder;
          toSave.applyTemplateTo(favorite); // TODO This should probably be in thing.prepareForSave so it's done in a consistent way and not manually
          
          // After saving we want to clear our value from the favorite template, so it's fresh for next time
          this.things.saveThing(toSave, { onSuccess: () => favorite.clearValuesFromFields() });
        },
      };
      // TODO Once the confirm content is componentized, have the option for a confirmPopup too (use a different key) instead of dialog (or maybe just our own dialog, we're customizing confirm* pretty hard): opts.target = event.target as EventTarget;
      
      this.confirmationService.confirm(opts);
      
      // Simple approach to focus the first custom field, if found, otherwise the name (if found), so that the dialog is even faster to use
      // Note we use a setTimeout to let the dialog render open first
      setTimeout(() => {
        if (favorite.hasFields() && favorite.fields) { // TODO This approach is throughout the app, so we need a way in Typescript to count our "hasFields" (similar Utility.hasItems) as marking the field as valid, so we don't have to double check it
          document.getElementById(favorite.fields[0].property)?.focus();
        }
      }, 0);
    }
    else {
      Utility.showWarn('No Favorite Template has been set yet');
    }
  }
  
  toggleShowReminders(): void {
    this.showReminders = !this.showReminders;
    this.userService.setUserProp('showReminders', this.showReminders);
    Utility.fireWindowResize();
  }
  
  toggleShowFilters(): void {
    this.showFilters = !this.showFilters;
    this.userService.setUserProp('showFilters', this.showFilters);
    this.thingTable.reset();
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
  
  getEmptyMessageClass(): string {
    // Center our "no data" message, unless we're on mobile as then we have to scroll over to see it
    return Utility.isMobileSize() ? '' : 'center';
  }
  
  customSort(event: SortEvent) {
    if (event && event.data && event.field) {
      event.data.sort((thing1: any, thing2: any) => {
        const field: string = event.field as string;
        const value1 = thing1[field];
        const value2 = thing2[field];
        
        let result = null;
        
        // Get all our missing cases out of the way
        if ((!value1 || value1 === null) && (!value2 || value2 !== null)) {
          result = -1;
        }
        else if (value1 !== null && (!value2 || value2 === null)) {
          result = 1;
        }
        else if ((!value1 || value1 === null) && value2 === null) {
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
