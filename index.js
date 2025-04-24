"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const webhook = require("@slack/webhook");
const axios = require("axios");
const qs = require("querystring");

(async () => {
    var _a;
    // Validate parameters
    const [productId, scheduleId, seatId, webhookUrl] = [
        "product-id",
        "schedule-id",
        "seat-id",
        "slack-incoming-webhook-url",
    ].map((name) => {
        const value = core.getInput(name);
        if (!value) {
            throw new Error(`melon-ticket-actions: Please set ${name} input parameter`);
        }
        return value;
    });
    const message = (_a = core.getInput("message")) !== null && _a !== void 0 ? _a : "티켓사세요";
    const webhook = new webhook.IncomingWebhook(webhookUrl);
    const res = await axios({
        method: "POST",
        url: "https://ticket.melon.com/tktapi/product/seatState.json",
        headers: {
            'Accept': 'application/json', // 设置 Accept 头
            'User-Agent': 'Mozilla/5.0 (compatible; Windows NT 10.0; Win64; x64)' // 设置 User-Agent 头
        },
        params: {
            v: "1",
        },
        data: qs.stringify({
            prodId: productId,
            scheduleNo: scheduleId,
            seatId,
            volume: 1,
            selectedGradeVolume: 1,
        }),
    });
    // tslint:disable-next-line
    console.log("Got response: ", res.data);
    if (res.data.chkResult) {
        const link = `https://ticket.melon.com/performance/index.htm?prodId=${productId}`;
        await webhook.send(`${message} ${link}`);
    }
})().catch((e) => {
    console.error(e.stack); // tslint:disable-line
    core.setFailed(e.message);
});
