class WiiSounds {
  constructor(options = {}) {
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
  }

  getAudio(name) {
    if (!this.audioCache[name]) {
      const audio = new Audio(this.basePath + this.sounds[name]);
      audio.volume = this.volume;
      this.audioCache[name] = audio;
    }
    return this.audioCache[name];
  }

  play(name) {
    if (!this.enabled) return;
    if (!this.sounds[name]) return;

    const source = this.getAudio(name);
    const audio = source.cloneNode();
    audio.volume = this.volume;
    audio.play().catch(() => {});
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    Object.values(this.audioCache).forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  attach(container = document) {
    const buttons = container.querySelectorAll(
      '.wii-btn, .wii-channel, .wii-tab, .wii-list-item'
    );
    buttons.forEach((btn) => {
      if (btn.dataset.wiiSoundAttached) return;
      btn.dataset.wiiSoundAttached = 'true';
      btn.addEventListener('mouseenter', () => this.play('hover'));
      btn.addEventListener('click', () => this.play('select'));
    });
  }
}

export default WiiSounds;
