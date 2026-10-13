import { useState } from "react";
import {
  useSystemState,
  updateSystem,
  addMessage,
  getStorageError,
} from "../../lib/systemState";
import { WiiButton, SystemDialog } from "./SystemUI";
import SystemKeyboard from "./SystemKeyboard";
import MessageArt from "./MessageArt";
const PETER = `${import.meta.env.BASE_URL}assets/message-board/Peter.miic`;
export default function MessageTools({ onClose, dateKey, reply }) {
  const system = useSystemState();
  const [screen, setScreen] = useState(reply ? "Letter" : "Create Message");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState(reply?.sender || "");
  const [mii, setMii] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [keyboard, setKeyboard] = useState(null);
  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [posted, setPosted] = useState(false);
  const edit = (label, value, onConfirm, multiline = false, maxLength = 1000) =>
    setKeyboard({
      message: label,
      value,
      onConfirm,
      multiline,
      maxLength,
      predictions: multiline,
      language: system.settings.language,
    });
  const back = () => {
    setNotice("");
    if (["Create Message", "Letter"].includes(screen) && reply) onClose();
    else if (screen === "Create Message") onClose();
    else if (screen === "Register") setScreen("Address Book");
    else if (selectedFriend) {
      setSelectedFriend(null);
      setConfirmDelete(false);
    } else setScreen("Create Message");
  };
  const post = () => {
    if (!body.trim()) {
      setNotice("Write a message first.");
      return;
    }
    if (screen === "Letter" && !recipient) {
      setNotice("Choose a recipient from your Address Book.");
      return;
    }
    addMessage({
      dateKey,
      type: screen === "Memo" ? "memo" : "invite",
      sender: screen === "Memo" ? "Memo" : system.settings.nickname,
      recipient: screen === "Letter" ? recipient : undefined,
      preview: body.split("\n")[0].slice(0, 50),
      lines: body.split("\n").map((text) => ({ kind: "text", text })),
      miiDataUrl: mii ? PETER : undefined,
      avatarFallback: system.settings.nickname[0],
      photo,
      replyTo: reply?.id,
      delivery: screen === "Letter" ? "local" : undefined,
    });
    setPosted(true);
    setNotice(
      getStorageError() ||
        (screen === "Memo"
          ? "Memo posted."
          : "Letter saved locally. Wii messaging delivery is unavailable."),
    );
  };
  const upload = async (file) => {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2000000
    ) {
      setNotice("Choose a PNG, JPEG or WebP image smaller than 2 MB.");
      return;
    }
    const data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!data) {
      setNotice("The photo could not be read.");
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / image.width, 480 / image.height);
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.8));
      setNotice("");
    };
    image.onerror = () => setNotice("The photo could not be read.");
    image.src = data;
  };
  const register = () => {
    const normalized = address.includes("@")
      ? address.trim()
      : address.replace(/[\s-]/g, "");
    if (
      !name.trim() ||
      !(
        /^[0-9]{16}$/.test(normalized) ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())
      )
    ) {
      setNotice("Enter a nickname and a 16-digit Wii Number or email address.");
      return;
    }
    if (system.friends.some((friend) => friend.address === normalized)) {
      setNotice("That address is already registered.");
      return;
    }
    if (system.friends.length >= 100) {
      setNotice("The Address Book is full.");
      return;
    }
    updateSystem((s) => ({
      ...s,
      friends: [
        ...s.friends,
        { id: crypto.randomUUID(), name: name.trim(), address: normalized },
      ],
    }));
    setName("");
    setAddress("");
    setScreen("Address Book");
    setNotice("Friend registered.");
  };
  let content, actions;
  if (posted) {
    content = <p role="status">{notice}</p>;
    actions = <WiiButton onClick={onClose}>OK</WiiButton>;
  } else if (screen === "Create Message")
    content = (
      <div className="message-create-choices">
        {["Memo", "Letter", "Address Book"].map((label) => (
          <button key={label} onClick={() => setScreen(label)}>
            <MessageArt kind={label} />
            <span className="message-choice-label">{label}</span>
          </button>
        ))}
      </div>
    );
  else if (screen === "Address Book" && !selectedFriend) {
    content = (
      <>
        <div className="address-book-list">
          {Array.from({ length: 5 }, (_, i) => {
            const friend = system.friends[page * 5 + i];
            return (
              <button
                key={i}
                disabled={!friend}
                onClick={() => setSelectedFriend(friend)}
              >
                <span className="address-avatar" aria-hidden="true">
                  {friend?.name[0] || "♙"}
                </span>
                {friend?.name || ""}
              </button>
            );
          })}
        </div>
        <div className="system-pagination">
          <WiiButton
            aria-label="Previous Address Book page"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            ‹
          </WiiButton>
          <span>{page + 1} / 20</span>
          <WiiButton
            aria-label="Next Address Book page"
            disabled={page === 19}
            onClick={() => setPage(page + 1)}
          >
            ›
          </WiiButton>
        </div>
        <p>Wii Number: {system.wiiNumber.match(/.{1,4}/g).join(" ")}</p>
      </>
    );
    actions = (
      <WiiButton
        disabled={system.friends.length >= 100}
        onClick={() => setScreen("Register")}
      >
        Register
      </WiiButton>
    );
  } else if (screen === "Address Book") {
    content = (
      <>
        <p>{selectedFriend.name}</p>
        <p>{selectedFriend.address}</p>
        {confirmDelete && <p>Erase this Address Book entry?</p>}
      </>
    );
    actions = confirmDelete ? (
      <>
        <WiiButton
          onClick={() => {
            updateSystem((s) => ({
              ...s,
              friends: s.friends.filter((f) => f.id !== selectedFriend.id),
            }));
            setSelectedFriend(null);
            setConfirmDelete(false);
          }}
        >
          Yes
        </WiiButton>
        <WiiButton onClick={() => setConfirmDelete(false)}>No</WiiButton>
      </>
    ) : (
      <>
        <WiiButton
          onClick={() => {
            setRecipient(selectedFriend.name);
            setSelectedFriend(null);
            setScreen("Letter");
          }}
        >
          Create Letter
        </WiiButton>
        <WiiButton onClick={() => setConfirmDelete(true)}>Erase</WiiButton>
      </>
    );
  } else if (screen === "Register") {
    content = (
      <div className="address-register">
        <label>
          Nickname
          <WiiButton
            aria-label="Enter nickname"
            onClick={() => edit("Friend nickname", name, setName, false, 20)}
          >
            {name || "Enter nickname"}
          </WiiButton>
        </label>
        <label>
          Wii Number or email
          <WiiButton
            aria-label="Enter address"
            onClick={() =>
              edit("Wii Number or email", address, setAddress, false, 100)
            }
          >
            {address || "Enter address"}
          </WiiButton>
        </label>
      </div>
    );
    actions = <WiiButton onClick={register}>Register friend</WiiButton>;
  } else {
    content = (
      <div className="message-composer">
        {screen === "Letter" && (
          <label>
            To{" "}
            {reply ? (
              <span>{recipient}</span>
            ) : (
              <select
                aria-label="Letter recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              >
                <option value="">Choose a friend</option>
                {system.friends.map((friend) => (
                  <option key={friend.id} value={friend.name}>
                    {friend.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
        <WiiButton onClick={() => setMii(!mii)}>
          {mii ? "✓ Peter Mii — Remove" : "＋ Add a Mii"}
        </WiiButton>
        <button
          className="message-write-body"
          data-empty={!body}
          aria-label={screen === "Memo" ? "Write a memo" : "Write a letter"}
          onClick={() =>
            edit(`Write a ${screen.toLowerCase()}`, body, setBody, true)
          }
        >
          {body || `Write a ${screen.toLowerCase()}`}
        </button>
        {screen === "Letter" && (
          <label className="message-photo-attach">
            Attach photo
            <input
              aria-label="Attach photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        )}
        {photo && (
          <>
            <img
              className="message-attachment-preview"
              src={photo}
              alt="Attached photo"
            />
            <WiiButton onClick={() => setPhoto(null)}>Remove photo</WiiButton>
          </>
        )}
      </div>
    );
    actions = (
      <WiiButton onClick={post}>
        {screen === "Memo" ? "Post" : "Save Letter"}
      </WiiButton>
    );
  }
  return (
    <>
      <SystemDialog
        title={screen}
        onBack={back}
        actions={actions}
        variant={
          posted || selectedFriend
            ? "dialog"
            : screen === "Create Message"
              ? "message-chooser"
              : screen === "Address Book"
                ? "address-book"
                : ["Memo", "Letter"].includes(screen)
                  ? "composer"
                  : "dialog"
        }
      >
        {content}
        {!posted && notice && <p role="alert">{notice}</p>}
      </SystemDialog>
      <SystemKeyboard request={keyboard} onClose={() => setKeyboard(null)} />
    </>
  );
}
