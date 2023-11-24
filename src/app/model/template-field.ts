import { Utility } from "../util/utility";

enum TemplateFieldTypes {
  Text = 'text',
  Textarea = 'textarea',
  Number = 'number',
  Dropdown = 'dropdown',
  Radio = 'radio',
  Date = 'date',
  Datetime = 'datetime',
  Boolean = 'true/false',
  /* TODO Add an ongoing/infinite field idea:
  Ongoing = 'ongoing' // Could also be named Routine or Infinite or similar, but the idea is having a repeated date/input to keep track of ongoing events without flooding the table
  */
};

export class TemplateField {
  static TYPES = TemplateFieldTypes;
  property: string = '';
  label?: string = '';
  required?: boolean = false;
  type?: TemplateFieldTypes = TemplateFieldTypes.Text;
  options?: string[] | undefined; // Defined if type is radio or dropdown, to give a list of available options for the user
  value?: any | null = null;
  
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