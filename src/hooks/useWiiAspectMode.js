import { useState, useEffect } from 'react';
import channelMask169 from '../../Wii.css/dist/assets/channel-mask.svg';
import channelMask43 from '../../Wii.css/dist/assets/channel-mask-43.svg';

const CHANNEL_PATH_169 =
  'M1002 3.5C1069.66 3.5 1125.47 3.49908 1164.54 5.64062L1168.27 5.85449L1168.28 5.85547C1173.85 6.21006 1179.13 8.51403 1183.18 12.3643C1187.22 16.209 1189.78 21.3508 1190.42 26.8926C1193.03 47.9647 1194.5 82.1481 1194.5 108.5C1194.5 134.842 1193.03 169.009 1190.42 190.083L1190.42 190.084C1189.79 195.635 1187.22 200.786 1183.18 204.636C1179.13 208.486 1173.85 210.79 1168.28 211.145L1168.27 211.146C1129.06 213.501 1071.84 213.5 1002 213.5C932.156 213.5 874.944 213.501 835.73 211.146L835.722 211.145C830.146 210.79 824.873 208.486 820.824 204.636C816.776 200.786 814.21 195.635 813.576 190.084V190.083C810.97 169.009 809.5 134.882 809.5 108.5C809.5 82.108 810.972 47.9647 813.579 26.8926C814.217 21.3508 816.782 16.209 820.824 12.3643C824.873 8.51402 830.146 6.21006 835.722 5.85547L835.73 5.85449L839.459 5.64062C878.532 3.49908 934.339 3.5 1002 3.5Z';

const CHANNEL_PATH_43 =
  'M1002 3.5C1048.4 3.5 1086.77 3.49908 1113.54 5.64062L1117.27 5.85449L1117.28 5.85547C1122.85 6.21006 1128.13 8.51403 1132.18 12.3643C1136.22 16.209 1138.78 21.3508 1139.42 26.8926C1142.03 47.9647 1143.5 82.1481 1143.5 108.5C1143.5 134.842 1142.03 169.009 1139.42 190.083L1139.42 190.084C1138.79 195.635 1136.22 200.786 1132.18 204.636C1128.13 208.486 1122.85 210.79 1117.28 211.145L1117.27 211.146C1090.07 213.501 1050.41 213.5 1002 213.5C953.59 213.5 913.93 213.501 886.73 211.146L886.722 211.145C881.146 210.79 875.873 208.486 871.824 204.636C867.776 200.786 865.21 195.635 864.576 190.084V190.083C861.97 169.009 860.5 134.882 860.5 108.5C860.5 82.108 861.972 47.9647 864.579 26.8926C865.217 21.3508 867.782 16.209 871.824 12.3643C875.873 8.51402 881.146 6.21006 886.722 5.85547L886.73 5.85449L890.459 5.64062C916.4 3.49908 955.11 3.5 1002 3.5Z';

const MQ = '(max-aspect-ratio: 4/3)';

function buildMaskDataUri(viewBox, path) {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}' preserveAspectRatio='none'%3E%3Cpath fill='%23fff' d='${path}'/%3E%3C/svg%3E")`;
}

const MASK_169 = buildMaskDataUri('806 0 391 217', CHANNEL_PATH_169);
const MASK_43 = buildMaskDataUri('857 0 289 217', CHANNEL_PATH_43);

function getMode(matches) {
  return matches
    ? {
        is43: true,
        channelPath: CHANNEL_PATH_43,
        viewBox: '857 0 289 217',
        maskUrl: channelMask43,
        maskDataUri: MASK_43,
        aspectRatio: 4 / 3,
        className: 'wii-43',
      }
    : {
        is43: false,
        channelPath: CHANNEL_PATH_169,
        viewBox: '806 0 391 217',
        maskUrl: channelMask169,
        maskDataUri: MASK_169,
        aspectRatio: 16 / 9,
        className: 'wii-169',
      };
}

export default function useWiiAspectMode() {
  const [mode, setMode] = useState(() => getMode(window.matchMedia(MQ).matches));

  useEffect(() => {
    const mql = window.matchMedia(MQ);
    const handler = (e) => setMode(getMode(e.matches));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return mode;
}
