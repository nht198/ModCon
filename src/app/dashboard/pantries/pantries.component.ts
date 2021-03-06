import { Component, OnInit } from '@angular/core';
import { Pantry } from 'app/dashboard/pantries/shared/pantry';
import { PantriesService } from 'app/dashboard/pantries/shared/pantry.service';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'pantries',
  template: `
    <div class="row">  
    <hr>  
        <div class="col-xs-6 col-sm-7 col-sm-offset-">
            <h1>Pantries</h1>    
        </div>
        <pantry-form class="col-xs-6 col-sm-3"></pantry-form>    
    </div>
    <div class="row">   
        <div *ngFor="let pantry of pantries | async">
            <pantry-detail [pantry]='pantry'></pantry-detail>
        </div>  
    </div>
  `
})
export class PantriesComponent implements OnInit {
  pantries: FirebaseListObservable<Pantry[]>;

  constructor(
      private pantrySvc: PantriesService,
      private route: ActivatedRoute
      ) { }

  ngOnInit() {
    this.pantries = this.pantrySvc.getItemsList();
   // this.vanities.subscribe(() => this.showSpinner = false);
  }
}
