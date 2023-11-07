export class Thing {
  id: number;
  name: string;
  time?: Date;
  
  constructor(id: number, name: string, time?: Date) {
      this.id = id;
      this.name = name;
      this.time = time;
  }
}