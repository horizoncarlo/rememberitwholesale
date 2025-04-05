import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { addHours, formatDistanceToNow } from 'date-fns';
import { Confirmation, ConfirmationService, MenuItem, PrimeNGConfig, SortEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { GlobalSearchDialogComponent } from '../global-search-dialog/global-search-dialog.component';
import { ManageTemplateDialogComponent } from '../manage-template-dialog/manage-template-dialog.component';
import { ManageThingDialogComponent } from '../manage-thing-dialog/manage-thing-dialog.component';
import { TemplateField } from '../model/template-field';
import { LOAD_ACTION, REQUEST_FAST_FAVORITE, Thing } from '../model/thing';
import { UserSettings } from '../model/user-settings';
import { QuickviewFieldsDialogComponent } from '../quick-view-fields-dialog/quick-view-fields-dialog.component';
import { AuthService } from '../service/auth.service';
import { TemplateService } from '../service/template.service';
import { ThingService } from '../service/thing.service';
import { UserService } from '../service/user.service';
import { UserProfileDialogComponent } from '../user-profile-dialog/user-profile-dialog.component';
import { DebugFlags } from '../util/debug-flags';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-datatable',
  templateUrl: './datatable.component.html',
  styleUrl: './datatable.component.css',
  providers: [ConfirmationService],
})
export class DatatableComponent implements OnInit, OnDestroy {
  @ViewChild('thingTable') thingTable!: Table;
  @ViewChild('manageTemplate') manageTemplateDialog!: ManageTemplateDialogComponent;
  @ViewChild('manageThing') manageThingDialog!: ManageThingDialogComponent;
  @ViewChild('globalSearch') globalSearchDialog!: GlobalSearchDialogComponent;
  @ViewChild('userProfile') userProfileDialog!: UserProfileDialogComponent;
  @ViewChild('quickviewFieldsDialog') quickviewFieldsDialog!: QuickviewFieldsDialogComponent;
  @ViewChild('speedDial') speedDial!: any;
  
