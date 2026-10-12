// The menu has no headline snapshot yet. Show the native access-channel
// message until a provider supplies data to both the icon and banner.
const NEWS_INPUTS = { enabled: true, headlines: [], state: 'needs_access', scrollSpeed: 30 };

export const NEWS_RENDERER_SETTINGS = {
  banner: {
    tevQuality: 'fast',
    renderState: null,
    paneStateSelections: {
      'line::line': null,
      'textB0::textT': null,
    },
    titleLocale: null,
    customNews: NEWS_INPUTS,
  },
  icon: {
    renderState: null,
    customNews: NEWS_INPUTS,
  },
};
