// import { StandupBot } from "./standup-bot";
// import { Log } from "./checks/log";
// import { Slack } from "./slack";
// import { Config } from "./config";
import { Orchestrator } from "./orchestrator";

export function debug() {
  const date = new Date("2024-08-27T21:00:25.291Z");
  Orchestrator.runStandups(date);
}
