// import { StandupBot } from "./standup-bot";
import { Log } from "./checks/log";
import { CheckOOO } from "./checks/ooo";
// import { Slack } from "./slack";
// import { Config } from "./config";

import { Pagerduty } from "./pagerduty";
import { Slack } from "./slack";
import { Config } from "./config";
import { EventUtil } from "./checks/event-util";
import { Analytics } from "./analytics";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Orchestrator {
  export function runPagerdutyChecks() {
    Config.loadConfigs().forEach((config) => {
      Log.log(`Loaded config: ${JSON.stringify(config, null, 2)}`);
    });

    // PagerDuty only lets you look +90d in future max
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 90);

    const oooOncalls: Pagerduty.OnCall[] = [];

    Config.loadConfigs().forEach((config) => {
      Log.logPhase(
        `👮 Inspecting schedule: "${config.scheduleName}", id=${config.scheduleId}`
      );

      Pagerduty.listOnCalls(start.toDateString(), end.toDateString(), [
        config.scheduleId,
      ])
        ?.filter((oncall) => Orchestrator.checkIsOOODuringOncall(oncall))
        .forEach((oncall) => {
          oooOncalls.push(oncall);
          Analytics.recordOOODetection();
        });
    });

    Log.logPhase("Sending DMs about OOO oncalls");
    oooOncalls.forEach((oncall) => {
      Orchestrator.sendDMAboutOOODuringOncall(oncall);
    });
  }

  export function checkIsOOODuringOncall(oncall: Pagerduty.OnCall): boolean {
    const startDate = new Date(oncall.start);
    const endDate = new Date(oncall.end);
    const email = oncall.user.email;

    Log.log(`🔎 Inspecting oncall: ${email} from ${startDate} to ${endDate}`);

    const fakeEvent = {
      summary: "Fake event to represent oncall shift",
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
    } as GoogleAppsScript.Calendar.Schema.Event;

    const hasOutOfOffice = CheckOOO.checkIsOOODuringEvent(fakeEvent, email);
    Log.log(`\thasOutOfOffice: ${hasOutOfOffice}`);
    return hasOutOfOffice === true;
  }

  export function sendDMAboutOOODuringOncall(oncall: Pagerduty.OnCall): void {
    const startDate = new Date(oncall.start);
    const endDate = new Date(oncall.end);

    Log.log(
      `🚨 Schedule "${oncall.schedule.summary}" oncall ${oncall.user.email} has out of office during their oncall shift "${startDate}" to "${endDate}"`
    );

    // too lazy to learn the rich text API, • is good-nuf
    const message =
      `Hello! It appears that you have an out of office event during a future oncall shift. Please take a look and work with your team to correct this.` +
      `\n\n• Schedule: <${oncall.schedule.html_url}|${oncall.schedule.summary}>` +
      `\n• Oncall start: ${startDate.toDateString()}` +
      `\n• Oncall end: ${endDate.toDateString()}` +
      `\n\nFeel free to reach out to <#C07K3U33NDT> with any questions or feedback.`;

    let transformedEmail = oncall.user.email;
    EventUtil.BLOCK_EMAIL_DOMAINS.forEach((domain) => {
      transformedEmail = transformedEmail.replace("@" + domain, "@block.xyz");
    });
    const slackUserId = Slack.getUserByEmail(transformedEmail)?.id;
    if (slackUserId === undefined) {
      Log.log(`❌ Could not find Slack user for email: ${oncall.user.email}`);
    } else {
      if (Orchestrator.checkIfUserIsOOONow(oncall.user.email)) {
        Log.log(
          `🚨 User is OOO right now, not sending DM (${oncall.user.email})`
        );
      } else {
        Log.log(
          `✉️ User doesn't seem to be OOO, sending DM (${oncall.user.email})`
        );
        // send directly to me for now for safety
        // Slack.sendDirectMessage("U044HT4GLVD", message);
        Slack.sendDirectMessage(slackUserId, message);
        Analytics.recordSentDM();
      }
    }
  }

  export function checkIfUserIsOOONow(email: string): boolean {
    const now = new Date();
    const oneHourInFuture = new Date();
    oneHourInFuture.setHours(now.getHours() + 1);

    const fakeEvent = {
      summary: "Fake event to check if OOO before sending DM",
      start: { dateTime: now.toISOString() },
      end: { dateTime: oneHourInFuture.toISOString() },
    } as GoogleAppsScript.Calendar.Schema.Event;

    const hasOutOfOffice = CheckOOO.checkIsOOODuringEvent(fakeEvent, email);
    return hasOutOfOffice === true;
  }
}
