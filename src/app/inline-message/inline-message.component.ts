import { Component, Input } from '@angular/core';
import { differenceInHours, formatDistanceToNow, formatRelative } from 'date-fns';
import { Thing } from '../model/thing';

@Component({
  selector: 'riw-inline-message',
  templateUrl: './inline-message.component.html',
  styleUrls: ['./inline-message.component.css']
})
export class InlineMessageComponent {
  @Input() thing!: Thing;
  type: 'info' | 'warn' | 'error' = 'info';
  
  determineType(): string {
    // Based on the remaining time, change our severity. Note the severity just matches our component styling, so the names don't really make sense here
    if (this.thing.time) {
      // Logic is 'error' is less than an hour, 'warn' is that day, and 'info' is everything else
      const hoursLeft = differenceInHours(this.thing.time, new Date());
      if (hoursLeft <= 1) {
        return 'error';
      }
      else if (hoursLeft <= 24) {
        return 'warn';
      }
    }
    return 'info';
  }
  
  distanceDate(): string {
    if (this.thing.time) {
      // Show how far away, such as "in about an hour"
      return formatDistanceToNow(this.thing.time);
    }
    return '???';
  }
  
  relativeDate(): string {
    if (this.thing.time) {
      // Show schedule style time, such as "tomorrow at 8:00 PM"
      return formatRelative(this.thing.time, new Date());
    }
    return 'Unknown Time';
  }
}
