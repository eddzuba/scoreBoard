// gopro-ble.service.ts — Angular 18 / Web Bluetooth
// Requirements:
// 1) TypeScript lib: "dom" in tsconfig.json
// 2) npm i -D @types/web-bluetooth
// 3) Secure context (https/localhost) and a browser that supports Web Bluetooth (Chrome/Edge/Android)
// 4) Optionally guard navigator.bluetooth for SSR

import { Injectable, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subject, interval, Subscription } from 'rxjs';

/**********************
 * BLE UUIDs & Commands
 **********************/
export const MTU = 20; // bytes per write

// Services
export const UUID = {
  controlService: '0000fea6-0000-1000-8000-00805f9b34fb', // Camera control
  wifiService: 'b5f90001-aa8d-11e3-9046-0002a5d5c51b',     // GoPro Wi‑Fi AP credentials/state
  nwManService: 'b5f90090-aa8d-11e3-9046-0002a5d5c51b',    // Network management (optional)
  deviceInfoService: '0000180a-0000-1000-8000-00805f9b34fb',
  batteryService: '0000180f-0000-1000-8000-00805f9b34fb',
} as const;

// Characteristics
export const CHAR = {
  command: 'b5f90072-aa8d-11e3-9046-0002a5d5c51b',        // [WRITE]
  commandResp: 'b5f90073-aa8d-11e3-9046-0002a5d5c51b',    // [NOTIFY]
  settings: 'b5f90074-aa8d-11e3-9046-0002a5d5c51b',       // [WRITE]
  settingsResp: 'b5f90075-aa8d-11e3-9046-0002a5d5c51b',   // [NOTIFY]
  query: 'b5f90076-aa8d-11e3-9046-0002a5d5c51b',          // [WRITE]
  queryResp: 'b5f90077-aa8d-11e3-9046-0002a5d5c51b',      // [NOTIFY]
  nwManCmd: 'b5f90091-aa8d-11e3-9046-0002a5d5c51b',       // [WRITE] optional
  nwManResp: 'b5f90092-aa8d-11e3-9046-0002a5d5c51b',      // [NOTIFY] optional
  wifiSsid: 'b5f90002-aa8d-11e3-9046-0002a5d5c51b',       // [READ|WRITE]
  wifiPw: 'b5f90003-aa8d-11e3-9046-0002a5d5c51b',         // [READ|WRITE]
  wifiState: 'b5f90005-aa8d-11e3-9046-0002a5d5c51b',      // [READ|INDICATE]
  modelNo: '00002a24-0000-1000-8000-00805f9b34fb',        // [READ]
  battLevel: '00002a19-0000-1000-8000-00805f9b34fb',      // [READ|NOTIFY]
} as const;

// Command bytes (subset commonly used)
export const CMD = {
  keepAlive: new Uint8Array([0x03, 0x5B, 0x01, 0x42]),
  shutterOff: new Uint8Array([0x03, 0x01, 0x01, 0x00]),
  shutterOn: new Uint8Array([0x03, 0x01, 0x01, 0x01]),
  sleep: new Uint8Array([0x01, 0x05]),
  locateOff: new Uint8Array([0x03, 0x16, 0x01, 0x00]),
  locateOn: new Uint8Array([0x03, 0x16, 0x01, 0x01]),
  wifiAPoff: new Uint8Array([0x03, 0x17, 0x01, 0x00]),
  wifiAPon: new Uint8Array([0x03, 0x17, 0x01, 0x01]),
  hilight: new Uint8Array([0x01, 0x18]),
  getHardwareInfo: new Uint8Array([0x01, 0x3C]),
} as const;

export type PresetKey =
  | 'videoGroup' | 'photoGroup' | 'timelapseGroup'
  | 'standard' | 'activity' | 'cinematic'
  | 'photo' | 'liveBurst' | 'burstPhoto' | 'nightPhoto'
  | 'timeWarp' | 'timeLapse' | 'nightLapse';

