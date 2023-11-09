import { Utility } from "../util/utility";

export class TemplateField {
  property: string = '';
  label?: string = '';
  required: boolean = false;
  type?: string = 'text';
  value?: string | null = null;
  
  constructor(property: string, label?: string, required?: boolean, type?: string, value?: string | null) {
    this.property = property;
    this.label = label || property;
    this.required = required || false;
    this.type = type || 'text';
    this.value = value || null;
  }
  
  static cloneFrom(source: TemplateField) {
    return new TemplateField(source.property, source.label, source.required, source.type, source.value);
  }  
  
  getLabel(): string {
    if (Utility.isValidString(this.label)) {
      return this.label as string;
    }
    return this.property;
  }
}