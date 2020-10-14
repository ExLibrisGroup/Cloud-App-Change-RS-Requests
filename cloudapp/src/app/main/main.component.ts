import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, PageInfo, RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  showDebugWin: boolean = false;
  private pageLoad$: Subscription;
  pageEntities: Entity[];

  private _apiResult: any;
  citationTypeCode:string;
  hasRSRequest : boolean = false;
  hasChangeResults : boolean = false;
  isChangeable :boolean = false;
  changeLog : string;
  link: string;

  hasApiResult: boolean = false;
  loading = false;

  private bookToArticalSwap:Map<string, string> = new Map([
    ["BK", "CR"],
    ["CR", "BK"],
  ]);

  private citationTypeMap:Map<string, string> = new Map([
    ["BK", "book"],
    ["CR", "article"],
  ]);

  constructor(private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private toastr: ToastrService) { }

  ngOnInit() {
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
    this.eventsService.getInitData().subscribe(      data => {
      if (data.user.primaryId === "exl_impl") {
        this.showDebugWin = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }

  get apiResult() {
    return this._apiResult;
  }

  set apiResult(result: any) {
    this._apiResult = result;
    this.hasApiResult = result && Object.keys(result).length > 0;
  }

  onPageLoad = (pageInfo: PageInfo) => {
    this.apiResult = {};
    this.loading = false;
    this.isChangeable = false;
    this.hasChangeResults = false;
    this.changeLog = "";
    this.pageEntities = pageInfo.entities;
    
    if ((pageInfo.entities || []).length == 1 ) {
      const entity = pageInfo.entities[0];
      if(entity.type === 'BORROWING_REQUEST'){
        this.hasRSRequest = true;
        this.link = entity.link;
        console.log('Sending API GET request ' + this.link );
        this.restService.call(entity.link).subscribe(result => {
          this.apiResult = result;
          this.citationTypeCode = result['citation_type']['value'];
          if(result['status']['value'] === 'READY_TO_SEND' || result['status']['value'] === 'REQUEST_CREATED_BOR'){
            this.isChangeable = true;
          }
        });
       
      }else{
        this.hasRSRequest = false;
      }
    } else {
      this.hasRSRequest = false;
      this.apiResult = {empty : 'Demo'};
    }
  }

  changeType(){
      this.changeLog = "Log: \n\n";
      this.loading = true; 
      this.hasChangeResults = true;
      const postBody = { ...this.apiResult }
      
      this.deleteExtraFields(postBody);
      if(this.citationTypeCode === 'BK'){
        this.changeToArticle(postBody);
      }else if(this.citationTypeCode === 'CR'){
        this.changeToBook(postBody);
      }
      this.changeLog = this.changeLog + "\nDeleted old request (" + this.apiResult['request_id'] + ")\n";
      console.log(this.changeLog);
      

      // call post request 
      var url = this.link.split('/').slice(0, -1).join('/');
      this.hasApiResult = false;
      this.sendCreateRequest({ url, requestBody: postBody});
      // wait for post
      (async () => { 
        while (!this.hasApiResult) { // The loop is not for waiting for post request to end.
          console.log('before hasApiResult');
          await this.delay(1000);
        }
        if (this.apiResult && Object.keys(this.apiResult).length > 0) {//no error
          //delete the old request
          console.log('after hasApiResult');
          console.log('delete the old request');
          this.sendDeleteRequest(this.link + '?remove_request=true');
        }else{
          console.log('not deleting old request');
          this.loading = false;
        }
      })();
  }
  
  

  deleteExtraFields(value: JSON) {
    delete value['request_id'];
    delete value['external_id'];
    delete value['created_date'];
    delete value['last_modified_date'];
    delete value['created_time'];
    delete value['last_modified_time'];
    delete value['user_request'];
  }

  changeToArticle(value: any) {
    value['citation_type']['value'] = 'CR';
    this.changeLog = this.changeLog + "BK -> CR\n";
    this.changeLog = this.changeLog + "Creating new request ...\n";
    
    this.changeLog = this.changeLog + "Title: "+value['title']+' -> Article\\Chapter title\n';
    value['chapter_title'] = "";

    if( value['chapter_author']){
      value['author'] = value['chapter_author'];
      this.changeLog = this.changeLog + "Chapter author: "+value['chapter_author']+' -> Author\n';
    }
    value['issn'] = value['isbn'];
    value['isbn'] = "";
    this.changeLog = this.changeLog + "ISBN: "+value['issn']+" -> ISSN\n";
    
    if(value['chapter']){
      this.changeLog = this.changeLog + "Chapter number: "+value['chapter']+' -> Chapter\n';
    }

    //volume & issue split
    if( value['volume'].includes(",")){
      this.changeLog = this.changeLog + "volume: "+value['volume']+" -> volume: ";
      var volume: string[] = value['volume'].split(",");
      value['issue'] = volume.length > 1 ? (volume.slice(-1)+'').trim() : "" ;
      value['volume'] = volume.length > 1 ? volume.slice(0, -1).join(',') : volume+'';
      this.changeLog = this.changeLog + value['volume'] +" & issue: " + value['issue']+ "\n";
    }

    if( value['part']){
      value['volume'] = value['volume']  + " " + value['part'];
      this.changeLog = this.changeLog + "Part: "+value['part']+" -> Volume: " +value['volume']+ "\n";
    }
    
  }

  changeToBook(value: any) {
    value['citation_type']['value'] = 'BK';
    this.changeLog = this.changeLog + "CR -> BK\n";
    this.changeLog = this.changeLog + "Creating new request ...\n";
    
    this.changeLog = this.changeLog + "Article\\Chapter Title: "+value['title']+' -> Title\n';
    value['journal_title'] = "";

    value['isbn'] = value['issn'];
    value['issn'] = "";
    this.changeLog = this.changeLog + "ISSN: "+value['isbn']+" -> ISBN\n";

    //volume & issue join
    if( value['issue']){
      this.changeLog = this.changeLog + "volume: "+value['volume']+" & issue: " + value['issue']+" -> volume: ";
      value['volume'] = value['volume'] + ", " + value['issue'];
      this.changeLog = this.changeLog + value['volume'] + "\n";
    }

    if(value['chapter']){
      this.changeLog = this.changeLog + "Chapter: "+value['chapter']+' -> Chapter number\n';
    }

  }

  refreshPage = () => {
    this.loading = true;
    this.eventsService.refreshPage().subscribe({
      next: () => this.toastr.success('Success!'),
      error: e => {
        console.error(e);
        this.toastr.error('Failed to refresh page');
      },
      complete: () => this.loading = false
    });
  }

  private sendCreateRequest({ url, requestBody }: { url: string; requestBody: any; }) {
    let request: Request = {
      url,
      method: HttpMethod.POST,
      requestBody
    };
    console.log('Sending API POST request ' + url );
    var asyncResult :any ;
    asyncResult = this.restService.call(request).subscribe({
      next: result => {
        this.apiResult = result;
        const postApiresult = { ...this.apiResult }
        console.log(this.apiResult);
      
        // replace new id with request_id
        this.changeLog = this.changeLog.replace('Creating new request ...','Created new request (' + (this.apiResult['request_id']) + ')');
        console.log(this.changeLog);
        this.hasApiResult = true;
        console.log('finished creating request');  
      },
      error: (e: RestErrorResponse) => {
        this.apiResult = {};
        console.log("Failed to create resource sharing request");
        this.toastr.error('Failed to create resource sharing request');
        console.error(e);
        this.changeLog = this.changeLog.replace('Creating new request ...','Failed creating new request');
        this.hasApiResult = true;
        this.loading = false;
      }
      
    });
  }

  sendDeleteRequest(deleteUrl: string) {
    let request: Request = {
      url : deleteUrl,
      method: HttpMethod.DELETE,
      requestBody : null
    };
    console.log('Sending API DELETE request ' + deleteUrl);
    this.restService.call(request).subscribe({
      next: result => {
        this.loading = false;
        console.log("Success deleting " + deleteUrl); 
        this.toastr.success('Success changing types!');
      },
      error: (e: RestErrorResponse) => {
        this.apiResult = {};
        console.log("Failed to delete resource sharing request");
        this.toastr.error('Failed to delete resource sharing request');
        console.error(e);
        this.loading = false;
      }
    });
  }

  async delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

}
