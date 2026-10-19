import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { auth } from "./firebase";
import Player from "./Player.jsx";

const BOOK_API =
  "https://us-central1-summaristt.cloudfunctions.net";

const SERVER_API = "https://summarist.onrender.com";

export default function PremiumPlayer() {
  const { id } = useParams();

  const [access, setAccess] = useState("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setAccess("loading");
    setError("");

    async function checkAccess() {
      try {
        const bookResponse = await fetch(
          `${BOOK_API}/getBook?id=${encodeURIComponent(id)}`,
          { signal: controller.signal }
        );

        if (!bookResponse.ok) {
          throw new Error("Unable to load this book.");
        }

        const data = await bookResponse.json();
        const book = Array.isArray(data) ? data[0] : data;

        if (!book?.id) {
          throw new Error("This book could not be found.");
        }

        if (!book.subscriptionRequired) {
          if (active) setAccess("allowed");
          return;
        }

        await auth.authStateReady();

        if (!active) return;

        const user = auth.currentUser;

        if (!user || user.isAnonymous) {
          setAccess("upgrade");
          return;
        }

        const token = await user.getIdToken();

        if (!active) return;

        const response = await fetch(
          `${SERVER_API}/api/subscription`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const subscription = await response.json();

        if (!response.ok) {
          throw new Error(
            subscription.error ||
              "Unable to verify your subscription."
          );
        }

        if (active) {
          setAccess(
            subscription.hasPremium ? "allowed" : "upgrade"
          );
        }
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setError(
            err instanceof TypeError
              ? "Unable to connect. Check your internet connection and make sure the checkout server is running."
              : err.message
          );
          setAccess("error");
        }
      }
    }

    void checkAccess();

    return () => {
      active = false;
      controller.abort();
    };
  }, [id, retry]);

  if (access === "allowed") {
    return <Player key={id} />;
  }

  return (
    <main
      className="bd-content"
      style={{ paddingTop: 64 }}
    >
      {access === "loading" ? (
        <p role="status">Checking book access...</p>
      ) : access === "error" ? (
        <>
          <p className="bd-error" role="alert">
            {error}
          </p>

          <button
            type="button"
            className="bd-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <h1>Unlock this Premium book</h1>

          <p style={{ margin: "20px 0", lineHeight: 1.7 }}>
            This book requires an active Premium or Premium
            Plus subscription. Sign in with your subscribed
            email account or choose a plan.
          </p>

          <Link className="bd-button" to="/choose-plan">
            View plans
          </Link>
        </>
      )}

      <p style={{ marginTop: 24 }}>
        <Link
          to={`/book/${id}`}
          style={{ color: "#0365f2" }}
        >
          Back to book
        </Link>
      </p>
    </main>
  );
}