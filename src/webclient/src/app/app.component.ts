import { Component, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/merge';
import { Model } from './model';

@Component({
   selector: 'hgk-root',
   template: `
    <h1>
      HGreenkeeper
    </h1>
    <ul
      class="projects"
      *ngIf="model$ | async as model">
      <li
          class="project"
          *ngFor="let project of model.projects">
           <h2>{{ project.name }}</h2>
           <ul>
                <li
                    *ngFor="let dependency of project.dependencies">
                    <h3>{{ dependency.name }}</h3>
                    {{ dependency.pending | json}}
                </li>
           </ul>
      </li>
    </ul>
`,
   styles: [`
      .projects { list-style: none; padding: 0; }
      .project {}
  `]
})
export class AppComponent implements OnInit {
    public model$: Observable<Model>;

    constructor (private _http: Http) {
    }

    public ngOnInit () {
        this.model$ = Observable.merge(Observable.of(null), Observable.interval(30000))
            .switchMap(_ =>
                this._http.get('./pending.json')
                    .map((response: Response) => new Model(response.json()))
            );
    }
}


