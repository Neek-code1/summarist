const path = require("node:path");
const fs = require("node:fs");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

for (const name of [
  "CLIENT_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_YEARLY_PRICE_ID",
]) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  throw new Error("Use a Stripe test key starting with sk_test_.");
}

const credentialsPath = [
  "/etc/secrets/serviceAccountKey.json",
  path.join(__dirname, "serviceAccountKey.json"),
].find((filePath) => fs.existsSync(filePath));

if (!credentialsPath) {
  throw new Error("Add serviceAccountKey.json as a Render secret file.");
}

const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

if (serviceAccount.project_id !== "summarist-a46d4") {
  throw new Error("Use Firebase credentials for summarist-a46d4.");
}

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

const firebaseAuth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const frontend = new URL(process.env.CLIENT_URL);
const clientOrigin = frontend.origin;
const port = Number(process.env.PORT || 4242);

function pageUrl(route) {
  if (frontend.hostname.endsWith(".github.io")) {
    const basePath = frontend.pathname.replace(/\/?$/, "/");
    return `${clientOrigin}${basePath}#${route}`;
  }

  return `${clientOrigin}${route}`;
}

const app = express();

app.use(
  cors({
    origin: clientOrigin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10kb" }));

function logError(stage, error) {
  const message = String(error.message || "").replace(
    /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+/g,
    "[REDACTED]",
  );

  console.error("Request failed:", {
    stage,
    type: error.type || "unknown",
    code: error.code || "none",
    message,
    param: error.param || "none",
  });
}

async function requireUser(req, res, next) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Please log in with your email account.",
    });
  }

  try {
    req.user = await firebaseAuth.verifyIdToken(authorization.slice(7), true);
  } catch {
    return res.status(401).json({
      error: "Your session expired. Please log in again.",
    });
  }

  if (req.user.firebase?.sign_in_provider === "anonymous" || !req.user.email) {
    return res.status(403).json({
      error: "Please use an email account to subscribe.",
    });
  }

  next();
}

function subscriptionDetails(subscription) {
  const priceId = subscription.items.data[0]?.price?.id;

  const recognizedPlan =
    priceId === process.env.STRIPE_YEARLY_PRICE_ID
      ? "premium-plus"
      : priceId === process.env.STRIPE_MONTHLY_PRICE_ID
        ? "premium"
        : null;

  const hasPremium =
    !subscription.livemode &&
    Boolean(recognizedPlan) &&
    ["active", "trialing"].includes(subscription.status);

  return {
    plan: hasPremium ? recognizedPlan : "basic",
    hasPremium,
    status: subscription.status,
    trialEnd: subscription.trial_end || null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

async function loadSubscription(uid) {
  const record = await db.collection("billing").doc(uid).get();
  const subscriptionId = record.data()?.subscriptionId;

  if (!subscriptionId) return null;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.livemode || subscription.metadata.firebaseUID !== uid) {
    throw new Error("Subscription account mismatch.");
  }

  return subscription;
}

async function getUserSubscription(uid) {
  const subscription = await loadSubscription(uid);

  return subscription
    ? subscriptionDetails(subscription)
    : {
        plan: "basic",
        hasPremium: false,
        status: "none",
        trialEnd: null,
        cancelAtPeriodEnd: false,
      };
}

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Summarist checkout server" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: "Stripe test mode" });
});

app.get("/api/subscription", requireUser, async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    res.json(await getUserSubscription(req.user.uid));
  } catch (error) {
    logError("Checking subscription", error);

    res.status(500).json({
      error: "Unable to check your subscription. Please try again.",
    });
  }
});

app.post("/api/portal", requireUser, async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const subscription = await loadSubscription(req.user.uid);

    if (!subscription) {
      return res.status(404).json({
        error: "No verified subscription was found for this account.",
      });
    }

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (!customerId) {
      throw new Error("The subscription has no Stripe customer.");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: pageUrl("/settings"),
    });

    res.json({ url: session.url });
  } catch (error) {
    logError("Opening customer portal", error);

    res.status(500).json({
      error: "Unable to open subscription management.",
    });
  }
});

