import { TemplateField } from "./template-field";

export class Template {
  name: string;
  fields?: Array<TemplateField> = [];
  
  constructor(name: string, fields?: Array<TemplateField>) {
      this.name = name;
      this.fields = fields;
  }
}