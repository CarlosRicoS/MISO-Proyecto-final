import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { Platform } from '@ionic/angular';

@Directive({
  selector: '[appPlatformText]',
  standalone: true,
})
export class PlatformTextDirective implements OnInit, OnDestroy {
  @Input() appPlatformTextWeb = '';
  @Input() appPlatformTextMobile = '';
  @Input() appPlatformShow: 'web' | 'mobile' | '' = '';

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly platform = inject(Platform);
  private removeResizeListener?: () => void;

  ngOnInit(): void {
    this.applyText();
    this.removeResizeListener = this.renderer.listen('window', 'resize', () => {
      this.applyText();
    });
  }

  ngOnDestroy(): void {
    if (this.removeResizeListener) {
      this.removeResizeListener();
    }
  }

  private applyText(): void {
    const isNativeMobile =
      this.platform.is('android') ||
      this.platform.is('ios') ||
      this.platform.is('hybrid');
    const nextText = isNativeMobile ? this.appPlatformTextMobile : this.appPlatformTextWeb;

    if (this.appPlatformShow) {
      const shouldShow = this.appPlatformShow === 'mobile' ? isNativeMobile : !isNativeMobile;
      if (shouldShow) {
        this.renderer.removeStyle(this.elementRef.nativeElement, 'display');
      } else {
        this.renderer.setStyle(this.elementRef.nativeElement, 'display', 'none');
      }
    }

    if (nextText) {
      this.renderer.setProperty(this.elementRef.nativeElement, 'textContent', nextText);
    }
  }
}
