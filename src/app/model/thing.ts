import { addMonths, formatDistanceStrict, isAfter, isBefore, subHours } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { TemplateService } from '../service/template.service';
import { Utility } from '../util/utility';
import { Template } from './template';
import { TemplateField } from './template-field';

export const DEFAULT_ID = "progress";

export class Thing {
  name: string;
  templateType: string = '';
  id: string;
  time?: Date;
  color?: string;
  reminder?: boolean;
  updated: Date | undefined;
  fields: TemplateField[] = [];
  fieldsAsString: string; // TODO Convert fields to RxJS so we can maintain a string version automatically instead of manually like we do now
  
  constructor(name: string,
              templateType: string = TemplateService.getDefaultName(),
              options?: {
                id?: string,
                color?: string,
                time?: Date,
                reminder?: boolean,
                updated: Date | undefined,
                fields?: TemplateField[],
              }) {
    this.name = name;
    this.templateType = templateType;
    this.id = (options && options.id) ? options.id : DEFAULT_ID;
    this.color = options && options.color || 'inherit';
    this.reminder = options && options.reminder || false;
    this.fields = options && options.fields || [];
    
    // If we have an existing date just cast it
    if (options && options.time) {
      this.time = Utility.isValidString(options.time) ? new Date(options.time) : options.time;
    }
    // Otherwise round down to the nearest hour on a new Date
    else {
      this.time = this.roundDownToHour(new Date());
    }
    
    // Do the same casting for Updated
    if (options && options.updated) {
      this.updated = Utility.isValidString(options.updated) ? new Date(options.updated) : options.updated;
    }
    // Otherwise use no date
    else {
      delete this.updated;
    }
    
    // If we have fields get them as actual TemplateField objects
    if (Utility.hasItems(this.fields)) {
      this.fields = this.fields.map((field) => {
        return TemplateField.cloneFrom(field);
      });
    }
    this.fieldsAsString = this._convertFieldsToString();
  }
  
  static cloneFrom(source: Thing): Thing {
    return new Thing(source.name, source.templateType,
                     { id: source.id, color: source.color, time: source.time, reminder: source.reminder, updated: source.updated, fields: source.fields });
  }
  
  roundDownToHour(time: Date): Date {
    if (!time) {
      time = new Date();
    }
    time.setHours(time.getHours() + Math.floor(time.getMinutes()/60));
    time.setMinutes(0, 0, 0); // Resets also seconds and milliseconds

    return time;
  }
  
  getUpdated(): string {
    if (this.updated) {
      let toReturn = formatDistanceStrict(this.updated, new Date(), { addSuffix: true });
      
      // If we're at "seconds", just return simple text instead
      if (toReturn.indexOf('second') !== -1) {
        return 'New';
      }
      
      // Otherwise shorthand format
      toReturn = toReturn.replace(' minute', 'm');
      toReturn = toReturn.replace(' hour', 'h');
      toReturn = toReturn.replace(' day', 'd');
      toReturn = toReturn.replace(' month', 'mon');
      toReturn = toReturn.replace(' year', 'y');
      
      // Then remove any plural leftovers
      toReturn = toReturn.replace('s', '');
      
      return toReturn;
    }
    return '';
  }
  
  applyTemplateTo(source: Template | null): void {
    if (source) {
      this.templateType = source.name;
      this.color = source.color;
      
      if (source.fields) {
        this.fields = source.fields;
        this.fieldsAsString = this._convertFieldsToString();
      }
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
    
    // Set in our updated date
    this.updated = new Date();
    
    // Can slightly trim down the object by removing false/empty values
    if (!this.reminder) { delete this.reminder; }
    if (Utility.hasItems(this.fields)) {
      this.fields?.forEach((currentField) => {
        if (!Utility.isDefinedNotNull(currentField.value)) {
          delete currentField.value;
        }
        
        if (!currentField.required) {
          delete currentField.required;
        }
        
        if (!Utility.isArray(currentField.options)) {
          delete currentField.options;
        }
      });
    }
  }
  
  hasFields(): boolean {
    return Utility.hasItems(this.fields);
  }
  
  private _convertFieldsToString(): string {
    if (this.hasFields()) {
      let toReturn: string = this.fields.map((field) => {
        return field.getLabel() + ' = ' + ((typeof field.value !== 'undefined' && field.value !== null) ? field.value : 'N/A');
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
  
  /**
   * Return true if our reminder is in the far future, which we consider over a month away
   */
  hasFarFutureReminder(): boolean {
    return (this.hasFutureReminder() && this.time && isBefore(this.time, addMonths(new Date(), 1))) ? true : false;
  }
  
  /**
   * Return true if we have a fresh reminder that is in the past, but only up to an hour ago
   */
  hasFreshOverdueReminder(): boolean {
    return (this.reminder && this.time &&
            isAfter(this.time, subHours(new Date(), 1))) ? true : false;
  }
  
  isValid(): boolean {
    return Utility.isValidString(this.name);
  }
}