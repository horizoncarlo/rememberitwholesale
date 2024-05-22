import { Injectable } from "@angular/core";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export class PublicService {
  publicThingId: string | undefined;
  
  constructor(public backend: StorageService) { }
  
  loadPublicThing(id: string): void {
    if (!this.publicThingId) {
      console.log("LOAD PUBLIC THING", id); // TTODO
      
      this.backend.getThingById(id).subscribe({
        next: res => {
          console.log("RES", res);
        },
        error: err => {
          console.error("ERR", err);
        }
      });
    }
    this.publicThingId = id;
  }
}