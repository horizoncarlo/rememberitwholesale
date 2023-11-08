export class TemplateField {
  property: string = '';
  label?: string = '';
  required?: boolean = false;
  type?: string = 'text';
  
  constructor(property: string, label?: string, required?: boolean, type?: string) {
    this.property = property;
    this.label = label || property;
    this.required = required || false;
    this.type = type || 'text';
  }
}