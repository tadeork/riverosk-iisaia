import { Component } from '@angular/core';
import { BookListComponent } from './book-list/book-list';

@Component({
  imports: [BookListComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
