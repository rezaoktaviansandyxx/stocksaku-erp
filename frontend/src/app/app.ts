import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  styleUrl: './app.scss',
  template: '<router-outlet />',
})
export class App {}
