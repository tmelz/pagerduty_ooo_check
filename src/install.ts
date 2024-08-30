import { Slack } from "./slack";
import { Config } from "./config";
import { Pagerduty } from "./pagerduty";
import { Orchestrator } from "./orchestrator";

export function setupTriggers() {
  // First, clear existing triggers of the same function to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "weeklyTask") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create the weekly trigger for Wednesday at 9 AM Pacific Time
  ScriptApp.newTrigger("runPagerdutyChecks")
    .timeBased()
    .everyWeeks(1) // Repeat every week
    .onWeekDay(ScriptApp.WeekDay.WEDNESDAY) // Set the day of the week
    .atHour(10) // Set the hour (9 AM)
    .nearMinute(0) // Set the minute (0)
    .inTimezone("America/Los_Angeles") // Set timezone to Pacific Time
    .create();
}

export function runPagerdutyChecks() {
  Orchestrator.runPagerdutyChecks();
}

export function setupBot() {
  // don't commit these values to source control, use the apps script UI
  // to fill them out and run the method; as a hacky secrets manager
  PropertiesService.getScriptProperties().setProperty(
    Pagerduty.TOKEN_KEY,
    "TODO"
  );
  PropertiesService.getScriptProperties().setProperty(Slack.BOT_ID_KEY, "TODO");
  PropertiesService.getScriptProperties().setProperty(Slack.TOKEN_KEY, "TODO");
  PropertiesService.getScriptProperties().setProperty(
    Config.CONFIG_SPREADSHEET_KEY,
    "TODO"
  );
}

export function getAnalytics(): { [key: string]: string } {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();

  Logger.log(allProperties); // View in Apps Script Logs
  return allProperties; // Or return as JSON for an API endpoint
}
