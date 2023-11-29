import { Utility } from "../util/utility";
import { TemplateField } from "./template-field";

export class Template {
  name: string;
  fields?: TemplateField[] = [];
  color?: string;
  isDefault?: boolean = false; // Can't be set from the API, but if present, the template can't be edited/deleted
  
  constructor(name: string, color?: string, fields?: TemplateField[], isDefault?: boolean) {
    this.name = name;
    this.color = color || 'inherit';
    this.isDefault = isDefault || false;
    this.fields = fields || [];
    
    // Cast our fields as well
    if (Utility.hasItems(this.fields)) {
      this.fields = this.fields.map((current: TemplateField) => {
        return TemplateField.cloneFrom(current);
      });
    }
  }
  
  static cloneFrom(source: Template): Template {
    return new Template(source.name, source.color, source.fields, source.isDefault);
  }
  
  hasFields(): boolean {
    return Utility.hasItems(this.fields);
  }
  
  hasOneField(): boolean {
    if (this.fields) {
      return Utility.getLength(this.fields) === 1;
    }
    return false;
  }
  
  clearValuesFromFields(): void {
    if (Utility.hasItems(this.fields)) {
      this.fields = this.fields?.map((currentField: TemplateField) => {
        currentField.value = null;
        return currentField;
      });
    }
  }
  
  prepareForSave(): void {
    if (!this.color) {
      this.color = 'inherit';
    }
    
    // Clear isDefault and color (if default), as we don't use it for the API
    delete this.isDefault;
    if (Utility.isValidString(this.color) && this.color === 'inherit') {
      delete this.color;
    }
    
    // Loop through fields and clear "value", as those aren't saved as part of the template
    if (Utility.hasItems(this.fields)) {
      this.fields?.forEach((currentField) => {
        delete currentField.value;
        
        // Can slightly trim down the object by removing false values
        if (!currentField.required) {
          delete currentField.required;
        }
      });
    }
  }
  
  isValid(): boolean {
    return Utility.isValidString(this.name);
  }
}

export interface TemplateEvent {
  type: 'create' | 'favorite' | 'delete',
  actOn?: Template | null
}