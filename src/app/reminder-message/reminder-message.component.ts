import { Component, EventEmitter, Input, Output } from '@angular/core';
import { differenceInHours, formatDistanceToNow, formatRelative } from 'date-fns';
import { Thing } from '../model/thing';

@Component({
  selector: 'riw-reminder-message',
  templateUrl: './reminder-message.component.html',
  styleUrls: ['./reminder-message.component.css']
})
export class ReminderMessageComponent {
  @Input() thing!: Thing;
  @Input() overdue?: boolean = false;
  @Output() onClick = new EventEmitter<Thing>();
  type: 'info' | 'warn' | 'error' | 'success' = 'info';
  
  clickReminder(): void {
    this.onClick.emit(this.thing);
  }
  
  determineType(): string {
    // If we're overdue, just go with success style
    if (this.overdue) {
      return 'success';
    }
    
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
      return formatDistanceToNow(this.thing.time, { addSuffix: true });
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