export const PRESET: Record<PresetKey, Uint8Array> = {
  videoGroup: new Uint8Array([0x04, 0x3E, 0x02, 0x03, 0xE8]),
  photoGroup: new Uint8Array([0x04, 0x3E, 0x02, 0x03, 0xE9]),
  timelapseGroup: new Uint8Array([0x04, 0x3E, 0x02, 0x03, 0xEA]),
  standard: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x00, 0x00, 0x00]),
  activity: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x00, 0x00, 0x01]),
  cinematic: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x00, 0x00, 0x02]),
  photo: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x01, 0x00, 0x00]),
  liveBurst: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x01, 0x00, 0x01]),
  burstPhoto: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x01, 0x00, 0x02]),
  nightPhoto: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x01, 0x00, 0x03]),
  timeWarp: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x02, 0x00, 0x00]),
  timeLapse: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x02, 0x00, 0x01]),
  nightLapse: new Uint8Array([0x06, 0x40, 0x04, 0x00, 0x02, 0x00, 0x02]),
};

// Queries (trigger status bundles that include particular status IDs)
export const Q = {
  registerAllStatusUpdates: new Uint8Array([0x01, 0x53]),
  allStatusValues: new Uint8Array([0x01, 0x13]),
  qSpace: new Uint8Array([0x02, 0x13, 0x36]),   // remaining free space (status 0x36)
  qPreset: new Uint8Array([0x02, 0x13, 0x61]),  // active preset (status 0x61)
} as const;

/**********************
 * Models & helpers
 **********************/
export interface GoProCharacteristics {
  command?: BluetoothRemoteGATTCharacteristic;
  commandResp?: BluetoothRemoteGATTCharacteristic;
  settings?: BluetoothRemoteGATTCharacteristic;
  settingsResp?: BluetoothRemoteGATTCharacteristic;
  query?: BluetoothRemoteGATTCharacteristic;
  queryResp?: BluetoothRemoteGATTCharacteristic;
  wifiSsid?: BluetoothRemoteGATTCharacteristic;
  wifiPw?: BluetoothRemoteGATTCharacteristic;
  wifiState?: BluetoothRemoteGATTCharacteristic;
  modelNo?: BluetoothRemoteGATTCharacteristic;
  battLevel?: BluetoothRemoteGATTCharacteristic;
  nwManCmd?: BluetoothRemoteGATTCharacteristic;
  nwManResp?: BluetoothRemoteGATTCharacteristic;
}

export interface GoProDeviceState {
  id: string;
  name: string;
  modelId?: number;
  model?: string;
  battery?: number; // %
  preset?: string;
  remainingSpaceBytes?: bigint; // from status 0x36
  wifiSsid?: string;
  wifiPw?: string;
  wifiState?: string;
  isRecording?: boolean;
  isCharging?: boolean; // 0x02
  isHot?: boolean;      // 0x06
  isCold?: boolean;     // 0x55
  lastError?: string;
}

function textDecoder(view: DataView): string {
  return new TextDecoder('utf-8').decode(view.buffer);
}

async function splitAndWrite(characteristic: BluetoothRemoteGATTCharacteristic, payload: Uint8Array): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < payload.length; i += MTU) {
    const chunk = payload.subarray(i, Math.min(i + MTU, payload.length));
    p = p.then(() => {
      const anyCh = characteristic as any;
      if (typeof anyCh.writeValueWithoutResponse === 'function') return anyCh.writeValueWithoutResponse(chunk);
      return characteristic.writeValue(chunk);
    });
  }
  return p;
}

/**********************
 * Service
 **********************/
@Injectable({ providedIn: 'root' })
export class GoProBleService {
  private server?: BluetoothRemoteGATTServer;
  private chars: GoProCharacteristics = {};
  private notifSubs: Subscription[] = [];
  private keepAliveSub?: Subscription;

  isPressing = false;

  // Reactive state
  readonly connected$ = new BehaviorSubject<boolean>(false);
  public readonly device$ = new BehaviorSubject<GoProDeviceState | null>(null);
  readonly battery$ = new BehaviorSubject<number | null>(null);
  readonly preset$ = new BehaviorSubject<string | null>(null);
  readonly remainingSpace$ = new BehaviorSubject<bigint | null>(null);
  readonly errors$ = new Subject<string>();

