"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const webhook_1 = require("@slack/webhook");
const axios_1 = require("axios");
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
    console.log('Request params:', {
  prodId: productId,
  scheduleNo: scheduleId,
  seatId,
  volume: 1,
  selectedGradeVolume: 1,
});
    const message = (_a = core.getInput("message")) !== null && _a !== void 0 ? _a : "买票";
    const webhook = new webhook_1.IncomingWebhook(webhookUrl);
    const res = await axios_1.default({
        method: "POST",
        url: "https://tkglobal.melon.com/tktapi/product/seatStateInfo.json",
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
        headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Origin': 'https://tkglobal.melon.com',
        'Referer': `https://tkglobal.melon.com/performance/index.htm?${qs.stringify({
            langCd: "EN",
            prodId: productId,
        })}`
    },
    });
    // tslint:disable-next-line
    console.log("Got response: ", res.data);
    if (res.data.chkResult) {
        const link = `https://tkglobal.melon.com/performance/index.htm?${qs.stringify({
            langCd: "EN",
            prodId: productId,
        })}`;
        await webhook.send(`${message} ${link}`);
    }
})().catch((e) => {
    console.error(e.stack); // tslint:disable-line
    core.setFailed(e.message);
});

