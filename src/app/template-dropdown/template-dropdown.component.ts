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
  @Input() selectedTemplateName: string | null = null;
  @Output() selectedTemplateNameChange = new EventEmitter<string | null>();
  @Output() manageTemplateEvent = new EventEmitter<TemplateEvent>();
  templateService: TemplateService = inject(TemplateService);
  
  ngOnInit(): void {
    this.refreshData();
  }
  
  refreshData(): void {
    // Note without the setTimeout we get the "NG0100: Expression has changed after it was checked" error
    setTimeout(() => {
      this.templateService.getAllTemplatesObs().subscribe();
    }, 0);
    
    this.selectedTemplateName = null;
  }
  
  getSelectedTemplate(): Template | null {
    return this.templateService.getTemplateByName(this.selectedTemplateName as string);
  }
  
  selectedTemplateChanged(): void {
    this.selectedTemplateNameChange.emit(this.selectedTemplateName);
  }
  
  requestCreateTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'create' });
  }
  
  requestDeleteTemplate(): void {
    this.manageTemplateEvent.emit({ type: 'delete', actOn: this.getSelectedTemplate() });
  }  
}
