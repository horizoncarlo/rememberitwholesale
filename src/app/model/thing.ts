import { v4 as uuidv4 } from 'uuid';
import { Utility } from '../util/utility';

export const DEFAULT_ID = "progress";

export class Thing {
  id: string;
  name: string;
  time?: Date;
  
  constructor(name: string, id?: string, time?: Date) {
      this.name = name;
      this.id = id ? id : DEFAULT_ID;
      this.time = time;
  }
  
  prepareForSave(): void {
    if (!this.id || this.id === DEFAULT_ID) {
      this.id = uuidv4();
    }
    if (!this.time) {
      this.time = new Date();
    }
  }
  
  isValid(): boolean {
    return Utility.isValidString(this.name);
  }
}