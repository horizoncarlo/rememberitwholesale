import { Component, OnInit, inject } from '@angular/core';
import { ConfirmationService, PrimeNGConfig } from 'primeng/api';
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
}
