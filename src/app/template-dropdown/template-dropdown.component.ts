import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Template, TemplateEvent } from '../model/template';
import { TemplateField } from '../model/template-field';
import { TemplateService } from '../service/template.service';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-template-dropdown',
  templateUrl: './template-dropdown.component.html',
  styleUrls: ['./template-dropdown.component.css']
})
export class TemplateDropdownComponent implements OnInit {
  @Input() selectedTemplate: Template | null = null;
  @Output() selectedTemplateChange = new EventEmitter<Template | null>();
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  templateService: TemplateService = inject(TemplateService);
  
  ngOnInit(): void {
    // TODO TEMPORARY Test template service
    this.templateService.getAllTemplates();
  }
  
  selectedTemplateChanged(): void {
    // Reset any fields of the template after changing
    if (this.selectedTemplate && Utility.hasItems(this.selectedTemplate.fields)) {
      this.selectedTemplate.fields = this.selectedTemplate.fields?.map((currentField: TemplateField) => {
        currentField.value = null;
        return currentField;
      });
    }
    
    this.selectedTemplateChange.emit(this.selectedTemplate);
  }
  
  requestCreateTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'create' });
  }
  
  requestEditTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'edit', actOn: this.selectedTemplate });
  }
  
  requestDeleteTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'delete', actOn: this.selectedTemplate });
  }  
}
