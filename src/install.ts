import { Slack } from "./slack";
import { Config } from "./config";
import { Orchestrator } from "./orchestrator";

export function setupTriggers() {
  // Delete existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Create a new time-based trigger
  ScriptApp.newTrigger("runStandups").timeBased().everyMinutes(5).create();
}

export function runStandups() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Check if the current day is Monday (1) through Friday (5) and time is between 9 AM and 5 PM
  if (day >= 1 && day <= 5 && hour >= 9 && hour <= 17) {
    // Code to execute every 5 minutes during the specified time and days
    console.log("Running standup checks...");
    Orchestrator.runStandups();
  } else {
    console.log("Not running standup checks, outside desired window");
  }
}

export function setupBot() {
  // don't commit these values to source control, use the apps script UI
  // to fill them out and run the method; as a hacky secrets manager
  PropertiesService.getScriptProperties().setProperty(Slack.BOT_ID_KEY, "TODO");
  PropertiesService.getScriptProperties().setProperty(Slack.TOKEN_KEY, "TODO");
  PropertiesService.getScriptProperties().setProperty(
    Config.CONFIG_SPREADSHEET_KEY,
    "TODO"
  );
}
