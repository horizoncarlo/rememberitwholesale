import { Component, OnDestroy, OnInit } from '@angular/core';
import { Message, MessageService } from 'primeng/api';

@Component({
  selector: 'riw-global-toast',
  templateUrl: './toast-message.component.html',
  styleUrls: ['./toast-message.component.css'],
  providers: [MessageService]
})
export class ToastMessageComponent implements OnInit, OnDestroy {
  constructor(private messageService: MessageService) { }
  
  ngOnInit(): void {
    window.addEventListener("message-success", this.showSuccess.bind(this) as EventListener);    
    window.addEventListener("message-info", this.showInfo.bind(this) as EventListener);    
    window.addEventListener("message-warn", this.showWarn.bind(this) as EventListener);    
    window.addEventListener("message-error", this.showError.bind(this) as EventListener);    
    window.addEventListener("message-clear-all", this.clearMessages.bind(this) as EventListener);
    window.addEventListener("message-clear-reminders", this.clearReminderMessages.bind(this) as EventListener);
  }
  
  ngOnDestroy(): void {
    window.removeEventListener('message-success', this.showSuccess.bind(this) as EventListener);
    window.removeEventListener('message-info', this.showInfo.bind(this) as EventListener);
    window.removeEventListener('message-warn', this.showWarn.bind(this) as EventListener);
    window.removeEventListener('message-error', this.showError.bind(this) as EventListener);
    window.removeEventListener('message-clear-all', this.clearMessages.bind(this) as EventListener);
    window.removeEventListener('message-clear-reminders', this.clearReminderMessages.bind(this) as EventListener);
  }
  
  showSuccess(event: CustomEvent): void {
    this._showGeneric('success', event.detail);
  }
  
  showInfo(event: CustomEvent): void {
    this._showGeneric('info', event.detail);
  }
  
  showWarn(event: CustomEvent): void {
    this._showGeneric('warn', event.detail);
  }
  
  showError(event: CustomEvent): void {
    this._showGeneric('error', event.detail);
  }
  
  clearMessages(): void {
    this.messageService.clear();
  }
  
  clearReminderMessages(): void {
    this.messageService.clear('reminderComplete');
  }
  
  postponeReminder(toMark: Message): void {
    if (toMark.data && toMark.data.postponeCallback &&
        typeof toMark.data.postponeCallback === 'function') {
      toMark.data.postponeCallback();
    }
    
    this.clearReminderMessages();
  }
  
  confirmResponse(toMark: Message): void {
    // Fire our callback if we have one, and regardless clear the messages
    if (toMark.data && toMark.data.confirmCallback &&
        typeof toMark.data.confirmCallback === 'function') {
      toMark.data.confirmCallback();
    }
    
    this.clearReminderMessages();
  }
  
  private _showGeneric(type: string = 'info', eventDetail: any): void {
    if (eventDetail) {
      const detail = eventDetail.detail || '';
      const summary = eventDetail.summary || '';
      const sticky = eventDetail.sticky || false;
      switch(type) {
        case 'error': console.error(detail, summary); break;
        case 'warn': console.warn(detail, summary); break;
        default: console.log(detail, summary); break;
      }
      
      // Determine our type of toast based on the incoming data
      let key = (eventDetail.confirmCallback && typeof eventDetail.confirmCallback === 'function') ? 'reminderComplete' : 'basic';
      if (eventDetail.forThing) {
        key = 'publicLink';
      }
      
      const opts: Message = {
        key: key || 'basic',
        severity: type,
        detail: detail,
        summary: summary,
        sticky: sticky,
      };
      
      // Apply our lifespan time as well, but only if it's defined, otherwise stick to component default
      if (typeof eventDetail.life === 'number') {
        opts.life = eventDetail.life;
      }
      
      if (opts.key === 'reminderComplete') {
        opts.data = {
          confirmCallback: eventDetail.confirmCallback,
          postponeCallback: eventDetail.postponeCallback
        };
      }
      else if (opts.key === 'publicLink') {
        opts.data = {
          forThing: eventDetail.forThing
        };
      }
      
      this.messageService.add(opts);
    }
  }
  
  clickPublicLinkInput(event: any): void {
    if (event && event.target) {
      event.target.select();
    }
  }
}
