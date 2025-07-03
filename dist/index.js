"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
});
// Health check GET
app.get("/", (req, res) => {
    res.send("✅ ZiiOZ Stripe Server is running.");
});
// Always mount middleware *before* routes
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Simple test POST
app.post("/test", (req, res) => {
    res.json({ ok: true, message: "POST /test reached successfully" });
});
// Create a connected account
app.post("/create-account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const account = yield stripe.accounts.create({
            type: "standard",
        });
        const accountLink = yield stripe.accountLinks.create({
            account: account.id,
            refresh_url: "https://ziioz.com/reauth",
            return_url: "https://ziioz.com/complete",
            type: "account_onboarding",
        });
        res.json({ url: accountLink.url });
    }
    catch (err) {
        console.error("Error creating account:", err);
        res.status(500).json({ error: err.message });
    }
}));
// Create payment intent
app.post("/create-payment-intent", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentIntent = yield stripe.paymentIntents.create({
            amount: 1000,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
        });
        res.json({ clientSecret: paymentIntent.client_secret });
    }
    catch (err) {
        console.error("Error creating payment intent:", err);
        res.status(500).json({ error: err.message });
    }
}));
// Webhook endpoint
app.post("/webhook", express_1.default.raw({ type: "application/json" }), (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    switch (event.type) {
        case "payment_intent.succeeded":
            const paymentIntent = event.data.object;
            console.log("PaymentIntent succeeded:", paymentIntent.id);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
});
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Stripe server running on port ${port}`));
