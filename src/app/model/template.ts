import { TemplateField } from "./template-field";

export class Template {
  name: string;
  fields?: TemplateField[] = [];
  isDefault: boolean = false; // Can't be set from the API, but if present, the template can't be edited/deleted
  
  constructor(name: string, fields?: TemplateField[]) {
    this.name = name;
    this.fields = fields || [];
  }
}

export interface TemplateEvent {
  type: 'create' | 'edit' | 'delete',
  actOn?: Template | null
}