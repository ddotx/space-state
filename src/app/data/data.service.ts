import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, defer } from 'rxjs';
import { map, tap, catchError, delay } from 'rxjs/operators';
import { environment } from './../../environments/environment';
import { INEOAPI, INEO } from './data.model';
import { StateService } from './state.service';
import { UtilsService } from './utils.service';
import { Router, NavigationEnd } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class DataService extends StateService {
  private apiNEOUrl = `https://api.nasa.gov/neo/rest/v1/feed?detailed=false&start_date=${this.utils.getNEODate}&end_date=${this.utils.getNEODate}&api_key=${environment.nasaApiKey}`;
  loading = true;

  constructor(
    private http: HttpClient,
    private utils: UtilsService,
    private router: Router
  ) {
    super();
    // Clear any errors on navigation event
    this.router.events.subscribe(
      event => {
        if (event instanceof NavigationEnd) {
          this.dismissError();
        }
      }
    );
  }

  init$(): Observable<INEO[]> {
    return this.http.get<INEOAPI>(this.apiNEOUrl).pipe(
      delay(1500), // simulate longer server delay since the NASA API is QUICK
      map(res => this.utils.mapNEOResponse(res)),
      tap(neoList => {
        this.setNeoList(neoList);
        this.loading = false;
      }),
      catchError(err => this.onError(err))
    );
  }

  update$(neo: INEO): Observable<INEO> {
    // Deferred so that the observable will
    // only be created on subscription
    return defer(() => {
      let serverDelay;
      // Make optimistic UI updates
      this.updateNeo(neo);
      // Return the observable that "interacts with the server"
      return new Observable<INEO>(observer => {
        serverDelay = setTimeout(() => {
          clearTimeout(serverDelay);
          // Force an error for one particular item
          // if (neo.name === '(2018 PV24)' && Math.random() > .5) {
          if (neo.name === '(2018 PV24)') {
            observer.error({
              message: `Could not update ${neo.name}.`
            });
          } else {
            observer.next(neo);
          }
          observer.complete();
        }, 1500);
      }).pipe(
        catchError(err => this.onError(err))
      );
    });
  }

  private onError(err: any) {
    const errorMsg = err.message ? err.message : 'Unable to complete request.';
    this.loading = false;
    this.stateError(errorMsg, true);
    return throwError(errorMsg);
  }
}
