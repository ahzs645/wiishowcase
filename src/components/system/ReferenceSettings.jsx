import { WiiButton } from './SystemUI';

// Only questions visible in the collected screenshots are reconstructed here.
// Keep an older locally entered question available instead of overwriting it.
export const SECRET_QUESTIONS = [
  "What is your mother's maiden name?",
  "What's your favorite movie?",
];

export function SecretQuestion({ draft, answerStep, change, edit }) {
  const questions = [...new Set([...SECRET_QUESTIONS, draft.secretQuestion].filter(Boolean))];
  const question = draft.secretQuestion || questions[0];
  return <div className={`native-secret native-secret--${answerStep ? 'answer' : 'question'}`}>
    {answerStep ? <>
      <p>Secret Question</p>
      <div className="native-reference-field native-secret-question-text">{question}</div>
      <p>Enter the answer to your secret question.</p>
      <WiiButton className="native-reference-field" aria-label="Secret answer" onClick={() => edit('secretAnswer', 'Secret answer', 30)}>
        {draft.secretAnswer || <span aria-hidden="true">&nbsp;</span>}
      </WiiButton>
    </> : <>
      <p>Choose a secret question in<br />case you forget your PIN.</p>
      <div className="native-secret-selector">
        <div className="native-reference-field" role="status" aria-label="Selected secret question">{question}</div>
        <WiiButton className="native-question-arrow" aria-label="Next secret question" onClick={() => change('secretQuestion', questions[(questions.indexOf(question) + 1) % questions.length])}>
          <span className="wii-icon wii-icon-control-next" aria-hidden="true" />
        </WiiButton>
      </div>
    </>}
  </div>;
}

export function ConsoleInformation() {
  return <div className="native-console-information">
    <dl><div><dt>MAC Address</dt><dd>Unavailable in browser</dd></div>
      <div className="native-lan-address"><dt>LAN Adapter MAC Address</dt><dd>Unavailable in browser</dd></div></dl>
    <p className="native-capability-note">This browser cannot read hardware MAC addresses.</p>
  </div>;
}

export function UserAgreements({ step }) {
  if (step === 'prompt') return <div className="native-agreement-prompt"><p>Would you like to use the Wii Shop Channel<br />and WiiConnect24?</p><p className="native-capability-note">Recreation only. Nintendo service enrollment is unavailable.</p></div>;
  if (step === 'notice') return <div className="native-agreement-prompt"><p>You must review the User Agreements<br />before using Wii network services.</p><p className="native-capability-note">The next screen describes this recreation's local behavior.</p></div>;
  return <div className="native-agreement-document" role="region" aria-label="Recreation user agreement" tabIndex={0}>
    <h2>Wii Showcase — local recreation</h2>
    <p>This is the agreement for this browser recreation, not Nintendo's Wii Network Services User Agreement.</p>
    <p>Settings, channel arrangements, messages and Address Book entries are stored on this device. Clearing this site's data removes them.</p>
    <p>Nintendo's discontinued Wii services are not connected. Accepting this notice does not enroll this device in WiiConnect24 or the Wii Shop Channel.</p>
    <p>Online channel data uses your browser's connection and the separate Internet preference. Accepting this notice does not turn that preference on.</p>
    <p>You can return here to review this information or decline it. Your choice is stored locally.</p>
  </div>;
}
