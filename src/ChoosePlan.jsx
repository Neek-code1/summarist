import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCheck,
  FiHeadphones,
  FiShield,
} from "react-icons/fi";
import { auth } from "./firebase";
import "./ChoosePlan.css";

const API_URL = "http://localhost:4242";

const plans = {
  yearly: {
    name: "Premium Plus",
    price: "$99.99",
    billing: "per year",
    detail: "7-day free trial, then $99.99 per year",
  },
  monthly: {
    name: "Premium",
    price: "$9.99",
    billing: "per month",
    detail: "$9.99 billed monthly",
  },
};

const faqs = [
  {
    question: "How does the free trial work?",
    answer:
      "The yearly plan includes a seven-day trial in Stripe test mode, followed by a simulated yearly payment.",
  },
  {
    question: "Will I be charged real money?",
    answer:
      "No. This project uses Stripe test mode. Use Stripe test card details.",
  },
  {
    question: "Can I manage my subscription here?",
    answer:
      "This page checks your subscription and starts checkout. Subscription management will be connected separately.",
  },
];

async function apiRequest(path, user, options = {}) {
  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "The request failed.");
  }

  return data;
}

export default function ChoosePlan() {
  const [searchParams] = useSearchParams();

  const checkoutStatus = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");

  const [selected, setSelected] = useState("yearly");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  const busyRef = useRef(false);
  const plan = plans[selected];

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setSubscription(null);
      setCheckError("");
      setChecking(true);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const controller = new AbortController();
    let active = true;

    setSubscription(null);
    setCheckError("");
    setChecking(true);

    async function checkSubscription() {
      if (!user || user.isAnonymous) {
        setChecking(false);
        return;
      }

      try {
        let data;

        if (checkoutStatus === "success") {
          if (!sessionId) {
            throw new Error(
              "The checkout session ID is missing. Return to the original checkout success URL."
            );
          }

          data = await apiRequest(
            "/api/verify-checkout",
            user,
            {
              method: "POST",
              body: JSON.stringify({ sessionId }),
              signal: controller.signal,
            }
          );
        } else {
          data = await apiRequest("/api/subscription", user, {
            signal: controller.signal,
          });
        }

        if (active) {
          setSubscription(data);
        }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          setCheckError(
            error instanceof TypeError
              ? "Cannot connect to the server. Make sure node index.cjs is running."
              : error.message
          );
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void checkSubscription();

    return () => {
      active = false;
      controller.abort();
    };
  }, [user, authLoading, checkoutStatus, sessionId, retry]);

  function selectPlan(value) {
    if (busyRef.current) return;

    setSelected(value);
    setNotice("");
  }

  async function handleContinue() {
    if (
      busyRef.current ||
      checking ||
      checkError ||
      subscription?.hasPremium ||
      checkoutStatus === "success"
    ) {
      return;
    }

    if (!user || user.isAnonymous) {
      setNotice(
        "Please sign in with an email account. Guests can log out through Settings, then log in or sign up on the homepage."
      );
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setNotice("");

    try {
      const data = await apiRequest("/api/checkout", user, {
        method: "POST",
        body: JSON.stringify({ plan: selected }),
      });

      if (!data.url) {
        throw new Error("Stripe did not return a checkout link.");
      }

      const checkoutUrl = new URL(data.url);

      if (
        checkoutUrl.protocol !== "https:" ||
        checkoutUrl.hostname !== "checkout.stripe.com"
      ) {
        throw new Error("An invalid checkout link was returned.");
      }

      window.location.assign(checkoutUrl.href);
    } catch (error) {
      setNotice(
        error instanceof TypeError
          ? "Cannot connect to the checkout server. Make sure node index.cjs is running."
          : error.message
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const hasPremium = Boolean(subscription?.hasPremium);

  const subscriptionName =
    subscription?.plan === "premium-plus"
      ? "Premium Plus"
      : "Premium";

  const checkoutDisabled =
    authLoading ||
    checking ||
    busy ||
    Boolean(checkError) ||
    hasPremium ||
    checkoutStatus === "success";

  return (
    <div className="plan-page">
      <header className="plan-header">
        <Link className="plan-logo" to="/">
          Summarist
        </Link>

        <Link className="plan-back" to="/settings">
          <FiArrowLeft /> Back to settings
        </Link>
      </header>

      <section className="plan-hero">
        <div className="plan-hero-content">
          <h1>Get unlimited access to knowledge</h1>

          <p>
            Read, listen, and discover ideas that help you grow.
          </p>

          <span className="plan-preview-badge">
            Stripe test mode — no real charges
          </span>
        </div>
      </section>

      <main className="plan-content">
        <section
          className="plan-benefits"
          aria-label="Subscription features"
        >
          <div>
            <FiBookOpen />
            <h2>Read summaries</h2>
            <p>Explore the key ideas from great books.</p>
          </div>

          <div>
            <FiHeadphones />
            <h2>Listen anywhere</h2>
            <p>Enjoy audio summaries on your schedule.</p>
          </div>

          <div>
            <FiShield />
            <h2>Keep learning</h2>
            <p>Build a reading and listening habit.</p>
          </div>
        </section>

        <section className="plan-selection">
          <h2>
            {hasPremium ? "Your subscription" : "Choose your plan"}
          </h2>

          <p className="plan-selection-intro">
            Test subscriptions for your Summarist project.
          </p>

          {(authLoading || checking) && (
            <p className="plan-notice" role="status">
              Checking your subscription...
            </p>
          )}

          {checkError && (
            <div className="plan-notice" role="alert">
              <p>{checkError}</p>

              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                style={{
                  marginTop: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Retry verification
              </button>
            </div>
          )}

          {!authLoading &&
            !checking &&
            (!user || user.isAnonymous) && (
              <p className="plan-notice" role="status">
                An email account is required to subscribe.{" "}
                <Link
                  to={user ? "/settings" : "/"}
                  style={{ textDecoration: "underline" }}
                >
                  {user ? "Open Settings" : "Go to login"}
                </Link>
              </p>
            )}

          {hasPremium && (
            <div className="plan-notice" role="status">
              <p>
                <strong>{subscriptionName} verified!</strong>
              </p>

              <p>
                {subscription.status === "trialing"
                  ? "Your test trial is active."
                  : "Your test subscription is active."}
              </p>

              {subscription.trialEnd && (
                <p>
                  Trial ends:{" "}
                  {new Date(
                    subscription.trialEnd * 1000
                  ).toLocaleDateString()}
                </p>
              )}

              <Link
                to="/for-you"
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  textDecoration: "underline",
                }}
              >
                Return to books
              </Link>
            </div>
          )}

          {!checking &&
            !checkError &&
            subscription &&
            !hasPremium &&
            checkoutStatus === "success" && (
              <p className="plan-notice" role="status">
                Checkout was verified, but the subscription is
                not currently active. Status: {subscription.status}.
              </p>
            )}

          {checkoutStatus === "cancelled" && !hasPremium && (
            <p className="plan-notice" role="status">
              You returned without completing this checkout.
            </p>
          )}

          {!hasPremium && (
            <>
              <fieldset
                className="plan-options"
                disabled={busy || checking || authLoading}
              >
                <legend className="plan-sr-only">
                  Subscription billing period
                </legend>

                {Object.entries(plans).map(([value, option]) => (
                  <label
                    key={value}
                    className={`plan-option ${
                      selected === value ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="subscription-plan"
                      value={value}
                      checked={selected === value}
                      onChange={() => selectPlan(value)}
                    />

                    <div className="plan-option-content">
                      <div className="plan-option-heading">
                        <strong>{option.name}</strong>

                        {value === "yearly" && (
                          <span className="plan-trial">
                            7-day free trial
                          </span>
                        )}
                      </div>

                      <p className="plan-price">
                        {option.price}{" "}
                        <span>{option.billing}</span>
                      </p>

                      <p className="plan-billing">
                        {value === "yearly"
                          ? "Billed annually after the trial"
                          : "Billed monthly"}
                      </p>
                    </div>

                    {selected === value && (
                      <FiCheck
                        className="plan-selected-icon"
                        aria-hidden="true"
                      />
                    )}
                  </label>
                ))}
              </fieldset>

              <p className="plan-summary">{plan.detail}</p>

              <button
                type="button"
                className="plan-continue"
                onClick={handleContinue}
                disabled={checkoutDisabled}
                aria-busy={busy}
              >
                {busy
                  ? "Opening checkout..."
                  : `Continue with ${plan.name}`}
              </button>
            </>
          )}

          <p className="plan-disclaimer">
            Test mode only. No real payment will be taken.
          </p>

          {notice && (
            <p className="plan-notice" role="alert">
              {notice}
            </p>
          )}
        </section>

        <section className="plan-faq">
          <h2>Frequently asked questions</h2>

          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>

        <Link className="plan-return" to="/for-you">
          Continue browsing books
        </Link>
      </main>
    </div>
  );
}