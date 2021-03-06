import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Effect, Actions } from '@ngrx/effects';

import { AngularFireDatabase } from 'angularfire2/database';

import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import '../../utils/rxjs.operators';

import { AppState } from '../state';
import { Sum } from './sum.model';
import * as sumActions from './sum.actions';
import { SumQuery } from './sum.reducer';

type Action = sumActions.All;


@Injectable()
export class SumFacade {

  // ************************************************
  // Observable Queries available for consumption by views
  // ************************************************

  sum$ = this.store.select(SumQuery.getSum);

  // ************************************************
  // Effects to be registered at the Module level
  // ************************************************

  @Effect()
  getSum$: Observable<Action> = this.actions$.ofType(sumActions.GET_SUM)
    .map((action: sumActions.GetSum) => action.payload )
    .mergeMap( () => this.db.object(`/numbers`))
    .map(sum => {
      return new sumActions.GetSumSuccess(sum);
    });

  // ************************************************
  // Internal Code
  // ************************************************

  constructor(
    private actions$: Actions,
    private store: Store<AppState>,
    private db: AngularFireDatabase
    ) { }

    loadSum(): Observable<Sum> {
        this.store.dispatch(new sumActions.GetSum());
        return this.sum$;
      }

}