  // Busy / recording / env flags
  readonly busy$ = new BehaviorSubject<boolean>(false);
  readonly videoProgress$ = new BehaviorSubject<number>(0); // seconds from cam (status 0x0D)
  readonly recordingElapsed$ = this.videoProgress$; // alias for UI
  readonly charging$ = new BehaviorSubject<boolean>(false);
  readonly hot$ = new BehaviorSubject<boolean>(false);
  readonly cold$ = new BehaviorSubject<boolean>(false);

  private inflight = 0; // in-flight BLE writes

  constructor(@Inject(PLATFORM_ID) private pid: Object, private zone: NgZone) {}

  async connect(): Promise<void> {
    if (!isPlatformBrowser(this.pid)) throw new Error('Web Bluetooth available only in browser');
    if (!('bluetooth' in navigator)) throw new Error('Web Bluetooth is not supported in this browser');

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [UUID.controlService] }],
      optionalServices: [UUID.controlService, UUID.deviceInfoService, UUID.batteryService, UUID.wifiService, UUID.nwManService],
    });

    if (!device.gatt) throw new Error('No GATT on device');
    device.addEventListener('gattserverdisconnected', () => this.handleDisconnect());

    this.server = await device.gatt.connect();
    await this.discoverAll();

    // Notifications
    await this.startNotify(this.chars.commandResp!, e => this.parseNotify(e, 'commandResp'));
    await this.startNotify(this.chars.settingsResp!, e => this.parseNotify(e, 'settingsResp'));
    await this.startNotify(this.chars.queryResp!, e => this.parseNotify(e, 'queryResp'));

    // Initial reads/queries
    await this.sendCommand(CMD.getHardwareInfo);
    await this.readWifiInfo();
    await this.sendQuery(Q.registerAllStatusUpdates);
    await this.readBattery();

    // Periodic polling (lightweight)
    this.keepAliveSub?.unsubscribe();
    this.keepAliveSub = interval(3000).subscribe(async () => {
      try {
        if (this.chars.settings) await this.sendSetting(CMD.keepAlive);
        await this.sendQuery(Q.qSpace);
        await this.sendQuery(Q.qPreset);
        await this.readBattery(true);
      } catch (e: any) {
        this.pushError(e?.message || String(e));
      }
    });

    this.zone.run(() => this.connected$.next(true));
  }

  async disconnect(): Promise<void> {
    this.notifSubs.forEach(s => s.unsubscribe());
    this.keepAliveSub?.unsubscribe();
    this.notifSubs = [];
    if (this.server?.connected) this.server.disconnect();
    this.server = undefined;
    this.chars = {};
    this.zone.run(() => {
      this.connected$.next(false);
      this.device$.next(null);
      this.busy$.next(false);
      this.videoProgress$.next(0);
    });
  }

  /*************** Public controls ***************/
  record() { return this.sendCommand(CMD.shutterOn); }
  stop() {
    return this.sendCommand(CMD.shutterOff);
  }
  hilight() { return this.sendCommand(CMD.hilight); }
  locate(on: boolean) { return this.sendCommand(on ? CMD.locateOn : CMD.locateOff); }
  wifiAp(on: boolean) { return this.sendCommand(on ? CMD.wifiAPon : CMD.wifiAPoff); }
  sleep() { return this.sendCommand(CMD.sleep); }
  setPreset(key: PresetKey) { return this.sendCommand(PRESET[key]); }

  async setDateTime(d: Date = new Date()) {
    // 0x09,0x0D,0x07, year(LE?), month, day, hour, min, sec — varies by model; using common pattern
    const y = d.getFullYear();
    const yyL = (y >> 8) & 0xff; // order may vary; harmless on many models
    const yyH = y & 0xff;
    const payload = new Uint8Array([0x09, 0x0D, 0x07, yyL, yyH, d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]);
    await this.sendCommand(payload);
  }

  async onHighlightClick() {
    // trigger visual press animation
    this.isPressing = false; // restart if already true
    queueMicrotask(() => this.isPressing = true);

    // Stop recording, wait for it to stop, then start again
    try {
      // Only act if connected; UI already hides button when not recording
      const connected = await this.connected$.getValue?.() ?? this.connected$.value;
      if (!connected) return;

      await this.stop();

      // Wait until device$.isRecording becomes false (with a timeout safety)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Stop timeout'));
        }, 8000);
        const sub = this.device$.subscribe(d => {
          if (d && d.isRecording === false) {
            cleanup();
            resolve();
          }
        });
        const cleanup = () => {
          clearTimeout(timeout);
          sub.unsubscribe();
        };
      });

      // Small delay to ensure camera is ready
      await this.sleepTime(300);

      await this.record();

      // Optionally wait until recording resumes (best-effort, short timeout)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          cleanup();
          resolve();
        }, 3000);
        const sub = this.device$.subscribe(d => {
          if (d && d.isRecording === true) {
            cleanup();
            resolve();
          }
        });
        const cleanup = () => {
          clearTimeout(timeout);
          sub.unsubscribe();
        };
      });
    } catch (e) {
      console.error('Highlight stop/restart failed:', e);
    }
  }
  private sleepTime(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
  /*************** Low-level I/O ***************/
  private async discoverAll() {
    if (!this.server) throw new Error('Not connected');
    const services = await this.server.getPrimaryServices();

    for (const s of services) {
      switch (s.uuid) {
        case UUID.controlService:
          this.chars.command = await s.getCharacteristic(CHAR.command);
          this.chars.commandResp = await s.getCharacteristic(CHAR.commandResp);
          this.chars.settings = await s.getCharacteristic(CHAR.settings);
          this.chars.settingsResp = await s.getCharacteristic(CHAR.settingsResp);
          this.chars.query = await s.getCharacteristic(CHAR.query);
          this.chars.queryResp = await s.getCharacteristic(CHAR.queryResp);
          break;
        case UUID.deviceInfoService:
          this.chars.modelNo = await s.getCharacteristic(CHAR.modelNo);
          break;
        case UUID.batteryService:
          this.chars.battLevel = await s.getCharacteristic(CHAR.battLevel);
          break;
        case UUID.wifiService:
          this.chars.wifiSsid = await s.getCharacteristic(CHAR.wifiSsid);
          this.chars.wifiPw = await s.getCharacteristic(CHAR.wifiPw);
          this.chars.wifiState = await s.getCharacteristic(CHAR.wifiState);
          break;
        case UUID.nwManService:
          try {
            this.chars.nwManCmd = await s.getCharacteristic(CHAR.nwManCmd);
            this.chars.nwManResp = await s.getCharacteristic(CHAR.nwManResp);
          } catch {}
          break;
      }
    }

    await this.readModel();
    await this.readBattery();
  }

  private async startNotify(ch: BluetoothRemoteGATTCharacteristic, handler: (e: Event) => void) {
    await ch.startNotifications();
    const bound = handler.bind(this);
    ch.addEventListener('characteristicvaluechanged', bound as any);
    const sub = new Subscription(() => ch.removeEventListener('characteristicvaluechanged', bound as any));
    this.notifSubs.push(sub);
  }

  private async sendCommand(bytes: Uint8Array) {
    if (!this.chars.command) throw new Error('Command characteristic not found');
    this.setBusy(true);
    try { await splitAndWrite(this.chars.command, bytes); }
    finally { this.setBusy(false); }
  }

  private async sendSetting(bytes: Uint8Array) {
    if (!this.chars.settings) throw new Error('Settings characteristic not found');
    this.setBusy(true);
    try { await splitAndWrite(this.chars.settings, bytes); }
    finally { this.setBusy(false); }
  }

  private async sendQuery(bytes: Uint8Array) {
    if (!this.chars.query) throw new Error('Query characteristic not found');
    this.setBusy(true);
    try { await splitAndWrite(this.chars.query, bytes); }
    finally { this.setBusy(false); }
  }

  private async readModel() {
    try {
      if (!this.chars.modelNo) return;
      const v = await this.chars.modelNo.readValue();
      const hex = textDecoder(v);
      const modelId = parseInt('0x' + hex);
      const device = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
      device.modelId = modelId;
      this.zone.run(() => this.device$.next(device));
    } catch (e: any) {
      this.pushError('readModel: ' + (e?.message || e));
    }
  }

  private async readBattery(quiet = false) {
    try {
      if (!this.chars.battLevel) return;
      const v = await this.chars.battLevel.readValue();
      const pct = v.getUint8(0);
      this.zone.run(() => {
        this.battery$.next(pct);
        const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
        d.battery = pct;
        this.device$.next(d);
      });
    } catch (e: any) {
      if (!quiet) this.pushError('readBattery: ' + (e?.message || e));
    }
  }

  private async readWifiInfo() {
    try {
      if (this.chars.wifiSsid) {
        const v = await this.chars.wifiSsid.readValue();
        const ssid = textDecoder(v);
        const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
        d.wifiSsid = ssid; this.zone.run(() => this.device$.next(d));
      }
      if (this.chars.wifiPw) {
        const v = await this.chars.wifiPw.readValue();
        const pw = textDecoder(v);
        const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
        d.wifiPw = pw; this.zone.run(() => this.device$.next(d));
      }
      if (this.chars.wifiState) {
        const v = await this.chars.wifiState.readValue();
        const st = textDecoder(v);
        const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
        d.wifiState = st; this.zone.run(() => this.device$.next(d));
      }
    } catch (e: any) {
      this.pushError('readWifiInfo: ' + (e?.message || e));
    }
  }

  /*************** Notifications parsing ***************/
  private packBuffer: Uint8Array | null = null;
  private expectedLen = 0;
  private lastPackNo = -1;
  private lastCommandId = -1;

  private parseNotify(event: Event, source: 'commandResp'|'settingsResp'|'queryResp') {
    const dv = (event as any).target.value as DataView;
    const arr = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);

    const isCont = (arr[0] & 0x80) > 0; // continuation bit in first byte (heuristic)
    const packNo = arr[0];

    if (isCont) {
      if (this.packBuffer && this.expectedLen > 0 && (this.lastPackNo === -1 ? packNo === 0x80 : packNo === (this.lastPackNo + 1))) {
        const data = arr.subarray(1);
        const offset = this.packBuffer.length - this.expectedLen;
        this.packBuffer.set(data, offset);
        this.expectedLen -= data.length;
        this.lastPackNo = packNo;
        if (this.expectedLen <= 0) this.onFullResponse(this.packBuffer, source);
      } else {
        this.packBuffer = null; this.expectedLen = 0; this.lastPackNo = -1;
      }
      return;
    }

    const headerLen = this.detectHeaderLength(arr);
    const msgLen = this.detectMessageLength(arr);
    const commandId = arr[headerLen];
    const error = arr[headerLen + 1];
    const payload = arr.subarray(headerLen);

    this.lastCommandId = commandId;

    if (msgLen > payload.length) {
      this.packBuffer = new Uint8Array(msgLen);
      this.packBuffer.set(payload);
      this.expectedLen = msgLen - payload.length;
      this.lastPackNo = -1;
    } else {
      this.onFullResponse(payload.subarray(0, msgLen), source);
    }

    if (error !== 0) this.pushError(`${source} error code=${error}`);
  }

  private onFullResponse(payload: Uint8Array, source: string) {
    const commandId = payload[0];
    const error = payload[1];
    let next = 2;

    if (error !== 0) {
      this.pushError(`${source} response error=${error} cmd=0x${commandId.toString(16)}`);
      return;
    }

    if (commandId === 0x3C) {
      // Hardware info: TLV-like; parse minimal subset: modelId + modelName
      const len1 = payload[next++];
      const modelId = (payload[next] << 24) | (payload[next+1] << 16) | (payload[next+2] << 8) | payload[next+3];
      next += len1;
      const len2 = payload[next++];
      const modelName = new TextDecoder().decode(payload.subarray(next, next + len2));
      const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
      d.modelId = modelId >>> 0; d.model = modelName;
      this.zone.run(() => this.device$.next(d));
    } else if (commandId === 0x13 || commandId === 0x93) {
      // Status bundle: sequence of [sid,len,data...]
      for (let i = next; i < payload.length;) {
        const sid = payload[i++];
        const len = payload[i++];
        if (len <= 0 || i + len > payload.length) break;
        this.handleStatus(sid, payload.subarray(i, i + len));
        i += len;
      }
    }

    this.packBuffer = null; this.expectedLen = 0; this.lastPackNo = -1;
  }

  private handleStatus(statusId: number, value: Uint8Array) {
    // 0x01: recording on/off (bool)
    if (statusId === 0x01 && value.length >= 1) {
      const isRecording = value[0] === 1;
      const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
      d.isRecording = isRecording;
      this.zone.run(() => this.device$.next({ ...d }));
      this.busy$.next(isRecording || this.inflight > 0);
      return;
    }

    // 0x0D: videoProgress (uint32 BE) — elapsed seconds while recording
    if (statusId === 0x0D && value.length >= 4) {
      const dv = new DataView(value.buffer, value.byteOffset, value.byteLength);
      const secs = dv.getUint32(0, false /* big-endian */);
      const isRecording = secs !== 0;
      this.zone.run(() => {
        this.videoProgress$.next(secs);
        const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
        d.isRecording = isRecording;
        this.device$.next({ ...d });
        this.busy$.next(isRecording || this.inflight > 0);
      });
      return;
    }

    // 0x08: busy flag
    if (statusId === 0x08 && value.length >= 1) {
      const busy = value[0] !== 0;
      const rec = this.device$.value?.isRecording ?? false;
      this.zone.run(() => this.busy$.next(busy || rec || this.inflight > 0));
      return;
    }

    // 0x36: remaining free space (uint64 LE)
    if (statusId === 0x36 && value.length >= 8) {
      const le = true;
      const dv = new DataView(value.buffer, value.byteOffset, value.byteLength);
      const lo = dv.getUint32(0, le);
      const hi = dv.getUint32(4, le);
      const bytes = (BigInt(hi) << 32n) | BigInt(lo);
      const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
      d.remainingSpaceBytes = bytes;
      this.zone.run(() => { this.remainingSpace$.next(bytes); this.device$.next({ ...d }); });
      return;
    }

    // 0x61: active preset (utf-8)
    if (statusId === 0x61 && value.length >= 1) {
      const preset = new TextDecoder().decode(value);
      this.zone.run(() => {
        this.preset$.next(preset);
        const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
        d.preset = preset; this.device$.next({ ...d });
      });
      return;
    }

    // 0x02: isCharging
    if (statusId === 0x02 && value.length >= 1) {
      const charging = value[0] !== 0;
      const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
      d.isCharging = charging;
      this.zone.run(() => { this.charging$.next(charging); this.device$.next({ ...d }); });
      return;
    }

    // 0x06: isHot
    if (statusId === 0x06 && value.length >= 1) {
      const hot = value[0] !== 0;
      const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
      d.isHot = hot;
      this.zone.run(() => { this.hot$.next(hot); this.device$.next({ ...d }); });
      return;
    }

    // 0x55: isCold
    if (statusId === 0x55 && value.length >= 1) {
      const cold = value[0] !== 0;
      const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
      d.isCold = cold;
      this.zone.run(() => { this.cold$.next(cold); this.device$.next({ ...d }); });
      return;
    }

    // 0x46: battery percent
    if (statusId === 0x46 && value.length >= 1) {
      const pct = value[0];
      this.zone.run(() => {
        this.battery$.next(pct);
        const d = this.device$.value ?? { id: this.server!.device.id, name: this.server!.device.name || 'GoPro' };
        d.battery = pct; this.device$.next({ ...d });
      });
      return;
    }
  }

  private detectHeaderLength(arr: Uint8Array): number {
    return 2; // minimal heuristic; adjust if you implement full GoHeader parsing
  }

  private detectMessageLength(arr: Uint8Array): number {
    return arr.length - this.detectHeaderLength(arr);
  }

  private handleDisconnect() {
    this.disconnect().catch(() => {});
  }

  private pushError(msg: string) {
    this.zone.run(() => this.errors$.next(msg));
  }

  private setBusy(on: boolean) {
    if (on) this.inflight++; else this.inflight = Math.max(0, this.inflight - 1);
    const rec = this.device$.value?.isRecording ?? false;
    this.zone.run(() => this.busy$.next(this.inflight > 0 || rec));
  }
}