app.post("/api/verify-checkout", requireUser, async (req, res) => {
  res.set("Cache-Control", "no-store");

  const sessionId = req.body?.sessionId;

  if (
    typeof sessionId !== "string" ||
    !sessionId.startsWith("cs_test_") ||
    sessionId.length > 300
  ) {
    return res.status(400).json({
      error: "A valid test checkout session is required.",
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      session.livemode ||
      session.mode !== "subscription" ||
      session.client_reference_id !== req.user.uid ||
      session.metadata?.firebaseUID !== req.user.uid
    ) {
      return res.status(403).json({
        error: "This checkout does not belong to your account.",
      });
    }

    if (session.status !== "complete" || !session.subscription) {
      return res.status(409).json({
        error: "Checkout has not completed yet.",
      });
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.metadata.firebaseUID !== req.user.uid) {
      return res.status(403).json({
        error: "This subscription does not belong to your account.",
      });
    }

    const priceId = subscription.items.data[0]?.price?.id;

    if (
      subscription.livemode ||
      ![
        process.env.STRIPE_MONTHLY_PRICE_ID,
        process.env.STRIPE_YEARLY_PRICE_ID,
      ].includes(priceId)
    ) {
      return res.status(400).json({
        error: "This subscription is not a recognized test plan.",
      });
    }

    await db
      .collection("billing")
      .doc(req.user.uid)
      .set(
        {
          subscriptionId,
          customerId:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id || null,
        },
        { merge: true },
      );

    res.json(subscriptionDetails(subscription));
  } catch (error) {
    logError("Verifying checkout", error);

    res.status(500).json({
      error: "Unable to verify checkout. Please try again.",
    });
  }
});

app.post("/api/checkout", requireUser, async (req, res) => {
  const selectedPlan = req.body?.plan;

  if (!["monthly", "yearly"].includes(selectedPlan)) {
    return res.status(400).json({
      error: "Please select a valid plan.",
    });
  }

  let stage = "Checking existing subscription";

  try {
    const existing = await getUserSubscription(req.user.uid);

    if (existing.hasPremium) {
      return res.status(409).json({
        error: "Your account already has an active subscription.",
      });
    }

    const priceId =
      selectedPlan === "yearly"
        ? process.env.STRIPE_YEARLY_PRICE_ID
        : process.env.STRIPE_MONTHLY_PRICE_ID;

    stage = "Retrieving Stripe price";
    const price = await stripe.prices.retrieve(priceId);

    if (
      !price.active ||
      price.livemode ||
      price.currency !== "usd" ||
      price.unit_amount !== (selectedPlan === "yearly" ? 9999 : 999) ||
      price.recurring?.interval !==
        (selectedPlan === "yearly" ? "year" : "month") ||
      price.recurring?.interval_count !== 1
    ) {
      return res.status(400).json({
        error: "The Stripe test price does not match this plan.",
      });
    }

    const metadata = {
      firebaseUID: req.user.uid,
      plan: selectedPlan,
    };

    const subscriptionData = { metadata };

    if (selectedPlan === "yearly") {
      subscriptionData.trial_period_days = 7;
    }

    stage = "Creating Stripe checkout session";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      customer_email: req.user.email,
      client_reference_id: req.user.uid,
      metadata,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      success_url:
        pageUrl("/choose-plan") +
        "?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: pageUrl("/choose-plan") + "?checkout=cancelled",
    });

    res.json({ url: session.url });
  } catch (error) {
    logError(stage, error);

    res.status(500).json({
      error: "Checkout could not start. Please try again.",
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Summarist server listening on port ${port}`);
  console.log(`Frontend allowed: ${clientOrigin}`);
  console.log("Stripe test mode enabled.");
});
