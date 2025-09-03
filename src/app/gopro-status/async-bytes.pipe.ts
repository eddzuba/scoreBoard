// Standalone pipe for byte formatting
import { Pipe, PipeTransform } from '@angular/core';
import {GoProBleService} from "../services/gopro-ble.service";

@Pipe({ name: 'asyncBytes', standalone: true })
export class AsyncBytesPipe implements PipeTransform {
  transform(v: bigint | number | null | undefined): string {
    if (v == null) return '—';
    const n = typeof v === 'bigint' ? Number(v) : v;
    if (!Number.isFinite(n)) return (typeof v === 'bigint' ? v.toString() : String(v)) + ' B';
    const units = ['B','KB','MB','GB','TB'];
    let x = n, i = 0;
    while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
    return `${x.toFixed(1)} ${units[i]}`;
  }
}
