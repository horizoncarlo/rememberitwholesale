import { isAfter } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { TemplateService } from '../service/template.service';
import { Utility } from '../util/utility';
import { Template } from './template';
import { TemplateField } from './template-field';

export const DEFAULT_ID = "progress";

export class Thing {
  name: string;
  templateType: string = '';
  fields: TemplateField[] = [];
  id: string;
  time?: Date;
  color?: string;
  reminder?: boolean;
  
  constructor(name: string, templateType: string = TemplateService.getDefaultName(), id?: string, color?: string, time?: Date, reminder?: boolean, fields?: TemplateField[]) {
    this.name = name;
    this.templateType = templateType;
    this.id = id ? id : DEFAULT_ID;
    this.color = color || 'inherit';
    this.reminder = reminder || false;
    this.fields = fields || [];
    
    // If we have an existing date just cast it
    if (time) {
      this.time = Utility.isValidString(time) ? new Date(time) : time;
    }
    // Otherwise round down to the nearest hour on a new Date
    else {
      this.time = this.roundDownToHour(new Date());
    }
    
    // If we have fields get them as actual TemplateField objects
    if (Utility.hasItems(this.fields)) {
      this.fields = this.fields.map((field) => {
        return TemplateField.cloneFrom(field);
      });
    }
  }
  
  static cloneFrom(source: Thing): Thing {
    return new Thing(source.name, source.templateType, source.id, source.color, source.time, source.reminder, source.fields);
  }
  
  roundDownToHour(time: Date): Date {
    if (!time) {
      time = new Date();
    }
    time.setHours(time.getHours() + Math.floor(time.getMinutes()/60));
    time.setMinutes(0, 0, 0); // Resets also seconds and milliseconds

    return time;
  }
  
  applyTemplateTo(source: Template | null): void {
    if (source) {
      this.templateType = source.name;
      this.color = source.color;
    }
  }
  
  prepareForSave(): void {
    if (!this.id || this.id === DEFAULT_ID) {
      this.id = uuidv4();
    }
    if (!this.time) {
      this.time = this.roundDownToHour(new Date());
    }
    if (!Utility.isValidString(this.templateType)) {
      this.templateType = TemplateService.getDefaultName();
    }
    
    // Can slightly trim down the object by removing false/empty values
    if (!this.reminder) { delete this.reminder; }
    if (Utility.hasItems(this.fields)) {
      this.fields?.forEach((currentField) => {
        if (!Utility.isValidString(currentField.value)) {
          delete currentField.value;
        }
        
        if (!currentField.required) {
          delete currentField.required;
        }
      });
    }
  }
  
  getFieldsAsString(): string {
    if (Utility.hasItems(this.fields)) {
      let toReturn: string = this.fields.map((field) => {
        return field.getLabel() + ' = ' + (field.value || 'N/A');
      }).join(', ');
      
      return toReturn;
    }
    return '';
  }
  
  timeInFuture(): boolean {
    return (this.time && isAfter(this.time, new Date())) ? true : false;
  }
  
  hasFutureReminder(): boolean {
    return (this.reminder && this.timeInFuture()) ? true : false;
  }
  
  isValid(): boolean {
    return Utility.isValidString(this.name);
  }
}