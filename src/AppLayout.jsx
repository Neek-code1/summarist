import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  FiBook,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiSettings,
  FiStar,
  FiX,
} from "react-icons/fi";
import { auth } from "./firebase";
import "./ForYou.css";
import "./AppLayout.css";

export default function AppLayout() {
  const navigate = useNavigate();
  const closeRef = useRef(null);
  const openRef = useRef(null);
  const busyRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!menuOpen) return;

    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        openRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function navClass({ isActive }) {
    return `fy-nav-item${isActive ? " active" : ""}`;
  }

  async function handleLogout() {
    if (busyRef.current) return;

    busyRef.current = true;
    setLoggingOut(true);
    setError("");

    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      busyRef.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          type="button"
          className="fy-backdrop"
          aria-label="Close navigation"
          onClick={closeMenu}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fy-sidebar ${menuOpen ? "open" : ""}`}
      >
        <div className="fy-sidebar-heading">
          <Link to="/" className="fy-logo">
            Summarist
          </Link>

          <button
            ref={closeRef}
            type="button"
            className="fy-mobile-button"
            aria-label="Close navigation"
            onClick={closeMenu}
          >
            <FiX />
          </button>
        </div>

        <nav aria-label="Main navigation">
          <NavLink
            className={navClass}
            to="/for-you"
            onClick={closeMenu}
          >
            <FiHome /> For you
          </NavLink>

          <NavLink
            className={navClass}
            to="/library"
            onClick={closeMenu}
          >
            <FiBook /> My Library
          </NavLink>

          <button
            type="button"
            className="fy-nav-item"
            disabled
          >
            <FiStar /> Highlights
          </button>

          <Link
            className="fy-nav-item"
            to="/for-you"
            onClick={closeMenu}
          >
            <FiSearch /> Search
          </Link>

          <NavLink
            className={navClass}
            to="/settings"
            onClick={closeMenu}
          >
            <FiSettings /> Settings
          </NavLink>

          <button
            type="button"
            className="fy-nav-item"
            disabled
          >
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

          {error && (
            <p
              className="fy-error"
              role="alert"
              style={{ padding: "12px 20px" }}
            >
              {error}
            </p>
          )}
        </nav>
      </aside>

      <div className="app-shell-main">
        <div className="app-mobile-toolbar">
          <button
            ref={openRef}
            type="button"
            className="fy-mobile-button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
            onClick={() => setMenuOpen(true)}
          >
            <FiMenu />
          </button>

          <span>Summarist</span>
        </div>

        <Outlet />
      </div>
    </div>
  );
}