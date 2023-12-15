import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Template, TemplateEvent } from '../model/template';
import { TemplateService } from '../service/template.service';

@Component({
  selector: 'riw-template-dropdown',
  templateUrl: './template-dropdown.component.html',
  styleUrls: ['./template-dropdown.component.css']
})
export class TemplateDropdownComponent implements OnInit {
  @Input() hideControls?: boolean = false;
  @Input() hideDefaults?: boolean = false;
  @Input() selectedTemplate: Template | null = null;
  @Input() keepValue: boolean = false; // Set to true to ensure that when our template is changed any `value` in each child fields is kept
  @Output() selectedTemplateChange = new EventEmitter<Template | null>();
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  templateService: TemplateService = inject(TemplateService);
  filteredData: Template[] = [];
  
  ngOnInit(): void {
    this.refreshData();
  }
  
  refreshData(): void {
    // TODO We should just get all the templates once on app load, and use a local cached version we update on any related operation. Currently this is over-calling as the dropdown shows. Note it IS handy to reset data, such as editing and removing fields from a template, and not wanting to keep those changes
    // Also note without the setTimeout we get the "NG0100: Expression has changed after it was checked" error
    setTimeout(() => {
      this.templateService.getAllTemplatesObs().subscribe({
        next: () => this.filteredData = this.templateService.getFilteredData(this.hideDefaults)
      });
    }, 0);
  }
  
  selectedTemplateChanged(): void {
    // Reset any fields of the template after changing, unless asked not too
    if (!this.keepValue && this.selectedTemplate) {
      this.selectedTemplate.clearValuesFromFields();
    }
    
    this.selectedTemplateChange.emit(this.selectedTemplate);
  }
  
  requestCreateTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'create' });
  }
  
  requestDeleteTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'delete', actOn: this.selectedTemplate });
  }  
}
