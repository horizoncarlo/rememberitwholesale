
export class Thing {
  id: string;
  name: string;
  time?: Date;
  
  constructor(id: string, name: string, time?: Date) {
      this.id = id;
      this.name = name;
      this.time = time;
  }
  
  toString(): string {
    return this.name;
  }
}