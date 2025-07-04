import express, { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

// Health check GET route
app.get("/", (_req: Request, res: Response) => {
  res.send("✅ ZiiOZ Stripe Server is running.");
});

// Simple POST test route
app.post("/test", (_req: Request, res: Response) => {
  res.json({ ok: true, message: "POST /test reached successfully" });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create a connected account
app.post("/create-account", async (_req: Request, res: Response) => {
  try {
    const account = await stripe.accounts.create({ type: "standard" });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "https://ziioz.com/reauth",
      return_url: "https://ziioz.com/complete",
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (err: any) {
    console.error("Error creating account:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create payment intent
app.post("/create-payment-intent", async (_req: Request, res: Response) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // in cents
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook endpoint
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req: Request, res: Response): void => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        webhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("PaymentIntent succeeded:", paymentIntent.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Stripe server running on port ${port}`));
