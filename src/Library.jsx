import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiBook, FiStar, FiTrash2 } from "react-icons/fi";
import useLibrary from "./useLibrary";
import "./Library.css";

function LibraryCard({ book, onRemove, section, removing }) {
  return (
    <article className="library-card">
      <Link to={`/book/${book.id}`}>
        <div className="library-cover">
          {book.subscriptionRequired && (
            <span className="library-premium">Premium</span>
          )}

          <img
            src={book.imageLink}
            alt={`${book.title} cover`}
            loading="lazy"
          />
        </div>

        <h2>{book.title}</h2>

        <p className="library-author">{book.author}</p>

        <p className="library-subtitle">{book.subTitle}</p>

        <span className="library-rating">
          <FiStar />
          {book.averageRating ?? "—"}
        </span>
      </Link>

      <button
        type="button"
        className="library-remove"
        aria-label={`Remove ${book.title} from ${section}`}
        aria-busy={removing}
        disabled={removing}
        onClick={() => onRemove(book.id)}
      >
        <FiTrash2 />
        {removing ? "Removing..." : "Remove"}
      </button>
    </article>
  );
}

export default function Library() {
  const {
    savedBooks,
    finishedBooks,
    removeBook,
    removeFinished,
    loading = false,
    error: libraryError = "",
  } = useLibrary();

  const [error, setError] = useState("");
  const [removing, setRemoving] = useState({});
  const pendingRef = useRef(new Set());

  async function handleRemove(id, finished = false) {
    const key = `${finished ? "finished" : "saved"}:${id}`;

    if (pendingRef.current.has(key)) return;

    pendingRef.current.add(key);
    setRemoving((current) => ({
      ...current,
      [key]: true,
    }));
    setError("");

    try {
      if (finished) {
        await removeFinished(id);
      } else {
        await removeBook(id);
      }
    } catch {
      setError(
        "Unable to remove this book. Check your connection and try again.",
      );
    } finally {
      pendingRef.current.delete(key);

      setRemoving((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  const empty = savedBooks.length === 0 && finishedBooks.length === 0;

  return (
    <div className="library-page">
      <header className="library-header">
        <Link className="library-logo" to="/">
          Summarist
        </Link>

        <Link className="library-back" to="/for-you">
          <FiArrowLeft /> Back to books
        </Link>
      </header>

      <main className="library-content">
        <h1>My Library</h1>

        {loading ? (
          <p className="library-intro" role="status">
            Loading your library...
          </p>
        ) : libraryError ? (
          <p className="library-error" role="alert">
            {libraryError}
          </p>
        ) : (
          <>
            <p className="library-intro">
              {savedBooks.length} saved · {finishedBooks.length} finished
            </p>

            {error && (
              <p className="library-error" role="alert">
                {error}
              </p>
            )}

            {empty ? (
              <div className="library-empty">
                <FiBook />

                <h2>Your library is empty</h2>

                <p>Save a book or finish listening to one to see it here.</p>

                <Link className="library-browse" to="/for-you">
                  Browse books
                </Link>
              </div>
            ) : (
              <>
                <section
                  aria-labelledby="saved-heading"
                  style={{ marginBottom: 40 }}
                >
                  <h2 id="saved-heading" style={{ marginBottom: 24 }}>
                    Saved Books
                  </h2>

                  {savedBooks.length ? (
                    <div className="library-grid">
                      {savedBooks.map((book) => (
                        <LibraryCard
                          key={book.id}
                          book={book}
                          section="Saved Books"
                          removing={Boolean(removing[`saved:${book.id}`])}
                          onRemove={(id) => handleRemove(id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="library-intro">No saved books yet.</p>
                  )}
                </section>

                <section aria-labelledby="finished-heading">
                  <h2 id="finished-heading" style={{ marginBottom: 24 }}>
                    Finished Books
                  </h2>

                  {finishedBooks.length ? (
                    <div className="library-grid">
                      {finishedBooks.map((book) => (
                        <LibraryCard
                          key={book.id}
                          book={book}
                          section="Finished Books"
                          removing={Boolean(removing[`finished:${book.id}`])}
                          onRemove={(id) => handleRemove(id, true)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="library-intro">
                      Finish a book's audio to add it here.
                    </p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
