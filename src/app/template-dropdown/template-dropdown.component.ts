import { Component, OnInit, inject } from '@angular/core';
import { Template } from '../model/template';
import { TemplateService } from '../service/template.service';

@Component({
  selector: 'riw-template-dropdown',
  templateUrl: './template-dropdown.component.html',
  styleUrls: ['./template-dropdown.component.css']
})
export class TemplateDropdownComponent implements OnInit {
  selectedTemplate: Template | null = null;
  templateService: TemplateService = inject(TemplateService);
  
  constructor() { }
  
  ngOnInit(): void {
    // TODO TEMPORARY Test template service
    this.templateService.getAll();
  }
}
