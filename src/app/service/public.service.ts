import { Injectable } from "@angular/core";
import { Thing } from "../model/thing";
import { Utility } from "../util/utility";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export class PublicService {
  publicThingId: string | undefined;
  thing: Thing | undefined;
  
  constructor(public backend: StorageService) { }
  
  loadPublicThing(thingId: string, username: string): void {
    if (!this.publicThingId) {
      this.backend.getPublicThingById(thingId, username).subscribe({
        next: publicThing => {
          if (publicThing) {
            this.thing = Thing.cloneFrom(publicThing);
          }
        },
        error: err => {
          Utility.showErrorSticky('Failed to load public link - contact whoever gave it to you');
          console.error(err);
        }
      });
    }
    this.publicThingId = thingId;
  }
}