import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";
import "./AuthModal.css";

function getErrorMessage(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account already uses this email. Try logging in.";
    case "auth/weak-password":
      return "Please choose a stronger password with at least 6 characters.";
    case "auth/password-does-not-meet-requirements":
      return "Your password does not meet the account requirements. Try a longer password with uppercase and lowercase letters, numbers, and symbols.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a little and try again.";
    case "auth/network-request-failed":
      return "Unable to connect. Check your internet connection.";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "This login method is not enabled in Firebase.";
    case "auth/unauthorized-domain":
      return "This website address needs to be authorized in Firebase.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function AuthModal({ onClose }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const emailRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);

  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    emailRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && !busyRef.current) {
        onClose();
      }

      if (event.key !== "Tab") return;

      const elements = panelRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), [tabindex="0"]',
      );

      if (!elements?.length) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const focusInside = panelRef.current?.contains(document.activeElement);

      if (
        event.shiftKey &&
        (document.activeElement === first || !focusInside)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !focusInside)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      mountedRef.current = false;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  function changeMode(nextMode) {
    if (busyRef.current) return;
    setMode(nextMode);
    setMessage("");
  }

  function closeModal() {
    if (!busyRef.current) onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busyRef.current) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    busyRef.current = true;
    setBusy(true);
    setMessage("");

    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);

        if (mountedRef.current) {
          setMessage(
            "If an account exists for this email, you’ll receive a password reset link. Check your spam folder too.",
          );
        }

        return;
      }

      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      if (mountedRef.current) {
        onClose();
        navigate("/for-you");
      }
    } catch (error) {
      if (mountedRef.current) {
        setMessage(getErrorMessage(error));
      }
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  async function handleGuestLogin() {
    if (busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setMessage("");

    try {
      await signInAnonymously(auth);

      if (mountedRef.current) {
        onClose();
        navigate("/for-you");
      }
    } catch (error) {
      if (mountedRef.current) {
        setMessage(getErrorMessage(error));
      }
    } finally {
      busyRef.current = false;

      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }

  const heading =
    mode === "signup"
      ? "Sign up to Summarist"
      : mode === "reset"
        ? "Reset your password"
        : "Log in to Summarist";

  return (
    <div
      className="auth-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        className="auth-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        aria-busy={busy}
        tabIndex={-1}
      >
        <button
          type="button"
          className="auth-close"
          onClick={closeModal}
          disabled={busy}
          aria-label="Close login"
        >
          ×
        </button>

        <h2 id="auth-title">{heading}</h2>

        {mode !== "reset" && (
          <>
            <button
              type="button"
              className="auth-button auth-guest"
              onClick={handleGuestLogin}
              disabled={busy}
            >
              Continue as a guest
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        <form key={mode} onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="auth-email">
            Email
          </label>

          <input
            ref={emailRef}
            id="auth-email"
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            disabled={busy}
          />

          {mode !== "reset" && (
            <>
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>

              <input
                id="auth-password"
                name="password"
                type="password"
                placeholder="Password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={mode === "signup" ? 6 : undefined}
                required
                disabled={busy}
              />
            </>
          )}

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <button type="submit" className="auth-button" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "signup"
                ? "Sign up"
                : mode === "reset"
                  ? "Send reset email"
                  : "Login"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            className="auth-link"
            onClick={() => changeMode("reset")}
            disabled={busy}
          >
            Forgot your password?
          </button>
        )}

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => changeMode("signup")}
                disabled={busy}
              >
                Sign up
              </button>
            </>
          ) : (
            <button
              type="button"
              className="auth-link"
              onClick={() => changeMode("login")}
              disabled={busy}
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
