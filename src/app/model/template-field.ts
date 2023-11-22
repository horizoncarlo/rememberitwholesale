import { Utility } from "../util/utility";

enum TemplateFieldTypes {
  Text = 'text',
  Textarea = 'textarea',
  // TODO Add the concept of an "infinite text" that let's a user keep adding to a single Thing. Basically sub-things, such as "Work Commute", then you mark each day & status for an entire month under the same Thing, instead of creating 30 individual Things
  Number = 'number',
  Dropdown = 'dropdown',
  Radio = 'radio',
  Date = 'date',
  Datetime = 'datetime'
};

export class TemplateField {
  static TYPES = TemplateFieldTypes;
  property: string = '';
  label?: string = '';
  required?: boolean = false;
  type?: TemplateFieldTypes = TemplateFieldTypes.Text;
  options?: string[] | undefined; // Defined if type is radio or dropdown, to give a list of available options for the user
  value?: string | null = null;
  
  constructor(property: string, label?: string, required?: boolean, type?: any, value?: string | null, options?: string[] | undefined) {
    this.property = property;
    this.label = label || property;
    this.required = required || false;
    this.type = type || TemplateFieldTypes.Text;
    this.value = value || null;
    this.options = options;
  }
  
  static cloneFrom(source: TemplateField) {
    return new TemplateField(source.property, source.label, source.required, source.type, source.value, source.options);
  }
  
  getLabel(): string {
    if (Utility.isValidString(this.label)) {
      return this.label as string;
    }
    return this.property;
  }
}