  fieldTypes = TemplateField.TYPES;
  selectedRows: Thing[] = [];
  showFilters: boolean = false;
  showReminders: boolean = false;
  useDial: boolean = false;
  isDialOpen = false;
  isDraggingDial: boolean = false;
  tableScrollable: boolean = Utility.isMobileSize();
  tableScrollHeight: string | undefined = Utility.isMobileSize() ? '400px' : undefined;
  lastVisibilityRefresh: number = performance.now(); // For mobile we auto-refresh our Things on visibility change, but we still want to throttle it by time
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
              private confirmationService: ConfirmationService,
              private router: Router,
              public authService: AuthService,
              public things: ThingService,
              public templateService: TemplateService,
              public userService: UserService) { }
  
  ngOnInit(): void {
    // Right on initial render determine if we should use the dial, to prevent flicker
    // We'll load this later from user settings as well
    if (DebugFlags.DEBUG_FORCE_USE_DIAL ||
      Utility.isMobileSize()) {
      this.useDial = true;
    }
    
    // Setup a listener for visibility changed to ensure we re-fetch our Things when becoming visible again
    // Done just on mobile, mainly if our phone screen is blacked out or we're in another app and come back and want fresh data
    if (Utility.isMobileSize()) {
      window.addEventListener('visibilitychange', () => {
        // Throttle to 10 seconds between grabs
        if (document.visibilityState === 'visible' &&
            performance.now() - this.lastVisibilityRefresh > 10*1000) {
          if (this.authService.getAuth().isLoggedIn) { // Only bother refreshing if logged in
            setTimeout(() => { // Let the page settle first before refreshing, to prevent browser flicker on some mobile devices
              this.refreshThings();
            });
          }
        }
      });
    }
    
    // TODO Simplify and centralize loading (probably a new service), instead of a flag in things/templates/etc.
    this.things.markLoading();
    this.userService.setupSettings();
    this.userService.ready$.subscribe({
      next: (isReady) => {
        if (!isReady) {
          return;
        }
        
        // Set our various UI flags
        this.showFilters = this.userService.getUser().showFilters;
        this.showReminders = this.userService.getUser().showReminders;
        this.limitDate = this.userService.getUser().limitDate;
        
        // As part of PrimeNG config we need to manually enable ripple across the components
        this.primengConfig.ripple = true;
        
        // Get our initial data load
        if (!DebugFlags.DEBUG_SIMULATE_LATENCY) {
          this.refreshThings();
        }
        else {
          this.things.markLoading();
          setTimeout(() => {
            this.refreshThings();
          }, 5000); // Simulate latency if requested
        }
        
        // Check if we're asking directly for a Favorite from a quick use outside link
        // Note a bit more verbose because we don't use an ActivateRoute here but grab it from the router instead to simplify imports
        if (this.router.routerState?.root?.snapshot?.queryParams?.[LOAD_ACTION] === REQUEST_FAST_FAVORITE) {
          this.quickfillFavoriteThing();
          
          this.router.navigate(['.']); // Clear our action param
        }
        
        // Determine if we should default to the speed dial or not based on our user settings
        if (this.userService.getUser().forceDial) {
          this.useDial = true;
        }
        
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
  
  @HostListener('window:keydown.shift.control.f', ['$event'])
  handleSlashKey(): void {
    setTimeout(() => { // Do a timeout so that we focus without putting the hotkey into the field
      document.getElementById('globalSearchIn')?.focus();
    });
  }
  
  refreshThings(): void {
    this.lastVisibilityRefresh = performance.now();
    this.things.getAllThings(this.limitDate);
  }
  
  changeLimitDate(): void {
    this.userService.setUserProp('limitDate', this.limitDate);
    this.refreshThings();
  }
  
  getUser(): UserSettings {
    return this.userService.getUser();
  }
  
  getSpeedDialItems(): MenuItem[] {
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
          visible: this.hasSelectedRows(),
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
        {
          icon: "pi pi-user",
          command: () => {
            this.userProfileDialog.show();
          },
          tooltipOptions: {
            tooltipLabel: 'User Profile',
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
    // 2023: Since touch* events aren't naturally supported on Angular 16 components, like (touchstart), we have to manually add the listeners
    // Support dragging the speed dial around
    if (this.useDial) {
      setTimeout(() => {
        const ele = document.getElementById('ddOverlay');
        if (ele) {
          const touchmove = (event: TouchEvent) => {
            event.preventDefault(); // Necessary for performance, otherwise we get choppiness
            this.isDraggingDial = true;
            
            if (Utility.hasItems(event.changedTouches)) {
              const middleSize = this.getDialBoxMiddleSize();
              ele.style.top = event.changedTouches[0].clientY - middleSize + 'px';
              ele.style.left = event.changedTouches[0].clientX - middleSize + 'px';
            }
          };
          ele.removeEventListener('touchmove', touchmove);
          ele.addEventListener('touchmove', touchmove);
          
          const touchend = (event: TouchEvent) => {
            if (this.isDraggingDial) {
              if (Utility.hasItems(event.changedTouches)) {
              this.genericBadgeDropEvent(ele, { x: event.changedTouches[0].clientX,
                                                y: event.changedTouches[0].clientY });
              }
            }
          };
          ele.removeEventListener('touchend', touchend);
          ele.addEventListener('touchend', touchend);
          
          const touchcancel = (e: any) => {
            this.isDraggingDial = false;
          };
          ele.removeEventListener('touchcancel', touchcancel);
          ele.addEventListener('touchcancel', touchcancel);
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
      });
    }
  }
  
  dialChanged(event: boolean): void {
    this.useDial = event;
    if (this.useDial) {
      this.setupDialTouchEvents();
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
          setTimeout(() => ele.click()); // Need to finish handling our current event before we try clicking on the underlying element
        }
      }
      
      this.isDialOpen = !this.isDialOpen;
    }
  }
  
  calcTableScrollHeight(): void {
    // If we're on desktop, don't use the table component scroller
    // TODO Had a problem where arrow keys wouldn't scroll - didn't bother debugging or filing an issue, so just ditch it
    if (!Utility.isMobileSize()) {
      this.tableScrollHeight = undefined;
      return;
    }
    
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
      if (this.userService.getUser().paginatorTable &&
          this.getThingsTableRecordCount() > this.userService.getUser().paginatorRows) {
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
    });
  }
  
  globalFilterTableByEvent(event: Event): void {
    if (event && event.target) {
      this.globalFilterTable((event.target as HTMLInputElement).value);
    }
  }
  
  clearGlobalFilter(inputEl?: HTMLInputElement): void {
    if (inputEl) {
      inputEl.value = '';
    }
    else {
      const manualEle = document.getElementById('globalSearchIn');
      if (manualEle) {
        (manualEle as HTMLInputElement).value = '';
      }
    }
    this.globalFilterTable('');
  }
  
  async globalFilterTable(value: string): Promise<number> {
    return new Promise((resolve) => {
      this.thingTable.filterGlobal(value, 'contains');
      
      // Wait for the table to rerender
      setTimeout(() => {
        resolve(this.getThingsTableRecordCount());
      }, 500);
    });
  }
  
  filterFields(event: any): void {
    this.thingTable.filteredValue =
      this.things.data.filter((thing: Thing) => thing.fieldsAsString?.toLocaleLowerCase().indexOf(event.target.value.toLowerCase()) !== -1);
  }
  
  doneEditThing(toEdit: Thing): void {
    this.clearSelectedRows();
  }
  
  requestEditSelected(): void {
    if (this.hasSelectedRows()) {
      // If we have multiple rows to edit, just use the last one in the list, as that's last clicked by the user and feels most natural
      this.manageThingDialog.showEdit(this.hasOneSelectedRow() ? this.selectedRows : [this.selectedRows[this.selectedRows.length-1]]);
    }
    else {
      Utility.showWarn('Select a row to edit');
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
    
    const total = this.things.thingCount > 0 ? this.things.thingCount : Utility.getLength(this.things.data);
    const current = this.getThingsTableRecordCount();
    if (typeof current === 'number' && current !== total && total > current) {
      return 'Name (' + Utility.formatNumber(current) + ' of ' + Utility.formatNumber(total) + ')';
    }
    
    return 'Name (' + Utility.formatNumber(total) + ')';
  }
  
  clickTemplateColumn(data: Thing): void {
    if (data && data.public) {
      data.copyPublicLink();
    }
  }
  
  isFavoriteByName(name: string): boolean {
    return (Utility.isValidString(name) &&
            name.indexOf('Favorite - ') === 0);
  }
  
  getThingsTableRecordCount(): number {
    if (this.thingTable && typeof this.thingTable.totalRecords === 'number') {
      return this.thingTable.totalRecords;
    }
    return Utility.getLength(this.things.data);
  }
  
  getManageTemplateLabel(): string {
    if (this.templateService.loading) {
      return 'Manage Templates';
    }
    let prefix = '';
    if (!Utility.isMobileSize()) {
      prefix += 'Manage ';
    }
    return prefix + this.templateService.getTemplateCount() + ' Template' + Utility.plural(this.templateService.data);
  }
  
  getDeleteLabel(): string {
    let toReturn = 'Delete ';
    if (!this.hasOneSelectedRow() && this.hasSelectedRows()) {
      toReturn += this.selectedRows.length;
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
          
          // Special case where we had searched to a specific thing and now deleted it
          // Which means we want to clear our search as well
          // this.clearSelectedRows();
          if (this.selectedRows?.length === this.thingTable?.filteredValue?.length &&
              this.selectedRows.every((row, index) => row.id === (this.thingTable.filteredValue as any[])[index].id)) {
            this.clearGlobalFilter();
          }
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
  
  quickviewFields(row: Thing, event: any): void {
    if (row.hasFieldsAsString()) {
      // Special case where if we're clicking a link inside our fields we don't bring up the dialog
      if (event && event.target && event.target instanceof Element) {
        if ('A' === (event.target as Element).tagName) {
          return;
        }
      }
      
      // After the row selection fires, we want to manage it manually
      // This is because if we have 4 rows selected from the user, then quickview
      //  something, and they go to delete the quickviewed item after edit,
      //  it can be easy to miss that such an action would actually delete the other 4 rows
      setTimeout(() => {
        this.clearSelectedRows();
        this.selectedRows.push(row);
      });
      
      this.quickviewFieldsDialog.show(row, this.manageThingDialog);
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
          toSave.time = addHours(new Date(), typeof favorite.timeRange === 'undefined' ? 0 : favorite.timeRange);
          toSave.reminder = favorite.autoReminder;
          toSave.applyTemplateTo(favorite);
          
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
      });
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
  
  hasViewCount(thing: Thing): boolean {
    return thing && typeof thing.viewCount === 'number' && thing.viewCount > 0;
  }
  
  getEmptyMessageClass(): string {
    // If we're on mobile pin the message so it stick as you scroll
    if (Utility.isMobileSize()) {
      return 'pos-fixed';
    }
    // Otherwise on desktop we want to center the message
    return 'center';
  }
  
  customSort(event: SortEvent) {
    if (event && event.data && event.field) {
      // Determine if we need to store our user sort settings
      if ((event.field !== this.userService.getUser().tableSortColumn) ||
          (typeof event.order === 'number' &&
           event.order !== this.userService.getUser().tableSortOrder)) {
        this.userService.setUserProps({
          tableSortColumn: event.field,
          tableSortOrder: event.order
        });
      }
      
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
        // Fallback to a direct compare
        else {
          result = value1 < value2 ? -1 : value1 > value2 ? 1 : 0;
        }
        
        return (event.order || 0) * result;
      });
    }
  }
  
  // Touch specific behaviour for table rows - we want to allow Editing if a user holds a touch on a row
  touchEditStart: number = 0;
  touchEditRow: Thing | null = null;
  touchEditTimer: any = null;
  readonly touchToEditMs: number = 1400;
  rowTouchStart(data: Thing) {
    // Store when our touch started, and the row we targetted
    this.touchEditStart = performance.now();
    this.touchEditRow = data;
    
    // Automatically start our edit after a set amount of time, so the user isn't left guessing if they can release the touch yet
    this.touchEditTimer = setTimeout(() => {
      if (this.touchEditTimer) {
        clearTimeout(this.touchEditTimer);
        this.touchEditTimer = null;
      }
      
      this.rowTouchEnd(data);
    }, this.touchToEditMs+10);
  }
  
  rowTouchEnd(data: Thing) {
    // Determine if we have a valid touch state to edit from
    if (this.touchEditRow && data &&
        this.touchEditRow === data &&
        performance.now() - this.touchEditStart > this.touchToEditMs) {
      this.selectedRows = [this.touchEditRow];
      this.requestEditSelected();
    }
    
    // Clear our related variables
    this.touchEditStart = 0;
    this.touchEditRow = null;
    if (this.touchEditTimer) {
      clearTimeout(this.touchEditTimer);
    }
  }
  
  isMobileSize(): boolean {
    return Utility.isMobileSize();
  }
}
