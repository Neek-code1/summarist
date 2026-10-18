import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FiArrowLeft, FiSettings } from "react-icons/fi";
import { auth } from "./firebase";
import "./Settings.css";

const API_URL = "http://localhost:4242";

export default function Settings() {
  const navigate = useNavigate();
  const portalBusyRef = useRef(false);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [planError, setPlanError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setSubscription(null);
      setCheckingPlan(true);
      setPlanError("");
      setPortalError("");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function refreshSubscription() {
      setRetry((value) => value + 1);
    }

    window.addEventListener("focus", refreshSubscription);

    return () => {
      window.removeEventListener("focus", refreshSubscription);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const controller = new AbortController();
    let active = true;

    setSubscription(null);
    setPlanError("");
    setCheckingPlan(true);

    async function loadSubscription() {
      if (!user || user.isAnonymous) {
        setCheckingPlan(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        if (!active) return;

        const response = await fetch(`${API_URL}/api/subscription`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to check your subscription.");
        }

        if (active) {
          setSubscription(data);
        }
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setPlanError(
            err instanceof TypeError
              ? "Cannot connect to the subscription server. Make sure node index.cjs is running."
              : err.message,
          );
        }
      } finally {
        if (active) {
          setCheckingPlan(false);
        }
      }
    }

    void loadSubscription();

    return () => {
      active = false;
      controller.abort();
    };
  }, [user, loading, retry]);

  async function handleManageSubscription() {
    if (portalBusyRef.current || !user || user.isAnonymous) {
      return;
    }

    portalBusyRef.current = true;
    setOpeningPortal(true);
    setPortalError("");

    try {
      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/api/portal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to open subscription management.",
        );
      }

      if (!data.url) {
        throw new Error("Stripe did not return a portal link.");
      }

      const portalUrl = new URL(data.url);

      if (
        portalUrl.protocol !== "https:" ||
        portalUrl.hostname !== "billing.stripe.com"
      ) {
        throw new Error("An invalid portal link was returned.");
      }

      if (auth.currentUser?.uid !== user.uid) {
        throw new Error("Your account changed. Please try again.");
      }

      window.location.assign(portalUrl.href);
    } catch (err) {
      setPortalError(
        err instanceof TypeError
          ? "Cannot connect to the server. Make sure node index.cjs is running."
          : err.message,
      );
    } finally {
      portalBusyRef.current = false;
      setOpeningPortal(false);
    }
  }

  async function handleLogout() {
    if (loggingOut || portalBusyRef.current) return;

    setLoggingOut(true);
    setError("");

    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch {
      setError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  const hasPremium = Boolean(subscription?.hasPremium);

  const planName = hasPremium
    ? subscription.plan === "premium-plus"
      ? "Premium Plus"
      : "Premium"
    : "Basic";

  const canManageSubscription =
    user && !user.isAnonymous && subscription && subscription.status !== "none";

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Link to="/" className="settings-logo">
          Summarist
        </Link>

        <Link to="/for-you" className="settings-back">
          <FiArrowLeft /> Back to books
        </Link>
      </header>

      <main className="settings-content">
        <h1>
          <FiSettings /> Settings
        </h1>

        {loading ? (
          <p role="status">Loading your account...</p>
        ) : (
          <>
            <section className="settings-section">
              <h2>Account</h2>

              <p>
                {user
                  ? user.isAnonymous
                    ? "You are signed in as a guest."
                    : "You are signed in."
                  : "You are not signed in."}
              </p>
            </section>

            <section className="settings-section">
              <h2>Email</h2>

              <p>
                {user
                  ? user.isAnonymous
                    ? "Guest account — no email address"
                    : user.email || "No email address"
                  : "Not signed in"}
              </p>
            </section>

            <section className="settings-section">
              <h2>Subscription</h2>

              {checkingPlan ? (
                <p role="status">Checking your subscription...</p>
              ) : planError ? (
                <div role="alert">
                  <p style={{ color: "#b42318" }}>{planError}</p>

                  <button
                    type="button"
                    className="settings-upgrade"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <p>
                    <strong>{planName}</strong>
                  </p>

                  {hasPremium ? (
                    <>
                      <p>
                        {subscription.status === "trialing"
                          ? "Your test trial is active."
                          : "Your test subscription is active."}
                      </p>

                      {subscription.trialEnd && (
                        <p>
                          Trial ends:{" "}
                          {new Date(
                            subscription.trialEnd * 1000,
                          ).toLocaleDateString()}
                        </p>
                      )}

                      {subscription.cancelAtPeriodEnd && (
                        <p>
                          Your subscription is scheduled to cancel at the end of
                          its current period. Premium access remains available
                          until the subscription ends.
                        </p>
                      )}
                    </>
                  ) : (
                    <p>You do not have an active Premium subscription.</p>
                  )}

                  {canManageSubscription && (
                    <button
                      type="button"
                      className="settings-upgrade"
                      onClick={handleManageSubscription}
                      disabled={openingPortal || loggingOut}
                      aria-busy={openingPortal}
                    >
                      {openingPortal
                        ? "Opening Stripe..."
                        : "Manage subscription"}
                    </button>
                  )}

                  {!hasPremium && (
                    <div>
                      <Link to="/choose-plan" className="settings-upgrade">
                        View plans
                      </Link>
                    </div>
                  )}
                </>
              )}

              {portalError && (
                <p role="alert" style={{ color: "#b42318", marginTop: 16 }}>
                  {portalError}
                </p>
              )}

              <p className="settings-note">
                Stripe test mode — no real charges.
              </p>
            </section>

            <section className="settings-section">
              <h2>Your library</h2>

              {user ? (
                user.isAnonymous ? (
                  <p>
                    Your saved and finished books are stored in Firebase for
                    this guest account. Logging out ends access to this guest
                    library.
                  </p>
                ) : (
                  <p>
                    Your saved and finished books are stored in Firebase. Sign
                    in with this same account on another device to access your
                    library.
                  </p>
                )
              ) : (
                <p>Sign in to access your library.</p>
              )}

              {user && <Link to="/library">Open my library</Link>}
            </section>

            {error && (
              <p role="alert" style={{ color: "#b42318" }}>
                {error}
              </p>
            )}

            {user ? (
              <button
                type="button"
                className="settings-upgrade"
                onClick={handleLogout}
                disabled={loggingOut || openingPortal}
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            ) : (
              <Link to="/">Go to homepage to log in</Link>
            )}
          </>
        )}
      </main>
    </div>
  );
}
