import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import {
  FiBook,
  FiHeadphones,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiSettings,
  FiStar,
  FiX,
} from "react-icons/fi";
import "./ForYou.css";

const API = "https://us-central1-summaristt.cloudfunctions.net";

async function fetchBooks(path, signal) {
  const response = await fetch(`${API}/${path}`, { signal });

  if (!response.ok) {
    throw new Error("Books could not load. Please try again.");
  }

  return response.json();
}

function BookCard({ book }) {
  return (
    <Link className="fy-book" to={`/book/${book.id}`}>
      <div className="fy-cover">
        {book.subscriptionRequired && (
          <span className="fy-premium">Premium</span>
        )}

        <img src={book.imageLink} alt={`${book.title} cover`} loading="lazy" />
      </div>

      <h3>{book.title}</h3>
      <p className="fy-author">{book.author}</p>
      <p className="fy-subtitle">{book.subTitle}</p>

      <div className="fy-meta">
        <span>
          <FiHeadphones /> Audio
        </span>

        <span>
          <FiStar />
          {book.averageRating ?? "—"}
        </span>
      </div>
    </Link>
  );
}

function LoadingBooks() {
  return (
    <div className="fy-books" role="status" aria-label="Loading books">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="fy-skeleton-card" key={index}>
          <div className="fy-skeleton fy-skeleton-cover" />
          <div className="fy-skeleton fy-skeleton-line" />
          <div className="fy-skeleton fy-skeleton-line" />
        </div>
      ))}
    </div>
  );
}

export default function ForYou() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [books, setBooks] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    setError("");
    setBooks(null);

    Promise.all(
      ["selected", "recommended", "suggested"].map((status) =>
        fetchBooks(`getBooks?status=${status}`, controller.signal),
      ),
    )
      .then(([selected, recommended, suggested]) => {
        if (controller.signal.aborted) return;

        setBooks({
          selected: Array.isArray(selected)
            ? selected
            : selected
              ? [selected]
              : [],
          recommended: Array.isArray(recommended) ? recommended : [],
          suggested: Array.isArray(suggested) ? suggested : [],
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      });

    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const controller = new AbortController();

    setResults([]);
    setSearchError("");

    if (!query.trim()) {
      setSearching(false);
      return () => controller.abort();
    }

    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const data = await fetchBooks(
          `getBooksByAuthorOrTitle?search=${encodeURIComponent(query.trim())}`,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSearchError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const isSearching = Boolean(query.trim());

  return (
    <div className="fy">
      {menuOpen && (
        <button
          type="button"
          className="fy-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`fy-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="fy-sidebar-heading">
          <Link to="/" className="fy-logo">
            Summarist
          </Link>

          <button
            type="button"
            className="fy-mobile-button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <FiX />
          </button>
        </div>

        <nav aria-label="Main navigation">
          <Link
            className="fy-nav-item active"
            to="/for-you"
            aria-current="page"
            onClick={() => {
              setQuery("");
              setMenuOpen(false);
            }}
          >
            <FiHome /> For you
          </Link>

          <Link
            className="fy-nav-item"
            to="/library"
            onClick={() => setMenuOpen(false)}
          >
            <FiBook /> My Library
          </Link>

          <button type="button" className="fy-nav-item" disabled>
            <FiStar /> Highlights
          </button>

          <button type="button" className="fy-nav-item" disabled>
            <FiSearch /> Search
          </button>

          <Link
            className="fy-nav-item"
            to="/settings"
            onClick={() => setMenuOpen(false)}
          >
            <FiSettings /> Settings
          </Link>

          <button type="button" className="fy-nav-item" disabled>
            <FiHelpCircle /> Help & Support
          </button>

          <button
            type="button"
            className="fy-nav-item"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              font: "inherit",
              textAlign: "left",
              cursor: loggingOut ? "wait" : "pointer",
            }}
          >
            <FiLogOut />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>

          {logoutError && (
            <p className="fy-error" role="alert" style={{ padding: "0 16px" }}>
              {logoutError}
            </p>
          )}
        </nav>
      </aside>

      <div className="fy-main">
        <header className="fy-header">
          <button
            type="button"
            className="fy-mobile-button"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <FiMenu />
          </button>

          <div className="fy-search">
            <input
              type="search"
              aria-label="Search books by title or author"
              placeholder="Search for books"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <FiSearch aria-hidden="true" />
          </div>
        </header>

        <main className="fy-content">
          {isSearching ? (
            <>
              <h1>Search results</h1>

              {searching ? (
                <LoadingBooks />
              ) : searchError ? (
                <p className="fy-error" role="alert">
                  {searchError}
                </p>
              ) : results.length ? (
                <div className="fy-books">
                  {results.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              ) : (
                <p>No books found. Try another title or author.</p>
              )}
            </>
          ) : (
            <>
              <h1>For you</h1>

              {error ? (
                <div role="alert">
                  <p className="fy-error">{error}</p>

                  <button
                    type="button"
                    className="fy-retry"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Try again
                  </button>
                </div>
              ) : !books ? (
                <LoadingBooks />
              ) : (
                <>
                  <section className="fy-section">
                    <h2>Selected just for you</h2>

                    {books.selected.map((book) => (
                      <Link
                        className="fy-selected"
                        key={book.id}
                        to={`/book/${book.id}`}
                      >
                        <div>
                          <p className="fy-selected-label">{book.subTitle}</p>

                          <h3>{book.title}</h3>
                          <p className="fy-author">{book.author}</p>

                          {book.subscriptionRequired && (
                            <span className="fy-selected-premium">Premium</span>
                          )}
                        </div>

                        <img src={book.imageLink} alt={`${book.title} cover`} />
                      </Link>
                    ))}
                  </section>

                  <section className="fy-section">
                    <h2>Recommended for you</h2>

                    <p className="fy-section-subtitle">
                      We think you'll like these
                    </p>

                    <div className="fy-books">
                      {books.recommended.map((book) => (
                        <BookCard key={book.id} book={book} />
                      ))}
                    </div>
                  </section>

                  <section className="fy-section">
                    <h2>Suggested books</h2>

                    <p className="fy-section-subtitle">Browse those books</p>

                    <div className="fy-books">
                      {books.suggested.map((book) => (
                        <BookCard key={book.id} book={book} />
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
