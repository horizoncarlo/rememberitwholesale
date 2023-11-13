import { Utility } from "../util/utility";
import { TemplateField } from "./template-field";

export class Template {
  name: string;
  fields?: TemplateField[] = [];
  color?: string;
  isDefault: boolean = false; // Can't be set from the API, but if present, the template can't be edited/deleted
  
  constructor(name: string, color?: string, fields?: TemplateField[]) {
    this.name = name;
    this.color = color || 'inherit';
    this.fields = fields || [];
  }
  
  prepareForSave(): void {
    if (!this.color) {
      this.color = 'inherit';
    }
  }
  
  isValid(): boolean {
    return Utility.isValidString(this.name);
  }
}

export interface TemplateEvent {
  type: 'create' | 'edit' | 'delete',
  actOn?: Template | null
}