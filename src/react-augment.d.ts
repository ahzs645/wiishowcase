import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'wii-channel-holder': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'wii-banner': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
