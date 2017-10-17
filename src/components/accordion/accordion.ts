import {
  Component,
  ViewChild,
  OnInit,
  Renderer,
  Input
} from '@angular/core';

@Component({
  selector: 'accordion',
  templateUrl: 'accordion.html'
})
export class AccordionComponent implements OnInit {

  private accordionExpanded: boolean = false;
  private icon: string = "arrow-forward";

  @ViewChild("cc") private cardContent: any;
  @Input('title') private title: string;
  @Input() private color:string = "primary";


  constructor(
    private renderer: Renderer
  ) {}

  ngOnInit(){
    this.renderer.setElementStyle(this.cardContent.nativeElement, "webkitTransition", "max-height 500ms, padding 500ms")
  }

  private toggleAccordion(): void {

    if (this.accordionExpanded) {
      this.renderer.setElementStyle(this.cardContent.nativeElement, "max-height", "0px")
      this.renderer.setElementStyle(this.cardContent.nativeElement, "padding", "0px 16px")
    }else{
      this.renderer.setElementStyle(this.cardContent.nativeElement, "max-height", "500px")
      this.renderer.setElementStyle(this.cardContent.nativeElement, "padding", "13px 16px")
    }
    this.accordionExpanded = !this.accordionExpanded;
    this.icon = (this.icon == "arrow-forward") ? "arrow-down" : "arrow-forward";

  }

}
