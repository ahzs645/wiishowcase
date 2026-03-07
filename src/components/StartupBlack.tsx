interface StartupBlackProps {
  fadeOut: boolean;
}

export default function StartupBlack({ fadeOut }: StartupBlackProps) {
  return (
    <div className={`startup-black${fadeOut ? ' fade-out' : ''}`} />
  );
}
