import * as core from "@actions/core";
import { IncomingWebhook } from "@slack/webhook";
import axios from "axios";
import * as qs from "querystring";

(async () => {
  try {
    // 从环境变量读取参数
    const productId = process.env.PRODUCT_ID;
    const scheduleId = process.env.SCHEDULE_ID;
    const seatId = process.env.SEAT_ID;
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    const message = process.env.MESSAGE || "有票了~";

    if (!productId || !scheduleId || !seatId || !webhookUrl) {
      throw new Error("请设置 PRODUCT_ID, SCHEDULE_ID, SEAT_ID, SLACK_WEBHOOK_URL 环境变量");
    }

    const webhook = new IncomingWebhook(webhookUrl);

    const res = await axios({
      method: "GET",
      url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
      params: {
        v: "1",
        prodId: productId,
        scheduleNo: scheduleId,
        seatId,
        volume: 1,
        selectedGradeVolume: 1,
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: `https://ticket.melon.com/performance/index.htm?prodId=${productId}`,
        "X-Requested-With": "XMLHttpRequest",
        Connection: "keep-alive",
      },
    });

    console.log("Got response: ", res.data);

    if (res.data.chkResult) {
      const link = `http://ticket.melon.com/performance/index.htm?${qs.stringify({
        langCd: "EN",
        prodId: productId,
      })}`;

      await webhook.send(`${message} ${link}`);
    } else {
      console.log("No tickets available.");
    }
  } catch (e) {
    console.error(e.stack);
    process.exit(1);
  }
})();
