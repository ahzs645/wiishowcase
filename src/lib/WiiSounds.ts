export type SoundName = 'hover' | 'select' | 'back' | 'cancel' | 'open' | 'close' | 'alert';

interface WiiSoundsOptions {
  basePath?: string;
  volume?: number;
  enabled?: boolean;
}

interface AttachedListener {
  btn: Element;
  onEnter: () => void;
  onClick: () => void;
}

class WiiSounds {
  basePath: string;
  volume: number;
  enabled: boolean;
  private sounds: Record<SoundName, string>;
  private audioCache: Record<string, HTMLAudioElement>;
  private _attachedListeners: AttachedListener[];

  constructor(options: WiiSoundsOptions = {}) {
    this.basePath = options.basePath || `${import.meta.env.BASE_URL}assets/audio/`;
    this.volume = options.volume !== undefined ? options.volume : 0.5;
    this.enabled = options.enabled !== undefined ? options.enabled : true;

    this.sounds = {
      hover: 'button-hover.mp3',
      select: 'button-select.mp3',
      back: 'back.mp3',
      cancel: 'button-cancel.mp3',
      open: 'channel-open.mp3',
      close: 'channel-back.mp3',
      alert: 'alert.mp3',
    };

    this.audioCache = {};
    this._attachedListeners = [];
  }

  getAudio(name: SoundName): HTMLAudioElement {
    if (!this.audioCache[name]) {
      const audio = new Audio(this.basePath + this.sounds[name]);
      audio.volume = this.volume;
      this.audioCache[name] = audio;
    }
    return this.audioCache[name];
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    if (!this.sounds[name]) return;

    const source = this.getAudio(name);
    const audio = source.cloneNode() as HTMLAudioElement;
    audio.volume = this.volume;
    audio.play().catch(() => {});
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    Object.values(this.audioCache).forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  attach(container: Document | HTMLElement = document): void {
    const buttons = container.querySelectorAll(
      '.wii-btn, .wii-channel, .wii-tab, .wii-list-item'
    );
    buttons.forEach((btn) => {
      if ((btn as HTMLElement).dataset.wiiSoundAttached) return;
      (btn as HTMLElement).dataset.wiiSoundAttached = 'true';
      const onEnter = () => this.play('hover');
      const onClick = () => this.play('select');
      btn.addEventListener('mouseenter', onEnter);
      btn.addEventListener('click', onClick);
      this._attachedListeners.push({ btn, onEnter, onClick });
    });
  }

  detach(): void {
    for (const { btn, onEnter, onClick } of this._attachedListeners) {
      btn.removeEventListener('mouseenter', onEnter);
      btn.removeEventListener('click', onClick);
      delete (btn as HTMLElement).dataset.wiiSoundAttached;
    }
    this._attachedListeners = [];
  }
}

export default WiiSounds;
