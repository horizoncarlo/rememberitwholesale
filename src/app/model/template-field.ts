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
  Chooser = 'random chooser'
};

export class TemplateField {
  static TYPES = TemplateFieldTypes;
  property: string = ''; // Basically the `id`
  label?: string = '';
  required?: boolean = false;
  type?: TemplateFieldTypes = TemplateFieldTypes.Text;
  options?: string[] | undefined; // Defined if type is list related (like dropdown), to give a list of available options for the user
  value?: any | null = null;
  
  constructor(property: string, label?: string, required?: boolean, type?: any, value?: any | null, options?: string[] | undefined) {
    this.property = property;
    this.label = label || property;
    this.required = required || false;
    this.type = type || TemplateFieldTypes.Text;
    this.value = value;
    this.options = options;
  }
  
  static cloneFrom(source: TemplateField) {
    return new TemplateField(source.property, source.label, source.required, source.type, source.value, source.options);
  }
  
  handleRandomChooser(field: TemplateField): void {
    if (field.type === TemplateFieldTypes.Chooser &&
        Utility.hasItems(field?.options) &&
        field.options) { // Needed to stop TS from complaining about options usage
      field.value = field.options[Utility.getRandomInt(0, field.options.length-1)];
    }
  }
  
  getLabel(): string {
    if (Utility.isValidString(this.label)) {
      return this.label as string;
    }
    return this.property;
  }
}