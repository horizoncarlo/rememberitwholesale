import { Component, HostListener, Input, OnDestroy, ViewChild } from '@angular/core';
import { Utility } from '../util/utility';

@Component({
  selector: 'riw-global-search-dialog',
  templateUrl: './global-search-dialog.component.html',
  styleUrls: ['./global-search-dialog.component.css']
})
export class GlobalSearchDialogComponent implements OnDestroy {
  @ViewChild('searchField') searchInput!: any;
  @Input() searchFunction!: Function;
  searchText: string = '';
  resultCount: number | null = null;
  isShowing: boolean = false;
  
  ngOnDestroy(): void {
    Utility.commonDialogDestory();
  }
  
  async performSearch() {
    this.searchFunction(this.searchText).then((res: number) => {
      this.resultCount = res;
      
      // Warn if we don't get any results
      if (this.resultCount === 0) {
        Utility.showWarn('No data matches your search');
      }
    });
    
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
    Utility.commonDialogShow();
  }
  
  @HostListener('window:popstate', ['$event'])
  hide(): void {
    Utility.clearMessages(); // Clear any "no results found"
    
    this.isShowing = false;
  }
  
  resetOnHide(): void {
    // If we are hiding and don't have results we'll want to reset
    if (this.resultCount === 0) {
      this.performReset();
    }
    
    this.hide();
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
