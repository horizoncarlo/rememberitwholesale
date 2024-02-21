import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Template, TemplateEvent } from '../model/template';
import { TemplateService } from '../service/template.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-template-dropdown',
  templateUrl: './template-dropdown.component.html',
  styleUrls: ['./template-dropdown.component.css']
})
export class TemplateDropdownComponent implements OnInit {
  @Input() hideControls?: boolean = false;
  @Input() hideDefaults?: boolean = false;
  @Input() selectedTemplateName: string | null = null;
  @Output() selectedTemplateNameChange = new EventEmitter<string | null>();
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  filteredData: Template[] = [];
  
  constructor(public templateService: TemplateService) { }
  
  ngOnInit(): void {
    this.refreshData();
  }
  
  refreshData(): void {
    // Note without the setTimeout we get the "NG0100: Expression has changed after it was checked" error
    setTimeout(() => {
      this.templateService.getAllTemplatesObs().subscribe({
        next: () => this.filteredData = this.templateService.getFilteredData(this.hideDefaults)
      });
    }, 0);
  }
  
  autocompleteData(event: AutoCompleteCompleteEvent): void {
    // If we have a query filter by it, otherwise use all the data
    if (event && Utility.isValidString(event.query)) {
      this.filteredData = this.templateService.getFilteredData(this.hideDefaults).filter(
        (template: Template) => template.name.toLowerCase().includes(event.query.toLowerCase())
      );
    }
    else {
      this.filteredData = this.templateService.getFilteredData(this.hideDefaults);
    }
  }
  
  selectedTemplateChanged(): void {
    // From our autocomplete we get an object back, so strip the name
    // Remember we intentionally want to track with names so the state of the Fields doesn't disrupt our selection
    if (this.selectedTemplateName &&
        typeof this.selectedTemplateName === 'object') {
        this.selectedTemplateName = (this.selectedTemplateName as Template).name;
    }
    
    this.selectedTemplateNameChange.emit(this.selectedTemplateName);
  }
  
  getSelectedTemplate(): Template | null {
    if (this.selectedTemplateName &&
      typeof this.selectedTemplateName === 'object') {
      return this.selectedTemplateName as Template;
    }
    
    return this.templateService.getTemplateByName(this.selectedTemplateName as string);
  }
  
  requestCreateTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'create' });
  }
  
  requestDeleteTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'delete', actOn: this.getSelectedTemplate() });
  }  
  
  isMobileSize(): boolean {
    return Utility.isMobileSize();
  }
}
