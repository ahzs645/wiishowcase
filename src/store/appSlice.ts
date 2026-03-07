import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Screen = 'black' | 'safety' | 'menu' | 'settings' | 'channel-select' | 'messageboard' | 'news';

export const SCREENS: Screen[] = ['black', 'safety', 'menu', 'settings', 'channel-select', 'messageboard', 'news'];

export interface ChannelDef {
  id: string;
  name: string;
  action?: string;
  target?: string;
  bundle?: string;
  video?: string;
  audio?: string;
  contentComponent?: React.ComponentType<{ playing?: boolean }>;
  contentClassName?: string;
  rendererSettings?: Record<string, unknown>;
  gradient?: string;
  blank?: boolean;
}

export interface ZoomOrigin {
  x: number;
  y: number;
}

interface AppState {
  phase: Screen;
  cursorActive: boolean;
  devMode: boolean;
  showPairing: boolean;
  showHomeMenu: boolean;
  selectedChannel: ChannelDef | null;
  menuZoomOut: boolean;
  zoomOrigin: ZoomOrigin | null;
  messageBoardDateOverride: string | null;
  calendarTargetDate: number | null; // timestamp
  pairingControllerId: number | null;
}

const urlParams = new URLSearchParams(window.location.search);
const startInDevMode = urlParams.get('dev') === 'true';
const startScreen = urlParams.get('screen') as Screen | null;

const initialState: AppState = {
  phase: startScreen && SCREENS.includes(startScreen) ? startScreen : 'black',
  cursorActive: !!(startInDevMode || startScreen),
  devMode: startInDevMode,
  showPairing: false,
  showHomeMenu: false,
  selectedChannel: null,
  menuZoomOut: false,
  zoomOrigin: null,
  messageBoardDateOverride: null,
  calendarTargetDate: null,
  pairingControllerId: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setPhase(state, action: PayloadAction<Screen>) {
      state.phase = action.payload;
    },
    setCursorActive(state, action: PayloadAction<boolean>) {
      state.cursorActive = action.payload;
    },
    setDevMode(state, action: PayloadAction<boolean>) {
      state.devMode = action.payload;
    },
    toggleDevMode(state) {
      state.devMode = !state.devMode;
    },
    setShowPairing(state, action: PayloadAction<boolean>) {
      state.showPairing = action.payload;
    },
    setShowHomeMenu(state, action: PayloadAction<boolean>) {
      state.showHomeMenu = action.payload;
    },
    toggleHomeMenu(state) {
      state.showHomeMenu = !state.showHomeMenu;
    },
    setSelectedChannel(state, action: PayloadAction<ChannelDef | null>) {
      state.selectedChannel = action.payload;
    },
    setMenuZoomOut(state, action: PayloadAction<boolean>) {
      state.menuZoomOut = action.payload;
    },
    setZoomOrigin(state, action: PayloadAction<ZoomOrigin | null>) {
      state.zoomOrigin = action.payload;
    },
    setMessageBoardDateOverride(state, action: PayloadAction<string | null>) {
      state.messageBoardDateOverride = action.payload;
    },
    setCalendarTargetDate(state, action: PayloadAction<number | null>) {
      state.calendarTargetDate = action.payload;
    },
    setPairingControllerId(state, action: PayloadAction<number | null>) {
      state.pairingControllerId = action.payload;
    },
    clearMessageBoardState(state) {
      state.messageBoardDateOverride = null;
      state.calendarTargetDate = null;
    },
    returnToMenu(state) {
      state.phase = 'menu';
      state.selectedChannel = null;
      state.menuZoomOut = false;
    },
    resetToBlack(state) {
      state.phase = 'black';
      state.cursorActive = false;
    },
  },
});

export const {
  setPhase,
  setCursorActive,
  setDevMode,
  toggleDevMode,
  setShowPairing,
  setShowHomeMenu,
  toggleHomeMenu,
  setSelectedChannel,
  setMenuZoomOut,
  setZoomOrigin,
  setMessageBoardDateOverride,
  setCalendarTargetDate,
  setPairingControllerId,
  clearMessageBoardState,
  returnToMenu,
  resetToBlack,
} = appSlice.actions;

export default appSlice.reducer;
