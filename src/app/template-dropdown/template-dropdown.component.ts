import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Template } from '../model/template';
import { TemplateService } from '../service/template.service';

@Component({
  selector: 'riw-template-dropdown',
  templateUrl: './template-dropdown.component.html',
  styleUrls: ['./template-dropdown.component.css']
})
export class TemplateDropdownComponent implements OnInit {
  @Input() selectedTemplate: Template | null = null;
  @Output() selectedTemplateChange = new EventEmitter<Template | null>();
  templateService: TemplateService = inject(TemplateService);
  
  constructor() { }
  
  ngOnInit(): void {
    // TODO TEMPORARY Test template service
    this.templateService.getAll();
  }
  
  selectedTemplateChanged() {
    this.selectedTemplateChange.emit(this.selectedTemplate);
  }
}
