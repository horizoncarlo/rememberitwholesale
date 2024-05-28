import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Thing } from "../model/thing";
import { StorageService } from "./storage.service";

@Injectable({
  providedIn: 'root'
})
export class PublicService {
  publicThingId: string | undefined;
  thing$: BehaviorSubject<Thing | null> = new BehaviorSubject<Thing | null>(null);
  
  constructor(public backend: StorageService) { }
  
  loadPublicThing(thingId: string, username: string): void {
    if (!this.publicThingId) {
      this.backend.getPublicThingById(thingId, username).subscribe({
        next: publicThing => {
          if (publicThing) {
            this.thing$.next(Thing.cloneFrom(publicThing));
          }
        },
        error: err => {
          this.thing$.error(err);
        }
      });
    }
    this.publicThingId = thingId;
  }
}