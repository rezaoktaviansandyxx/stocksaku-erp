import {
  Directive,
  ElementRef,
  HostListener,
  forwardRef,
  Input
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appNumberFormat]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumberFormatDirective),
      multi: true
    }
  ]
})
export class NumberFormatDirective implements ControlValueAccessor {
  /**
   * Mengizinkan angka desimal (dipisah koma ',').
   * Default: true.
   */
  @Input() allowDecimal = true;

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private innerNumericValue: number | null = null;

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = this.el.nativeElement;
    const rawVal = input.value;

    if (!rawVal || rawVal.trim() === '') {
      this.innerNumericValue = null;
      this.onChange(null);
      return;
    }

    // Hitung posisi kursor saat ini dari digit murni untuk mengembalikan posisi kursor yang presisi
    const selectionStart = input.selectionStart || 0;
    const rawBeforeCursor = rawVal.slice(0, selectionStart);
    // Hitung jumlah karakter signifikan (angka dan koma) sebelum kursor
    const significantCharsBefore = (rawBeforeCursor.match(/[\d,]/g) || []).length;

    // Bersihkan karakter selain angka dan koma
    let cleaned = rawVal.replace(/[^\d,]/g, '');

    if (!this.allowDecimal) {
      cleaned = cleaned.replace(/,/g, '');
    }

    // Jika ada lebih dari satu koma, hanya ambil koma pertama
    const parts = cleaned.split(',');
    let intPart = parts[0] || '';
    let decPart = parts.length > 1 ? parts.slice(1).join('') : null;

    // Hilangkan leading zeros yang tidak perlu (kecuali jika bernilai 0 tunggal sebelum desimal)
    if (intPart.length > 1 && intPart.startsWith('0')) {
      intPart = intPart.replace(/^0+/, '') || '0';
    }

    // Format bagian integer dengan titik ribuan
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    let formatted = formattedInt;
    if (decPart !== null) {
      formatted += ',' + decPart;
    }

    input.value = formatted;

    // Kembalikan posisi kursor sesuai significant chars sebelum kursor
    let newCursorPos = 0;
    let countedSignificant = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/[\d,]/.test(formatted[i])) {
        countedSignificant++;
      }
      if (countedSignificant >= significantCharsBefore) {
        newCursorPos = i + 1;
        break;
      }
    }
    input.setSelectionRange(newCursorPos, newCursorPos);

    // Parse ke numeric value
    const numStr = decPart !== null ? `${intPart || '0'}.${decPart}` : (intPart || '0');
    const parsedNum = parseFloat(numStr);
    this.innerNumericValue = isNaN(parsedNum) ? 0 : parsedNum;

    this.onChange(this.innerNumericValue);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
    this.renderFormatted(this.innerNumericValue);
  }

  writeValue(value: any): void {
    if (value === null || value === undefined || value === '') {
      this.innerNumericValue = null;
      this.el.nativeElement.value = '';
      return;
    }

    const num = typeof value === 'number' ? value : parseFloat(String(value));
    this.innerNumericValue = isNaN(num) ? null : num;
    this.renderFormatted(this.innerNumericValue);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  private renderFormatted(value: number | null): void {
    if (value === null || isNaN(value)) {
      this.el.nativeElement.value = '';
      return;
    }

    // Pisahkan integer dan desimal
    const parts = String(value).split('.');
    const intStr = parts[0] || '0';
    const decStr = parts[1];

    const formattedInt = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    let result = formattedInt;
    if (decStr && this.allowDecimal) {
      result += ',' + decStr;
    }
    this.el.nativeElement.value = result;
  }
}
