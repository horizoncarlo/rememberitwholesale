import { Component, Input, ViewChild } from '@angular/core';

@Component({
  selector: 'riw-global-search-dialog',
  templateUrl: './global-search-dialog.component.html',
  styleUrls: ['./global-search-dialog.component.css']
})
export class GlobalSearchDialogComponent {
  @ViewChild('searchField') searchInput!: any;
  @Input() searchFunction!: Function;
  searchText: string = '';
  isShowing: boolean = false;
  
  performSearch(): void {
    this.searchFunction(this.searchText);
    
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.select();
    }
  }
  
  performReset(): void {
    this.searchText = '';
    this.performSearch();
  }
  
  show(): void {
    this.isShowing = true;
  }
  
  hide(): void {
    this.isShowing = false;
  }
  
  handleFocus(inputEl: HTMLElement): void {
    if (inputEl) {
      inputEl.focus();
    }
  }
}
