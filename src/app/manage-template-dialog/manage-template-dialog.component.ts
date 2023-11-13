import { Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Template, TemplateEvent } from '../model/template';
import { TemplateField } from '../model/template-field';
import { TemplateService } from '../service/template.service';
import { ThingService } from '../service/thing.service';
import { Utility } from '../util/utility';

const DEFAULT_TEMPLATE_NAME = "Basic";

@Component({
  selector: 'riw-manage-template-dialog',
  templateUrl: './manage-template-dialog.component.html',
  styleUrls: ['./manage-template-dialog.component.css'],
  providers: [ConfirmationService]
})
export class ManageTemplateDialogComponent {
  thingService: ThingService = inject(ThingService);
  templateService: TemplateService = inject(TemplateService);
  nextFieldIndex: number = 0;
  operation: TemplateEvent['type'] = 'create';
  actOn: Template | null = new Template(DEFAULT_TEMPLATE_NAME);
  isShowing: boolean = false;
  nameIsDuplicate: boolean = false; // Is a create new template Name unique or not?
  lastCheckCount: number = 0;
  deleteThings: boolean = false;
  typeOptions: string[] = [
    'text',
    'number'
  ];
  
  constructor(private confirmationService: ConfirmationService) { }
  
  show(event?: any): void {
    // If we have an incoming event, set our state from that
    // Otherwise default to the Create action
    if (event) {
      event = event as TemplateEvent;
      this.operation = event.type;
      this.operationRadioClicked();
      if (event.actOn) {
        this.actOn = event.actOn;
      }
    }
    else {
      this.operation = 'create';
      this.operationRadioClicked();
    }
    
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  toggleCreateTemplateDialog(): void {
    this.isShowing ? this.hide() : this.show();
  }
  
  operationRadioClicked(): void {
    if (this.operation === 'create') {
      this.actOn = new Template(DEFAULT_TEMPLATE_NAME);
    }
    else if (this.operation === 'edit' ||
             this.operation === 'delete') {
      this.actOn = null;
    }
    
    if (this.operation === 'delete') {
      this.deleteTargetChanged();
    }
  }
  
  addField(): void {
    if (this.actOn) {
      if (!Utility.hasItems(this.actOn.fields)) {
        this.actOn.fields = [];
      }
      
      this.nextFieldIndex++;
      this.actOn.fields?.push(new TemplateField('new' + this.nextFieldIndex, 'New Field'));
    }
  }
  
  removeField(toRemove: TemplateField): void {
    if (toRemove && this.actOn &&
        this.actOn.fields && Utility.hasItems(this.actOn.fields) &&
        this.actOn.fields.indexOf(toRemove) !== -1) {
      this.actOn.fields?.splice(this.actOn.fields.indexOf(toRemove), 1);
    }
  }
  
  createNameChanged(event: Event): void {
    // Determine if our current name is unique among templates or not
    const nameToCheck: string = this.actOn ? this.actOn.name : '';
    if (Utility.isValidString(nameToCheck)) {
      Utility.debounce(() => {
        this.nameIsDuplicate = !this.templateService.isNameUnique(nameToCheck);
      });
    }
  }
  
  deleteTargetChanged(): void {
    this.lastCheckCount = 0;
    this.deleteThings = false;
  }
  
  checkForThings(): void {
    if (this.actOn) {
      this.lastCheckCount = this.thingService.countThingsUsingTemplate(this.actOn, true);
    }
  }
  
  resetColor(): void {
    if (this.actOn) {
      this.actOn.color = 'inherit';
    }
  }
  
  getSubmitLabel(): string {
    switch (this.operation) {
      case 'create': return 'Save New Template';
      case 'edit': return 'Save Changes';
      case 'delete': return 'Request Delete';
    }
  }
  
  submit(event: Event): void {
    if (!this.actOn) {
      return Utility.showError('Select a template to work on');
    }
    
    // Determine what part of CRUD were doing and apply the persistence changes
    if (this.operation ==='create') {
      if (!this.templateService.isNameUnique(this.actOn.name)) {
        return Utility.showError("Template name must be unique");
      }
      
      // TODO Ensure our fields have unique IDs between themselves
      
      this.templateService.saveNew(this.actOn);
      this.hide();
    }
    else if (this.operation === 'edit') {
      // TODO What will we do to any Things using an existing Template we just changed? Try to match fields? Delete data? Warn and overwrite? Wild idea: just remove Edit entirely?
      console.log("TODO Update an existing template", this.actOn);
    }
    if (this.operation === 'delete') {
      let message = 'Are you sure you want to delete "' + this.actOn.name + "'";
      if (this.deleteThings) {
        message += ' and ' + this.lastCheckCount + ' related Thing' + Utility.pluralNum(this.lastCheckCount);
      }
      message += '?';
      
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: message,
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          if (this.actOn) {
            this.templateService.deleteTemplate(this.actOn.name);
            this.hide();
          }
        },
        reject:() => {
        },
      });
    }
  }
  
  handleEnterKey(toCall: Function): void {
    if (toCall) {
      toCall();
    }
  }
}
