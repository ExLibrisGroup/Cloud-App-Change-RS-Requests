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
  chooseFromList : boolean = false;
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
    this.chooseFromList = false;
    this.changeLog = "";
    this.pageEntities = pageInfo.entities;
    this.hasRSRequest = false;

    console.log('choose From List - test 1' );
    if ((this.pageEntities || []).length > 1 && this.pageEntities[0].type === 'BORROWING_REQUEST') {
       //list of Borrowing Requests
       console.log('choose From List ' + (this.pageEntities || []).length );
       this.chooseFromList = true;
    } else if ((this.pageEntities || []).length == 1  && this.pageEntities[0].type === 'BORROWING_REQUEST') {
      this.onLoadEntity(pageInfo.entities[0]);
    } else {
      this.apiResult = {empty : 'Demo'};
    }
  }

  

  onLoadEntity(entity : Entity){
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
  }


  changeType(){
      this.changeLog = "<br>";
      this.loading = true; 
      this.hasChangeResults = true;
      const postBody = { ...this.apiResult }
      
      this.deleteExtraFields(postBody);
      if(this.citationTypeCode === 'BK'){
        this.changeToArticle(postBody);
      }else if(this.citationTypeCode === 'CR'){
        this.changeToBook(postBody);
      }
      this.changeLog = this.changeLog + "<br>Deleted old request (" + this.apiResult['request_id'] + ")<br>";
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
    this.changeLog = this.changeLog + "BK -> CR<br>";
    this.changeLog = this.changeLog + "Creating new request ...<br>";
    
    this.changeLog = this.changeLog + "<b>Title:</b> "+value['title']+' -> <b>Article\\Chapter title</b><br>';
    value['chapter_title'] = "";

    if( value['chapter_author']){
      value['author'] = value['chapter_author'];
      this.changeLog = this.changeLog + "<b>Chapter author:</b> "+value['chapter_author']+' -> <b>Author</b><br>';
    }
    value['issn'] = value['isbn'];
    value['isbn'] = "";
    this.changeLog = this.changeLog + "<b>ISBN: </b>"+value['issn']+" -> <b>ISSN</b><br>";
    
    if(value['chapter']){
      this.changeLog = this.changeLog + "<b>Chapter number:</b> "+value['chapter']+' -> <b>Chapter</b><br>';
    }

    //volume & issue split
    if( value['volume'].includes(",")){
      this.changeLog = this.changeLog + "<b>volume: </b>"+value['volume']+" -> <b>volume: </b>";
      var volume: string[] = value['volume'].split(",");
      value['issue'] = volume.length > 1 ? (volume.slice(-1)+'').trim() : "" ;
      value['volume'] = volume.length > 1 ? volume.slice(0, -1).join(',') : volume+'';
      this.changeLog = this.changeLog + value['volume'] +" & <b>issue: </b>" + value['issue']+ "<br>";
    }

    if( value['part']){
      value['volume'] = value['volume']  + " " + value['part'];
      this.changeLog = this.changeLog + "<b>Part: </b>"+value['part']+" -> <b>Volume: <b>" +value['volume']+ "<br>";
    }
    
  }

  changeToBook(value: any) {
    value['citation_type']['value'] = 'BK';
    this.changeLog = this.changeLog + "CR -> BK<br>";
    this.changeLog = this.changeLog + "Creating new request ...<br>";
    
    this.changeLog = this.changeLog + "<b>Article\\Chapter Title:</b> "+value['title']+' -> <b>Title</b><br>';
    value['journal_title'] = "";

    value['isbn'] = value['issn'];
    value['issn'] = "";
    this.changeLog = this.changeLog + "<b>ISSN:</b> "+value['isbn']+" -> <b>ISBN</b><br>";

    //volume & issue join
    if( value['issue']){
      this.changeLog = this.changeLog + "<b>volume: </b>"+value['volume']+" & <b>issue: </b>" + value['issue']+" -> <b>volume: </b>";
      value['volume'] = value['volume'] + ", " + value['issue'];
      this.changeLog = this.changeLog + value['volume'] + "<br>";
    }

    if(value['chapter']){
      this.changeLog = this.changeLog + "<b>Chapter:</b> "+value['chapter']+' -> <b>Chapter number</b><br>';
    }

  }

  refreshPage = () => {
    this.loading = true;
    this.eventsService.refreshPage().subscribe({
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
        console.log(e.message);
        console.error(e);
        this.changeLog = this.changeLog.replace('Creating new request ...','Failed creating new request<br>' + e.message);
        this.toastr.error(this.changeLog,'Failed to create resource sharing request',{positionClass: 'toast-top-center'});
        this.hasApiResult = true;
        this.loading = false;
        this.hasChangeResults = false;
        this.refreshPage();
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
        this.toastr.success(this.changeLog,'Success changing types!',{positionClass: 'toast-top-center'});
        if(this.chooseFromList){
          this.refreshPage();
        }
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
