import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiPause, FiPlay } from "react-icons/fi";
import useLibrary from "./useLibrary";
import "./Player.css";

const API = "https://us-central1-summaristt.cloudfunctions.net";
const FONT_SIZES = [16, 20, 24, 28];

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = Math.floor(safeSeconds % 60);

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function Player() {
  const { id } = useParams();
  const { markFinished } = useLibrary();

  const audioRef = useRef(null);
  const requestRef = useRef(null);
  const savingFinishedRef = useRef(false);

  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [finishError, setFinishError] = useState("");
  const [finishedNotice, setFinishedNotice] = useState("");
  const [savingFinished, setSavingFinished] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [retry, setRetry] = useState(0);
  const [fontSize, setFontSize] = useState(20);

  useEffect(() => {
    const controller = new AbortController();
    const requestToken = {};

    requestRef.current = requestToken;
    savingFinishedRef.current = false;

    setBook(null);
    setError("");
    setAudioError("");
    setFinishError("");
    setFinishedNotice("");
    setSavingFinished(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setReady(false);
    setSpeed(1);

    async function loadBook() {
      try {
        const response = await fetch(
          `${API}/getBook?id=${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Unable to load this book.");
        }

        const data = await response.json();
        const result = Array.isArray(data) ? data[0] : data;

        if (!result?.id) {
          throw new Error("This book could not be found.");
        }

        if (!controller.signal.aborted) {
          setBook(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      }
    }

    loadBook();

    return () => {
      controller.abort();
      requestRef.current = null;
    };
  }, [id, retry]);

  async function togglePlayback() {
    const audio = audioRef.current;
    const requestToken = requestRef.current;

    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();

      if (requestRef.current === requestToken) {
        setAudioError("");
      }
    } catch {
      if (requestRef.current === requestToken) {
        setAudioError(
          "Audio could not play. Check your connection and try again.",
        );
      }
    }
  }

  function skip(seconds) {
    const audio = audioRef.current;

    if (!audio || !Number.isFinite(audio.duration)) return;

    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration, audio.currentTime + seconds),
    );

    setCurrentTime(audio.currentTime);
  }

  function seek(event) {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);

    if (!audio || !Number.isFinite(audio.duration)) return;

    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration, nextTime),
    );

    setCurrentTime(audio.currentTime);
  }

  function changeSpeed(event) {
    const nextSpeed = Number(event.target.value);

    setSpeed(nextSpeed);

    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  }

  async function saveFinishedBook() {
    if (!book || savingFinishedRef.current) return;

    const requestToken = requestRef.current;

    savingFinishedRef.current = true;
    setSavingFinished(true);
    setFinishError("");
    setFinishedNotice("");

    try {
      await markFinished(book);

      if (requestRef.current === requestToken) {
        setFinishedNotice("Book finished! Added to Finished Books.");
      }
    } catch {
      if (requestRef.current === requestToken) {
        setFinishError(
          "Audio finished, but your progress could not be saved.",
        );
      }
    } finally {
      if (requestRef.current === requestToken) {
        savingFinishedRef.current = false;
        setSavingFinished(false);
      }
    }
  }

  function handleEnded() {
    setPlaying(false);
    void saveFinishedBook();
  }

  function updateDuration(event) {
    const audio = event.currentTarget;

    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  }

  return (
    <div className="player-page">
      <header className="player-header">
        <Link className="player-logo" to="/">
          Summarist
        </Link>

        <Link className="player-back" to={`/book/${id}`}>
          <FiArrowLeft /> Back to book
        </Link>
      </header>

      <main className="player-content">
        {error ? (
          <div role="alert">
            <p className="player-error">{error}</p>

            <button
              type="button"
              className="player-retry"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : !book ? (
          <div role="status" aria-label="Loading book">
            <div className="player-skeleton player-title-skeleton" />

            {Array.from({ length: 8 }, (_, index) => (
              <div
                className="player-skeleton player-line-skeleton"
                key={index}
              />
            ))}
          </div>
        ) : (
          <>
            <h1>{book.title}</h1>

            <p className="player-author">{book.author}</p>

            <div
              className="player-font-controls"
              role="group"
              aria-label="Reading font size"
            >
              <span className="player-font-label">Font size</span>

              <div className="player-font-options">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`player-font-button ${
                      fontSize === size ? "selected" : ""
                    }`}
                    style={{ fontSize: `${size}px` }}
                    aria-label={`Set reading font size to ${size} pixels`}
                    aria-pressed={fontSize === size}
                    aria-controls="player-summary"
                    onClick={() => setFontSize(size)}
                  >
                    Aa
                  </button>
                ))}
              </div>
            </div>

            <div
              id="player-summary"
              className="player-summary"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.8,
                whiteSpace: "pre-line",
                overflowWrap: "anywhere",
              }}
            >
              {book.summary || "No summary is available for this book."}
            </div>
          </>
        )}
      </main>

      {book && (
        <footer className="player-bar">
          {book.audioLink && (
            <audio
              key={book.id}
              ref={audioRef}
              src={book.audioLink}
              preload="metadata"
              onLoadedMetadata={(event) => {
                updateDuration(event);
                event.currentTarget.playbackRate = speed;
              }}
              onDurationChange={updateDuration}
              onCanPlay={() => setReady(true)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={handleEnded}
              onTimeUpdate={(event) =>
                setCurrentTime(event.currentTarget.currentTime)
              }
              onError={() => {
                setReady(false);
                setPlaying(false);
                setAudioError(
                  "This audio could not load. You can still read the summary.",
                );
              }}
            />
          )}

          <div className="player-book">
            <img src={book.imageLink} alt={`${book.title} cover`} />

            <div>
              <strong>{book.title}</strong>
              <span>{book.author}</span>
            </div>
          </div>

          <div className="player-controls">
            <div className="player-buttons">
              <button
                type="button"
                className="player-skip"
                onClick={() => skip(-10)}
                disabled={!ready}
                aria-label="Rewind 10 seconds"
              >
                −10s
              </button>

              <button
                type="button"
                className="player-play"
                onClick={togglePlayback}
                disabled={!ready}
                aria-label={playing ? "Pause audio" : "Play audio"}
              >
                {playing ? <FiPause /> : <FiPlay />}
              </button>

              <button
                type="button"
                className="player-skip"
                onClick={() => skip(10)}
                disabled={!ready}
                aria-label="Forward 10 seconds"
              >
                +10s
              </button>

              <label className="player-speed">
                Speed
                <select
                  value={speed}
                  onChange={changeSpeed}
                  disabled={!book.audioLink}
                >
                  <option value="0.75">0.75×</option>
                  <option value="1">1×</option>
                  <option value="1.25">1.25×</option>
                  <option value="1.5">1.5×</option>
                  <option value="2">2×</option>
                </select>
              </label>
            </div>

            <div className="player-progress">
              <span>{formatTime(currentTime)}</span>

              <input
                type="range"
                aria-label="Audio position"
                min="0"
                max={duration}
                step="0.1"
                value={Math.max(0, Math.min(currentTime, duration))}
                onChange={seek}
                disabled={!ready || duration === 0}
              />

              <span>{formatTime(duration)}</span>
            </div>

            {!book.audioLink ? (
              <p className="player-error" role="status">
                No audio is available for this book.
              </p>
            ) : audioError ? (
              <p className="player-error" role="alert">
                {audioError}
              </p>
            ) : !ready ? (
              <p className="player-audio-status" role="status">
                Loading audio…
              </p>
            ) : null}

            {savingFinished && (
              <p className="player-audio-status" role="status">
                Saving your finished book...
              </p>
            )}

            {finishError && (
              <div role="alert">
                <p className="player-error">{finishError}</p>

                <button
                  type="button"
                  className="player-retry"
                  onClick={() => void saveFinishedBook()}
                  disabled={savingFinished}
                >
                  Retry saving
                </button>
              </div>
            )}

            {finishedNotice && (
              <p className="player-audio-status" role="status">
                {finishedNotice}{" "}
                <Link
                  to="/library"
                  style={{
                    color: "#0365f2",
                    textDecoration: "underline",
                  }}
                >
                  View My Library
                </Link>
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}