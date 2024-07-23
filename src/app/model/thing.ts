import { addMonths, formatDistanceStrict, isAfter, isBefore, subHours } from 'date-fns';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import { TemplateService } from '../service/template.service';
import { SimpleUpload } from '../service/thing.service';
import { Utility } from '../util/utility';
import { Template } from './template';
import { TemplateField } from './template-field';

export const PUBLIC_THING_PAGE = 'public.html';
export const PUBLIC_THING_PARAM = 't';
export const PUBLIC_USER_PARAM = 'u';
export const DEFAULT_ID = "progress";

export class Thing {
  name: string;
  templateType: string = '';
  id: string;
  time?: Date;
  color?: string;
  reminder?: boolean;
  public?: boolean = false;
  gallery?: boolean = false;
  uploads?: SimpleUpload[];
  updated: Date | undefined;
  fields: TemplateField[] = [];
  fieldsAsString: string | undefined; // TODO Convert fields to Angular Signals or RxJS so we can maintain a string version automatically instead of manually like we do now
  flagsAsString: string | undefined;
  
  constructor(name: string,
              templateType: string = TemplateService.getDefaultName(),
              options?: {
                id?: string,
                color?: string,
                time?: Date,
                reminder?: boolean,
                public?: boolean,
                gallery?: boolean,
                uploads?: SimpleUpload[],
                updated: Date | undefined,
                fields?: TemplateField[],
              }) {
    this._setupMarkedParsing();
                
    this.name = name;
    this.templateType = templateType;
    this.id = (options && options.id) ? options.id : DEFAULT_ID;
    this.color = options && options.color || 'inherit';
    this.reminder = options && options.reminder || false;
    this.public = options && options.public || false;
    this.gallery = options && options.gallery || false;
    if (options && options.uploads) {
      this.uploads = options && options.uploads;
    }
    this.fields = options && options.fields || [];
    
    // If we have an existing date just cast it
    if (options && options.time) {
      this.time = Utility.isValidString(options.time) ? new Date(options.time) : options.time;
    }
    // Otherwise round down to the nearest hour on a new Date
    else {
      this.time = this.roundDownToHour(new Date());
    }
    
    // Do the same casting for Updated
    if (options && options.updated) {
      this.updated = Utility.isValidString(options.updated) ? new Date(options.updated) : options.updated;
    }
    // Otherwise use no date
    else {
      delete this.updated;
    }
    
    // If we have fields get them as actual TemplateField objects
    if (Utility.hasItems(this.fields)) {
      this.fields = this.fields.map((field) => {
        return TemplateField.cloneFrom(field);
      });
    }
    this.fieldsAsString = this.convertFieldsToString();
    this.flagsAsString = this.convertFlagsToString();
  }
  
  private _setupMarkedParsing(): void {
    const renderer = new marked.Renderer();
    
    // Append a blank target to all our links so we ensure they open in a new window/tab
    renderer.link = ({ href, title, text }: any): string => {
      const defaultLink = `<a href="${href}"${title ? ` title="${title}"` : ''}>${text}</a>`;
      return defaultLink.replace('<a', '<a target="_blank"');
    };
    
    marked.use({ renderer });
  }
  
  static cloneFrom(source: Thing): Thing {
    return new Thing(source.name, source.templateType,
                     { id: source.id,
                      color: source.color,
                      time: source.time,
                      reminder: source.reminder,
                      public: source.public,
                      gallery: source.gallery,
                      uploads: source.uploads,
                      updated: source.updated,
                      fields: source.fields });
  }
  
  generatePublicLink(): string {
    if (this.updated) {
      // If we've been saved before then we can generate a link
      // Lengthy way to try to efficiently generate a link like http://oursite.com/?t=thingid&u=username
      return `${window.location.protocol}//${window.location.hostname}${Utility.isValidString(window.location.port) ? (':' + window.location.port) : ''}/${PUBLIC_THING_PAGE}?${PUBLIC_THING_PARAM}=${this.id}&${PUBLIC_USER_PARAM}=${Utility.getLocalUsername()}`;
    }
    return 'Needs to save first';
  }
  
  copyPublicLink(silent?: boolean): void {
    if (this.public) {
      Utility.copyToClipboard(this.generatePublicLink()).then(res => {
        if (!silent) {
          Utility.showSuccess('Copied shareable link to your clipboard');
        }
      }).catch(err => {
        if (!silent) {
          Utility.showError('Failed to copy the fields to your clipboard');
        }
        console.error(err);
      });
    }
  }
  
  roundDownToHour(time: Date): Date {
    if (!time) {
      time = new Date();
    }
    time.setHours(time.getHours() + Math.floor(time.getMinutes()/60));
    time.setMinutes(0, 0, 0); // Resets also seconds and milliseconds

    return time;
  }
  
  hasFieldsAsString(): boolean {
    return Utility.isValidString(this.fieldsAsString);
  }
  
  getUpdated(longForm?: boolean): string {
    if (this.updated) {
      let toReturn = formatDistanceStrict(this.updated, new Date(), { addSuffix: true });
      
      // If we're at "seconds", just return simple text instead
      if (toReturn.indexOf('second') !== -1) {
        return 'New';
      }
      
      if (!longForm) {
        // Otherwise shorthand format
        toReturn = toReturn.replace(' minute', 'm');
        toReturn = toReturn.replace(' hour', 'h');
        toReturn = toReturn.replace(' day', 'd');
        toReturn = toReturn.replace(' month', 'mon');
        toReturn = toReturn.replace(' year', 'y');
      
        // Then remove any plural leftovers
        toReturn = toReturn.replace('s', '');
      }
      
      return toReturn;
    }
    return '?';
  }
  
