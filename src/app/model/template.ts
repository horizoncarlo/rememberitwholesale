import { TemplateField } from "./template-field";

export class Template {
  name: string;
  fields?: TemplateField[] = [];
  
  constructor(name: string, fields?: TemplateField[]) {
      this.name = name;
      this.fields = fields || [];
  }
}

export interface TemplateEvent {
  type: 'create' | 'edit' | 'delete',
  actOn?: Template | null
}