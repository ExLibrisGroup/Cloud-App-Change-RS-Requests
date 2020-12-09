  
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-help',
  template: `
 
  <div class="eca-actions">
    <button mat-flat-button color="secondary" [routerLink]="['/']"><mat-icon>arrow_back</mat-icon>Back</button>
  </div>
  <div class="title">
    <h1>Help</h1>
  </div>
  <div>
    <p>For more help with this app, or to report a problem, please open an issue by clicking on the link below.</p>
    <p><a translate href="https://github.com/ExLibrisGroup/Cloud-App-Change-RS-Requests/issues" target="_blank">Open an issue</a></p>
  </div>
  `
})
export class HelpComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
