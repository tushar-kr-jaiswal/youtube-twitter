import { Router } from "express";
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// ✅ Route to subscribe/unsubscribe to a channel (toggle subscription)
router.post("/c/:channelId", toggleSubscription);

// ✅ Route to get subscribers of a specific channel
router.get("/c/:channelId/subscribers", getUserChannelSubscribers);

// ✅ Route to get the list of channels a user has subscribed to
router.get("/u/:subscriberId/subscriptions", getSubscribedChannels);

export default router;
