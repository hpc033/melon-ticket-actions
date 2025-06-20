import * as core from "@actions/core";
import { IncomingWebhook } from "@slack/webhook";
import axios from "axios";
import * as qs from "querystring";

(async () => {
  try {
    // 读取并校验输入参数
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

    const message = core.getInput("message") || "买票";

    // 初始化 Slack webhook
    const webhook = new IncomingWebhook(webhookUrl);

    // 请求接口，注意添加请求头，防止 406
    const res = await axios({
      method: "POST",
      url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
      params: {
        v: "1",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      },
      data: qs.stringify({
        prodId: productId,
        scheduleNo: scheduleId,
        seatId,
        volume: 1,
        selectedGradeVolume: 1,
      }),
    });

    console.log("Got response: ", res.data);

    if (res.data.chkResult) {
      // 生成带 langCd=EN 参数的链接
      const link = `https://tkglobal.melon.com/performance/index.htm?${qs.stringify({
        langCd: "EN",
        prodId: productId,
      })}`;
      await webhook.send(`${message} ${link}`);
      console.log("Slack message sent.");
    } else {
      console.log("Tickets not available.");
    }
  } catch (e: any) {
    console.error(e.stack);
    core.setFailed(e.message);
  }
})();
