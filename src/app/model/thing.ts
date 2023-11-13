import { v4 as uuidv4 } from 'uuid';
import { TemplateService } from '../service/template.service';
import { Utility } from '../util/utility';
import { TemplateField } from './template-field';

export const DEFAULT_ID = "progress";

export class Thing {
  name: string;
  templateType: string = '';
  fields: TemplateField[] = [];
  id: string;
  time?: Date;
  
  constructor(name: string, templateType: string = TemplateService.getDefaultName(), id?: string, time?: Date, fields?: TemplateField[]) {
    this.name = name;
    this.templateType = templateType;
    this.id = id ? id : DEFAULT_ID;
    this.time = time;
    this.fields = fields || [];
    
    // If we have fields get them as actual TemplateField objects
    if (Utility.hasItems(this.fields)) {
      this.fields = this.fields.map((field) => {
        return TemplateField.cloneFrom(field);
      });
    }
  }
  
  static cloneFrom(source: Thing) {
    return new Thing(source.name, source.templateType, source.id, source.time, source.fields);
  }
  
  prepareForSave(): void {
    if (!this.id || this.id === DEFAULT_ID) {
      this.id = uuidv4();
    }
    if (!this.time) {
      this.time = new Date();
    }
    if (!Utility.isValidString(this.templateType)) {
      this.templateType = TemplateService.getDefaultName();
    }
  }
  
  getFieldsAsString(): string {
    if (Utility.hasItems(this.fields)) {
      let toReturn: string = this.fields.map((field) => {
        return field.getLabel() + ' = ' + field.value;
      }).join(', ');
      
      return toReturn;
    }
    return '';
  }
  
  isValid(): boolean {
    return Utility.isValidString(this.name);
  }
}