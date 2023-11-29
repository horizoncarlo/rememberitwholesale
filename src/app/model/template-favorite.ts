import { Utility } from "../util/utility";
import { Template } from "./template";

/**
 * Slightly extended Template class, with attributes for a Favorited template
 * Such as auto setting a reminder, when to set the date to, etc.
 */
export class TemplateFavorite extends Template {
  autoReminder?: boolean;
  nameSuffix: string = '';
  timeRange: number = 0;
  
  constructor(parent: Template, autoReminder?: boolean, nameSuffix?: string, timeRange?: number) {
    super(parent.name, parent.color, parent.fields);
    
    this.autoReminder = autoReminder || false;
    if (nameSuffix && Utility.isValidString(nameSuffix)) {
      this.nameSuffix = nameSuffix;
    }
    this.timeRange = timeRange || 0;
  }
  
  static override cloneFrom(source: TemplateFavorite): TemplateFavorite {
    return new TemplateFavorite(new Template(source.name, source.color, source.fields),
                                source.autoReminder, source.nameSuffix, source.timeRange);
  }
}
