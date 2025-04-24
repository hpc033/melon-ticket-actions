"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const webhook_1 = require("@slack/webhook");
const axios_1 = require("axios");
const qs = require("querystring");

(async () => {
    try {
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

        const message = core.getInput("message") || "티켓사세요";
        const webhook = new webhook_1.IncomingWebhook(webhookUrl);

        // 关键修改 1：添加完整的浏览器级请求头
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'https://ticket.melon.com',
            'Referer': `https://ticket.melon.com/performance/index.htm?prodId=${productId}`,
            'X-Requested-With': 'XMLHttpRequest'
        };

        // 关键修改 2：增加请求重试逻辑
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const res = await axios_1.default({
                    method: "POST",
                    url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
                    params: { v: "1" },
                    data: qs.stringify({
                        prodId: productId,
                        scheduleNo: scheduleId,
                        seatId,
                        volume: 1,
                        selectedGradeVolume: 1,
                    }),
                    headers: headers,  // 添加修改后的请求头
                    timeout: 10000  // 10秒超时
                });

                console.log(`Attempt ${attempt}:`, res.data);

                if (res.data?.chkResult) {
                    const link = `https://ticket.melon.com/performance/index.htm?${qs.stringify({
                        prodId: productId,
                        scheduleNo: scheduleId,  // 新增参数
                        seatId: seatId           // 新增参数
                    })}`;
                    
                    await webhook.send({
                        text: `${message} ${link}`,
                        unfurl_links: true  // 让Slack展示链接预览
                    });
                    return;  // 成功则退出
                }
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt} failed:`, error.message);
                
                // 关键修改 3：添加延迟避免频繁请求
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                }
            }
        }

        throw lastError || new Error("All retry attempts failed");

    } catch (error) {
        console.error('[FINAL ERROR]', error.stack);
        core.setFailed(`Action failed: ${error.message}`);
    }
})();
