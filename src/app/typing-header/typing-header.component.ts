import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'riw-typing-header',
  standalone: true,
  templateUrl: './typing-header.component.html',
  styleUrl: './typing-header.component.css'
})
export class TypingHeaderComponent implements AfterViewInit, OnDestroy {
  @Input() text!: string;
  @Input() typingDelayMs: number = 120;
  @Input() blinkDelayMs: number = 400;
  @Input() transitionWaitDelayMs: number = 1000;
  @Input() backspaceEffect: boolean = true;
  
  @ViewChild('typingEffectOutput') typingEffectOutput!: ElementRef;
  
  typingInterval: any;
  blinkingInterval: any;
  hideUnderscore: boolean = false;
  
  ngAfterViewInit(): void {
    const target = this.typingEffectOutput.nativeElement;
    let stopAndWait = false;
    let letterCount = 1; // Set to 1 instead of 0 to start writing immediately
    let modifyCountBy = 1;
    
    this.typingInterval = setInterval(() => {
      // If we're stopping and waiting, just skip our functionality
      if (!stopAndWait) {
        target.textContent = this.text.substring(0, letterCount);
        
        // When we're just starting to write, or starting to backspace, handle differently
        if (letterCount === 0 || letterCount === this.text.length+1) {
          stopAndWait = true;
          
          // Wait a bit, then start writing/backspacing the opposite direction, if allowed
          if (this.backspaceEffect) {
            setTimeout(function() {
              modifyCountBy *= -1;
              letterCount += modifyCountBy;
              stopAndWait = false;
            }, this.transitionWaitDelayMs);
          }
        }
        else {
          letterCount += modifyCountBy;
        }
      }
    }, this.typingDelayMs);
    
    // Blink the underscore
    this.blinkingInterval = setInterval(() => {
      this.hideUnderscore = !this.hideUnderscore
    }, this.blinkDelayMs);
  }
  
  ngOnDestroy(): void {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
    if (this.blinkingInterval) {
      clearInterval(this.blinkingInterval);
    }
  }
}
