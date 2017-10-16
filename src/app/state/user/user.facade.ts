import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Effect, Actions } from '@ngrx/effects';

import * as firebase from 'firebase';
import { AngularFireDatabase, FirebaseObjectObservable } from 'angularfire2/database';
import { AngularFireAuth } from 'angularfire2/auth';

import { Observable } from 'rxjs/Observable';
import { defer } from 'rxjs/observable/defer';
import '../../utils/rxjs.operators';

import { AppState } from '../state';
import { User, User2 } from './user.model';
import { UsersQuery } from './user.reducer';

import * as userActions from './user.actions';
import { AuthService } from '../../users/auth/auth.service';
import { Sum } from '../sum/sum.model';
import { SumQuery } from '../sum/sum.reducer';
import { OrderIdService } from '../../users/shared/order-id.service';
type Action = userActions.All;


@Injectable()
export class UserFacade {

  // ************************************************
  // Observable Queries available for consumption by views
  // ************************************************

  user$ = this.store.select(UsersQuery.getUser);
  sum$ = this.store.select(SumQuery.getSum);
  s: FirebaseObjectObservable<User2>;

  // ************************************************
  // Effects to be registered at the Module level
  // ************************************************

  @Effect() getUser$: Observable<Action> = this.actions$.ofType(userActions.GET_USER)
               .map((action: userActions.GetUser) => action.payload )
               .switchMap(payload => this.afAuth.authState )
               .switchMap(authPayload => this.getUserProfile(authPayload) )
               .map( s => {
                   if (s.$key) {
                        /// User logged in
                        if (!s.currency) {
                            s['currency'] = 'can';
                            s['c'] = 1;
                        }
                        if (!s.image) {
                            s['image'] = this.auth.currentUser.photoURL;
                        }
                        if (!s.orderId) {
                            this.createOrder(s);
                            s['orderId'] = 'none';
                        }
                        this.updateUserData(s);
                        const user = new User(s.$key, s.name, s.zone, s.email, s.provider, s.orderId, s.currency, s.image, s.c);
                        return new userActions.Authenticated(user);
                   } else {
                       /// User not logged in
                       return new userActions.NotAuthenticated();
                   }

               })
               .catch(err =>  Observable.of(new userActions.AuthError()) );


    /**
     * Login with Google OAuth
     */
     @Effect() login$: Observable<Action> = this.actions$.ofType(userActions.GOOGLE_LOGIN)
                 .map((action: userActions.GoogleLogin) => action.payload)
                 .switchMap(payload => {
                     return Observable.fromPromise( this.googleLogin() );
                 })
                 .map( credential => {
                     // successful login
                     return new userActions.GetUser();
                 })
                 .catch(err => {
                     return Observable.of(new userActions.AuthError({error: err.message}));
                 });


     @Effect() logout$: Observable<Action> = this.actions$.ofType(userActions.LOGOUT)
                 .map((action: userActions.Logout) => action.payload )
                 .switchMap(payload => {
                     return Observable.of( this.afAuth.auth.signOut() );
                 })
                 .map( authData => {
                     return new userActions.NotAuthenticated();
                 })
                 .catch(err => Observable.of(new userActions.AuthError({error: err.message})) );


      @Effect({dispatch: false})
      init$: Observable<any> = defer(() => {
        this.store.dispatch(new userActions.GetUser());
      });

  // ************************************************
  // Internal Code
  // ************************************************

  constructor(
      private actions$: Actions,
      public auth: AuthService,
      private store: Store<AppState>,
      private afAuth: AngularFireAuth,
      private db: AngularFireDatabase,
      private orderId: OrderIdService
  ) { }

  /**
   *
   */
  login(): Observable<User> {
    this.store.dispatch(new userActions.GoogleLogin());
    return this.user$;
  }

  /**
   *
   */
  logout(): Observable<User> {
    this.store.dispatch(new userActions.Logout());
    return this.user$;
  }

  // ******************************************
  // Internal Methods
  // ******************************************


  protected googleLogin(): firebase.Promise<any> {
       const provider = new firebase.auth.GoogleAuthProvider();
       return this.afAuth.auth.signInWithPopup(provider);
   }

   protected  githubLogin(): firebase.Promise<any> {
       const provider = new firebase.auth.GithubAuthProvider();
       return this.afAuth.auth.signInWithPopup(provider);
     }

    protected  facebookLogin(): firebase.Promise<any> {
        const provider = new firebase.auth.FacebookAuthProvider();
        return this.afAuth.auth.signInWithPopup(provider);
    }

    protected  twitterLogin(): firebase.Promise<any> {
        const provider = new firebase.auth.TwitterAuthProvider();
        return this.afAuth.auth.signInWithPopup(provider);
    }

   getUserProfile(auth) {
    this.s = this.db.object(`/users/${auth.uid}`);
    return this.s;
   }

     //// Helpers ////

  private updateUserData(s) {
    // Writes user name and email to realtime db
    // useful if your app displays information about users or for admin features
      const uid = s.uid;
      const path = `users/${uid}`; // Endpoint on firebase
      const ref = `users/${uid}/zone`;
      const data = {
                    email: s.email,
                    name: s.displayName,
                    lastLogin: firebase.database.ServerValue.TIMESTAMP,
                    provider: s.provider,
                    image: s.image,
                    currency: s.currency
                  };
      const dataNew = { [uid]: true };
        if (uid) {
         this.db.object(ref).subscribe((obj) => {
          // console.log(obj.$exists());
          if (obj.$exists()) {
              // object exists
              this.db.object(path).update(data)
               .catch(error => console.log(error));
              return;
            } else {
            // object does not exist
              let value = Object.assign({zone: 'new'}, data);
              this.db.object(path).update(value)
               .catch(error => console.log(error));
              this.db.object(`zones/new/`).update(dataNew)
               .catch(error => console.log(error));
              return;
            }
        });
      }
    }

   createOrder(s: User2) {
       console.log(s);
    let ref = `orders/orderItems/`;
    let obj = {
        'UID': s.$key,
        'email': s.email,
        'name': s.name,
        'timeStamp': firebase.database.ServerValue.TIMESTAMP,
        'completed': false
    };

    let info = {
        'info' : obj
    };
    console.log('hi');
    let newOrder = this.db.list(ref).push(info);
    let orderId = newOrder.key;
    this.db.object(`users/${s.$key}`).update({'orderId': orderId});
    ref = `orders/byUser/${s.$key}`;

    let obj2 = {
        'completed': false,
        'timeStamp': firebase.database.ServerValue.TIMESTAMP,
        'orderId': orderId
    };
    let byUser = this.db.list(ref).push(obj2);
    this.db.object(`orders/orderItems/${orderId}/info`).update({ 'byUser': byUser.key });
    // console.log(orderId);
    // console.log(byUser.key);
    }

}
