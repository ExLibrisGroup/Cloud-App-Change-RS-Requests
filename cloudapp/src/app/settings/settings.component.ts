import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { AlertService, CloudAppSettingsService, FormGroupUtil } from '@exlibris/exl-cloudapp-angular-lib';
import { Settings } from '../models/settings';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settings: Settings;
  dirty = false;
  saving = false;

  constructor(
    private appService: AppService,
    private settingsService: CloudAppSettingsService,
    private alert: AlertService
  ) { }

  ngOnInit() {
    this.settingsService.get().subscribe( settings => {
      console.log(settings);
      this.settings = Object.assign(new Settings(), settings);
    });
   
  }

  changeValue(settingsName : string ,fieldKey : string) {
    for(let setting of this.settings['settings']){
      if(setting['name'] == settingsName){
        for(let field of setting['fields']){
          if(field['description'] == fieldKey){
            console.log(settingsName + fieldKey);
            field['change'] = !(field['change']);
            this.dirty = true;
            return;
          }
        }
      }
    }
}

  save() {
    this.saving = true;
    console.log(this.settings);
    this.settingsService.set(this.settings).subscribe(
      response => {
        this.alert.success('Settings successfully saved.');
      },
      err => this.alert.error(err.message),
      ()  => this.saving = false
    );
  }

  remove() {
    this.saving = true;
    console.log("App removing settings...");
     this.settingsService.remove().subscribe( response => {
       this.alert.success('Settings removed. Please reopen the App.');
       console.log("removed");
     },
     err => this.alert.error(err.message),
     ()  => this.saving = false
    );
  }

}