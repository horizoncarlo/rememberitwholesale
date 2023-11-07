import { Component, OnInit, inject } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';
import { Thing } from './model/thing';
import { BackendService } from './service/backend.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  backend: BackendService = inject(BackendService);
  data: Array<Thing> = [];
  showAddNew: boolean = false;
  nameIn: string | undefined;
  
  constructor(private primengConfig: PrimeNGConfig) {}
  
  ngOnInit(): void {
    this.primengConfig.ripple = true;
    
    // Get our initial data load
    this.getData();
  }
  
  getData(): void {
    console.error("GET DATA");
    this.backend.getData().subscribe({
      next: res => {
        console.error("RES", res);
        this.data = res;
      },
      error: err => {
        console.error("ERROR", err);
      }
    });
  }
  
  submitData(): void {
    this.backend.submitData(new Thing(1, 'Test First', new Date())).subscribe({
      next: res => {
        console.error("RES", res);
      },
      error: err => {
        console.error("ERROR", err);
      }
    });
  }
  
  toggleAddNewDialog(): void {
    this.showAddNew = !this.showAddNew;
  }
  
  submitAddNew(): void {
    console.log("ADD NEW", this.nameIn);
  }
  
  handleFocus(event: any, inputEl: HTMLElement) {
    if (inputEl) {
      inputEl.focus();
    }
  }
}
