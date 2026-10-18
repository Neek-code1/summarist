import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBook,
  FiBookOpen,
  FiCheck,
  FiHeadphones,
  FiStar,
} from "react-icons/fi";
import useLibrary from "./useLibrary";
import "./BookDetails.css";

const API = "https://us-central1-summaristt.cloudfunctions.net";

export default function BookDetails() {
  const { id } = useParams();

  const {
    isSaved,
    toggleBook,
    loading: libraryLoading = false,
    error: libraryError = "",
  } = useLibrary();

  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);

  const savingRef = useRef(false);
  const activeRequestRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const requestToken = {};
    activeRequestRef.current = requestToken;

    setBook(null);
    setError("");
    setSaveError("");
    setSaving(false);
    savingRef.current = false;

    async function loadBook() {
      try {
        const response = await fetch(
          `${API}/getBook?id=${encodeURIComponent(id)}`,
          { signal: controller.signal }
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
      activeRequestRef.current = null;
    };
  }, [id, retry]);

  async function handleSave() {
    if (
      !book ||
      savingRef.current ||
      libraryLoading ||
      libraryError
    ) {
      return;
    }

    const requestToken = activeRequestRef.current;

    savingRef.current = true;
    setSaving(true);
    setSaveError("");

    try {
      await toggleBook(book);
    } catch {
      if (activeRequestRef.current === requestToken) {
        setSaveError(
          "Unable to update your library. Check your connection and try again."
        );
      }
    } finally {
      if (activeRequestRef.current === requestToken) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const saved = book ? isSaved(book.id) : false;

  return (
    <div className="bd-page">
      <header className="bd-header">
        <Link className="bd-logo" to="/">
          Summarist
        </Link>

        <div className="bd-header-links">
          <Link className="bd-back" to="/library">
            <FiBook /> My Library
          </Link>

          <Link className="bd-back" to="/for-you">
            <FiArrowLeft /> Back to books
          </Link>
        </div>
      </header>

      <main className="bd-content">
        {error ? (
          <div role="alert">
            <p className="bd-error">{error}</p>

            <button
              type="button"
              className="bd-button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : !book ? (
          <div role="status" aria-label="Loading book">
            <div className="bd-loading bd-loading-title" />
            <div className="bd-loading bd-loading-line" />
            <div className="bd-loading bd-loading-cover" />
          </div>
        ) : (
          <>
            <section className="bd-overview">
              <div className="bd-information">
                <h1>
                  {book.title}

                  {book.subscriptionRequired && (
                    <span className="bd-premium">Premium</span>
                  )}
                </h1>

                <p className="bd-author">{book.author}</p>

                <p className="bd-subtitle">{book.subTitle}</p>

                <div className="bd-metadata">
                  <span>
                    <FiStar />
                    {book.averageRating ?? "—"} rating
                  </span>

                  <span>{book.totalRating ?? 0} ratings</span>
                  <span>{book.keyIdeas ?? "—"} key ideas</span>
                  <span>{book.type || "Audio & text"}</span>
                </div>

                <div className="bd-actions">
                  <Link
                    className="bd-button"
                    to={`/player/${book.id}`}
                  >
                    <FiBookOpen /> Read
                  </Link>

                  <Link
                    className="bd-button"
                    to={`/player/${book.id}`}
                  >
                    <FiHeadphones /> Listen
                  </Link>
                </div>

                <button
                  type="button"
                  className="bd-save"
                  aria-pressed={saved}
                  aria-busy={saving}
                  disabled={
                    saving || libraryLoading || Boolean(libraryError)
                  }
                  onClick={handleSave}
                >
                  {saved ? <FiCheck /> : <FiBook />}

                  {libraryLoading
                    ? "Loading your library..."
                    : saving
                      ? "Updating library..."
                      : saved
                        ? "Remove from My Library"
                        : "Add to My Library"}
                </button>

                {saved && !libraryLoading && !libraryError && (
                  <p className="bd-save-status" role="status">
                    In My Library.{" "}
                    <Link to="/library">View My Library</Link>
                  </p>
                )}

                {libraryError && (
                  <p className="bd-error" role="alert">
                    {libraryError}
                  </p>
                )}

                {saveError && (
                  <p className="bd-error" role="alert">
                    {saveError}
                  </p>
                )}
              </div>

              <img
                className="bd-cover"
                src={book.imageLink}
                alt={`${book.title} cover`}
              />
            </section>

            <section className="bd-description">
              <h2>What's it about?</h2>

              <div className="bd-tags">
                {(Array.isArray(book.tags) ? book.tags : []).map(
                  (tag) => (
                    <span key={tag}>{tag}</span>
                  )
                )}
              </div>

              <p>{book.bookDescription}</p>

              <h2>About the author</h2>
              <p>{book.authorDescription}</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}