"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const webhook_1 = require("@slack/webhook");
const puppeteer = require("puppeteer");
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
    const webhook = new webhook_1.IncomingWebhook(webhookUrl);

    // 启动 Puppeteer
    const browser = await puppeteer.launch({
        headless: true, // 生产环境设为 true
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // 设置浏览器环境和headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'X-Requested-With': 'XMLHttpRequest'
    });

    try {
        // 拦截API请求
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('seatStateInfo.json')) {
                const postData = {
                    prodId: productId,
                    scheduleNo: scheduleId,
                    seatId,
                    volume: 1,
                    selectedGradeVolume: 1
                };
                request.continue({
                    method: 'POST',
                    postData: qs.stringify(postData),
                    headers: {
                        ...request.headers(),
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Referer': `https://ticket.melon.com/performance/index.htm?prodId=${productId}`
                    }
                });
            } else {
                request.continue();
            }
        });

        // 监听API响应
        const responsePromise = page.waitForResponse(response => 
            response.url().includes('seatStateInfo.json') && 
            response.request().method() === 'POST'
        );

        // 导航到页面触发API请求
        await page.goto(`https://ticket.melon.com/performance/index.htm?prodId=${productId}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // 获取API响应
        const response = await responsePromise;
        const data = await response.json();

        console.log("Got response: ", data);
        if (data.chkResult) {
            const link = `http://ticket.melon.com/performance/index.htm?${qs.stringify({
                prodId: productId,
            })}`;
            await webhook.send(`${message} ${link}`);
        }
    } finally {
        await browser.close();
    }
})().catch((e) => {
    console.error(e.stack); // tslint:disable-line
    core.setFailed(e.message);
});
