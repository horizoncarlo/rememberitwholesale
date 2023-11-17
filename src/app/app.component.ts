import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ConfirmationService, PrimeNGConfig, SortEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { Thing } from './model/thing';
import { TemplateService } from './service/template.service';
import { ThingService } from './service/thing.service';
import { Utility } from './util/utility';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ConfirmationService]
})
export class AppComponent implements OnInit {
  @ViewChild('thingTable') thingTable!: Table;
  things: ThingService = inject(ThingService);
  templateService: TemplateService = inject(TemplateService);
  selectedRows: Thing[] = [];
  
  constructor(private primengConfig: PrimeNGConfig,
              private confirmationService: ConfirmationService) { }
  
  ngOnInit(): void {
    this.primengConfig.ripple = true;
    
    // Get our initial data load
    this.things.getAllThings();
  }
  
  globalFilterTable(event: any): void {
    this.thingTable.filterGlobal(event.target.value, 'contains');
  }
  
  filterFields(event: any): void {
    this.thingTable.filteredValue =
      this.things.data.filter((thing: Thing) => thing.getFieldsAsString().toLocaleLowerCase().indexOf(event.target.value.toLowerCase()) !== -1);
  }
  
  getDeleteLabel(): string {
    let toReturn = 'Delete';
    if (this.hasSelectedRows()) {
      toReturn += ' ' + this.selectedRows.length + ' Thing' + Utility.plural(this.selectedRows);
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
  
  clearSelectedRows(): void {
    this.selectedRows = [];
  }
  
  hasSelectedRows(): boolean {
    return Utility.hasItems(this.selectedRows);
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
