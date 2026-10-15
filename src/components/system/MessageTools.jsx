import { useState, useRef, useEffect } from "react";
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
function ContactAvatar({ mii }) {
  return mii ? (
    <img
      className="contact-mii"
      src={`${import.meta.env.BASE_URL}assets/message-board/Peter-head.png`}
      alt=""
    />
  ) : (
    <svg viewBox="0 0 40 46" aria-hidden="true">
      <circle cx="20" cy="15" r="9" />
      <path d="M5 42v-7c0-13 30-13 30 0v7z" />
    </svg>
  );
}
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
  const [friendMii, setFriendMii] = useState(false);
  const fileRef = useRef(null);
  // Registration feedback belongs to the Address Book. Do not carry it onto
  // a new paper surface, where it covered the supplied Wii footer artwork.
  useEffect(() => {
    if (screen === "Letter" || screen === "Memo") setNotice("");
  }, [screen]);
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
    else if (screen === "Recipient") setScreen("Letter");
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
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          address: normalized,
          avatar: friendMii ? "peter" : null,
        },
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
                  <ContactAvatar mii={friend?.avatar === "peter"} />
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
        <p className="address-book-number">
          Wii Number: {system.wiiNumber.match(/.{1,4}/g).join(" ")}
        </p>
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
        <WiiButton
          aria-pressed={friendMii}
          onClick={() => setFriendMii(!friendMii)}
        >
          {friendMii ? "Remove Mii" : "Add a Mii"}
        </WiiButton>
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
  } else if (screen === "Recipient") {
    content = (
      <div className="address-book-list">
        {system.friends.map((friend) => (
          <button
            key={friend.id}
            onClick={() => {
              setRecipient(friend.name);
              setScreen("Letter");
            }}
          >
            <span className="address-avatar">
              <ContactAvatar mii={friend.avatar === "peter"} />
            </span>
            {friend.name}
          </button>
        ))}
      </div>
    );
  } else {
    content = (
      <div className="message-composer">
        {screen === "Letter" && (
          <label>
            To{" "}
            {reply ? (
              <span>{recipient}</span>
            ) : (
              <WiiButton
                aria-label="Letter recipient"
                onClick={() => setScreen("Recipient")}
              >
                {recipient || "Choose a friend"}
              </WiiButton>
            )}
          </label>
        )}
        <WiiButton
          className="system-button message-add-mii"
          onClick={() => setMii(!mii)}
        >
          <span className="message-mii-frame">
            <ContactAvatar mii={mii} />
          </span>
          <span>{mii ? "Peter Mii — Remove" : "Add a Mii"}</span>
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
          <div className="message-photo-attach">
            <WiiButton onClick={() => fileRef.current?.click()}>
              Attach photo
            </WiiButton>
            <input
              ref={fileRef}
              className="system-visually-hidden"
              tabIndex={-1}
              aria-label="Photo attachment file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </div>
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
              : ["Address Book", "Recipient"].includes(screen)
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
