export default function StartupBlack({ fadeOut }) {
  return (
    <div className={`startup-black${fadeOut ? ' fade-out' : ''}`} />
  );
}
