import { Component, Input, ViewChild } from '@angular/core';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-global-search-dialog',
  templateUrl: './global-search-dialog.component.html',
  styleUrls: ['./global-search-dialog.component.css']
})
export class GlobalSearchDialogComponent {
  @ViewChild('searchField') searchInput!: any;
  @Input() searchFunction!: Function;
  searchText: string = '';
  resultCount: number | null = null;
  isShowing: boolean = false;
  
  async performSearch() {
    this.searchFunction(this.searchText).then((res: number) => this.resultCount = res );
    
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.select();
    }
    
    Utility.fireWindowResize();
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
  
  hasSearchText(): boolean {
    return Utility.isValidString(this.searchText);
  }
  
  handleFocus(inputEl: HTMLElement): void {
    if (inputEl) {
      inputEl.focus();
    }
  }
}
