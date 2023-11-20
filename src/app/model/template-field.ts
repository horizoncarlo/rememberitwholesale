import { Utility } from "../util/utility";

enum TemplateFieldTypes {
  Text = 'text',
  Number = 'number',
  Textarea = 'textarea'
};

export class TemplateField {
  static TYPES = TemplateFieldTypes;
  property: string = '';
  label?: string = '';
  required?: boolean = false;
  type?: TemplateFieldTypes = TemplateFieldTypes.Text;
  // TODO Need an "options" param for type=radio or type=dropdown, and then UI to support in Add New Thing for defining those options
  value?: string | null = null;
  
  constructor(property: string, label?: string, required?: boolean, type?: any, value?: string | null) {
    this.property = property;
    this.label = label || property;
    this.required = required || false;
    this.type = type || TemplateFieldTypes.Text;
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