import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

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
  }
  
  ngOnDestroy(): void {
    window.removeEventListener('message-success', this.showSuccess.bind(this) as EventListener);
    window.removeEventListener('message-info', this.showInfo.bind(this) as EventListener);
    window.removeEventListener('message-warn', this.showWarn.bind(this) as EventListener);
    window.removeEventListener('message-error', this.showError.bind(this) as EventListener);
  }

  showSuccess(event: CustomEvent): void {
    this._showGeneric('success', event.detail.detail, event.detail.summary, event.detail.sticky);
  }
  
  showInfo(event: CustomEvent): void {
    this._showGeneric('info', event.detail.detail, event.detail.summary, event.detail.sticky);
  }
  
  showWarn(event: CustomEvent): void {
    this._showGeneric('warn', event.detail.detail, event.detail.summary, event.detail.sticky);
  }
  
  showError(event: CustomEvent): void {
    this._showGeneric('error', event.detail.detail, event.detail.summary, event.detail.sticky);
  }
  
  private _showGeneric(type: string = 'info', detail: string, summary?: string, sticky?: boolean): void {
    switch(type) {
      case 'error': console.error(detail, summary); break;
      case 'warn': console.warn(detail, summary); break;
      default: console.log(detail, summary); break;
    }
    
    this.messageService.add({
      severity: type,
      detail: detail,
      summary: summary,
      sticky: sticky || false
    });    
  }
}