  applyTemplateTo(source: Template | null): void {
    if (source) {
      this.templateType = source.name;
      this.color = source.color;
      
      if (source.fields) {
        this.fields = source.fields;
        this.fieldsAsString = this.convertFieldsToString();
        this.flagsAsString = this.convertFlagsToString();
      }
    }
  }
  
  prepareForSave(): void {
    if (!this.id || this.id === DEFAULT_ID) {
      this.id = uuidv4();
    }
    if (!this.time) {
      this.time = this.roundDownToHour(new Date());
    }
    if (!Utility.isValidString(this.templateType)) {
      this.templateType = TemplateService.getDefaultName();
    }
    
    // Set in our updated date
    this.updated = new Date();
    
    // Can slightly trim down the object by removing false/empty values
    if (!this.reminder) { delete this.reminder; }
    if (!this.public) { delete this.public; }
    if (!this.gallery) { delete this.gallery; }
    if (!this.uploads) { delete this.uploads; }
    if (Utility.hasItems(this.fields)) {
      this.fields?.forEach((currentField) => {
        if (!Utility.isDefinedNotNull(currentField.value)) {
          delete currentField.value;
        }
        
        if (!currentField.required) {
          delete currentField.required;
        }
        
        if (!Utility.isArray(currentField.options)) {
          delete currentField.options;
        }
      });
    }
    
    // Clear color (if default)
    if (Utility.isValidString(this.color) && this.color === 'inherit') {
      delete this.color;
    }
    
    // Can also remove fieldsAsString as that's purely for the UI
    delete this.fieldsAsString;
    delete this.flagsAsString;
  }
  
  hasFields(): boolean {
    return Utility.hasItems(this.fields);
  }
  
  convertFieldsToString(params?: { noLabels?: boolean }): string {
    if (this.hasFields()) {
      // Some tough choices overall on how to display the custom fields in a usable way
      let toReturn: string = this.fields.map((field) => {
        if (typeof field.value !== 'undefined' && field.value !== null) {
          let textLabel = null;
          // Special case just for Notes, where we don't need a header
          if (field.label === 'Notes' &&
              this.fields.length === 1 &&
              field.type === TemplateField.TYPES.Textarea) {
            textLabel = '';
          }
          else {
            // If our label ends with a question mark, don't put a colon
            let suffix = field.label?.endsWith('?') ? ' ' : ': ';
            
            // If the field is a text area, use a breakline so it's more like a header
            let useBreakline = false;
            if (field.type === TemplateField.TYPES.Textarea) {
              suffix = '';
              useBreakline = true;
            }
            
            textLabel = '<b>' + field.getLabel() + '</b>' + suffix +
                        (useBreakline ? '<br/>' : '');
          }
          
          // If we're a Markdown type, convert to HTML
          let textValue = field.value + '';
          if (field.type === TemplateField.TYPES.Markdown) {
            textValue = marked.parse(textValue) as string;
          }
          // If we're a plain string replace any \n and \t, such as textareas, so they maintain their formatting
          // Don't do this for Markdown as we already have converted it
          else if (typeof field.value === 'string') {
            textValue = textValue.replaceAll("\n", "<br/>");
            textValue = textValue.replaceAll("\t", "    ");
          }
          
          // Convert our boolean to Yes/No for readability
          if (typeof field.value === 'boolean') {
            textValue = field.value ? 'Yes' : 'No';
          }
          // Check for any links and automatically parse them to clickable versions
          // Except, again, for Markdown, which does it automatically
          else if (field.type !== TemplateField.TYPES.Markdown) {
            textValue = Utility.anchorUrlsInText(textValue);
          }
          
          // After all that work don't append our label if asked
          if (params && params.noLabels) {
            return textValue;
          }
          
          return textLabel + textValue;
        }
        return null;
      }).filter(Boolean).join('<br/>'); // Strip empty results and add a breakline
      
      return toReturn;
    }
    return '';
  }
  
  convertFlagsToString(): string {
    const flagArray = [];
    if (this.reminder) {
      flagArray.push('reminder');
    }
    if (this.public) {
      flagArray.push('public');
    }
    if (this.gallery) {
      flagArray.push('gallery');
    }
    return flagArray.join(',');
  }
  
  timeInFuture(): boolean {
    return (this.time && isAfter(this.time, new Date())) ? true : false;
  }
  
  hasFutureReminder(): boolean {
    return (this.reminder && this.timeInFuture()) ? true : false;
  }
  
  /**
   * Return true if our reminder is in the far future, which we consider over a month away
   */
  hasFarFutureReminder(): boolean {
    return (this.hasFutureReminder() && this.time && isBefore(this.time, addMonths(new Date(), 1))) ? true : false;
  }
  
  /**
   * Return true if we have a fresh reminder that is in the past, but only up to an hour ago
   */
  hasFreshOverdueReminder(): boolean {
    return (this.reminder && this.time &&
            isAfter(this.time, subHours(new Date(), 1))) ? true : false;
  }
  
  isValid(): boolean {
    return Utility.isValidString(this.name);
  }
}