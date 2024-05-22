import { Component } from '@angular/core';
import { PublicService } from '../service/public.service';

@Component({
  selector: 'riw-publicview',
  standalone: true,
  templateUrl: './publicview.component.html',
  styleUrl: './publicview.component.css'
})
export class PublicviewComponent {
  constructor(public publicService: PublicService) { }
}
