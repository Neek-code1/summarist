import { useEffect, useRef, useState } from "react";
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

        <img
          src={book.imageLink}
          alt={`${book.title} cover`}
          loading="lazy"
        />
      </div>

      <h3>{book.title}</h3>
      <p className="fy-author">{book.author}</p>
      <p className="fy-subtitle">{book.subTitle}</p>

      <div className="fy-meta">
        <span>
          <FiHeadphones /> Audio
        </span>

        <span>
          <FiStar /> {book.averageRating ?? "—"}
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

  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const logoutBusyRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [books, setBooks] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState({
    query: "",
    results: [],
    loading: false,
    error: "",
  });

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const searchTerm = query.trim();
  const showSearch = searchOpen && Boolean(searchTerm);
  const searching = search.loading || search.query !== searchTerm;

  async function handleLogout() {
    if (logoutBusyRef.current) return;

    logoutBusyRef.current = true;
    setLoggingOut(true);
    setLogoutError("");

    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch {
      logoutBusyRef.current = false;
      setLoggingOut(false);
      setLogoutError("Unable to log out. Please try again.");
    }
  }

  function focusSearch() {
    setMenuOpen(false);
    setSearchOpen(true);
    searchInputRef.current?.focus();
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

    if (!searchTerm) {
      setSearch({
        query: "",
        results: [],
        loading: false,
        error: "",
      });

      return () => controller.abort();
    }

    setSearch({
      query: searchTerm,
      results: [],
      loading: true,
      error: "",
    });

    const timer = setTimeout(async () => {
      try {
        const data = await fetchBooks(
          `getBooksByAuthorOrTitle?search=${encodeURIComponent(searchTerm)}`,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setSearch({
          query: searchTerm,
          results: Array.isArray(data) ? data.filter((book) => book?.id) : [],
          loading: false,
          error: "",
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        setSearch({
          query: searchTerm,
          results: [],
          loading: false,
          error: err.message,
        });
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!searchRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

      <aside
        id="fy-sidebar"
        className={`fy-sidebar ${menuOpen ? "open" : ""}`}
      >
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

        <nav className="fy-sidebar-nav" aria-label="Main navigation">
          <div className="fy-nav-top">
            <Link
              className="fy-nav-item active"
              to="/for-you"
              aria-current="page"
              onClick={() => {
                setQuery("");
                setSearchOpen(false);
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

            <button
              type="button"
              className="fy-nav-item"
              onClick={focusSearch}
            >
              <FiSearch /> Search
            </button>
          </div>

          <div className="fy-nav-bottom">
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
            >
              <FiLogOut />
              {loggingOut ? "Logging out..." : "Log out"}
            </button>

            {logoutError && (
              <p className="fy-error fy-logout-error" role="alert">
                {logoutError}
              </p>
            )}
          </div>
        </nav>
      </aside>

      <div className="fy-main">
        <header className="fy-header">
          <button
            type="button"
            className="fy-mobile-button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="fy-sidebar"
            onClick={() => setMenuOpen(true)}
          >
            <FiMenu />
          </button>

          <div
            className="fy-search"
            ref={searchRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setSearchOpen(false);
              }
            }}
          >
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Search books by title or author"
              aria-controls={showSearch ? "fy-search-results" : undefined}
              placeholder="Search for books"
              autoComplete="off"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && showSearch) {
                  const firstResult = searchRef.current?.querySelector(
                    ".fy-search-result",
                  );

                  if (firstResult) {
                    event.preventDefault();
                    firstResult.focus();
                  }
                }
              }}
            />

            <FiSearch aria-hidden="true" />

            {showSearch && (
              <section
                id="fy-search-results"
                className="fy-search-popup"
                aria-label="Book search results"
                aria-busy={searching}
              >
                {searching ? (
                  <p className="fy-search-message" role="status">
                    Searching…
                  </p>
                ) : search.error ? (
                  <p className="fy-search-message fy-error" role="alert">
                    {search.error}
                  </p>
                ) : search.results.length ? (
                  <>
                    <p className="fy-search-count" role="status">
                      {search.results.length}{" "}
                      {search.results.length === 1 ? "book" : "books"} found
                    </p>

                    {search.results.map((book) => (
                      <Link
                        key={book.id}
                        className="fy-search-result"
                        to={`/book/${book.id}`}
                        onClick={() => setSearchOpen(false)}
                      >
                        <img
                          src={book.imageLink}
                          alt=""
                          loading="lazy"
                        />

                        <div className="fy-search-result-info">
                          <h3>{book.title}</h3>
                          <p>{book.author}</p>

                          {book.subscriptionRequired && (
                            <span className="fy-search-result-premium">
                              Premium
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </>
                ) : (
                  <p className="fy-search-message" role="status">
                    No books found. Try another title or author.
                  </p>
                )}
              </section>
            )}
          </div>
        </header>

        <main className="fy-content">
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
                        <span className="fy-selected-premium">
                          Premium
                        </span>
                      )}
                    </div>

                    <img
                      src={book.imageLink}
                      alt={`${book.title} cover`}
                    />
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

                <p className="fy-section-subtitle">
                  Browse those books
                </p>

                <div className="fy-books">
                  {books.suggested.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}