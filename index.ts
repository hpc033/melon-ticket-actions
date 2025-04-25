import * as core from "@actions/core";
import { IncomingWebhook } from "@slack/webhook";
import axios from "axios";
import * as qs from "querystring";

(async () => {
  // Validate parameters
  const [ productId, scheduleId, seatId, webhookUrl ] = [
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

  const message = core.getInput("message") ?? "티켓사세요";

  const webhook = new IncomingWebhook(webhookUrl);

  const res = await axios({
    method: "POST",
    url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
    params: {
      v: "1",
    },
    headers: {  // 新增 headers 配置
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": "https://ticket.melon.com",
            "Referer": `https://ticket.melon.com/performance/index.htm?prodId=${productId}`,
            "X-Requested-With": "XMLHttpRequest"
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
    const link = `http://ticket.melon.com/performance/index.htm?${qs.stringify({
      prodId: productId,
    })}`;

    await webhook.send(`${message} ${link}`);
  }
})().catch((e) => {
  console.error(e.stack); // tslint:disable-line
  core.setFailed(e.message);
});
