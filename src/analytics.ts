import { Log } from "./checks/log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Analytics {
  export let enabled: boolean = true;

  export function disable(): void {
    Analytics.enabled = false;
  }

  export function recordOOODetection(): void {
    if (!Analytics.enabled) {
      Log.log(`📊 Analytics: disabled`);
      return;
    }
    Log.log(`📊 Analytics: bumping counter for "ooo detections" by +1`);
    const key = `outofofficeDetections__${getFormattedDate()}`;
    Analytics.incrementCounter(key);
  }

  export function recordSentDM(): void {
    if (!Analytics.enabled) {
      Log.log(`📊 Analytics: disabled`);
      return;
    }
    Log.log(`📊 Analytics: bumping counter for "sent DMs" by +1`);
    const key = `sentDMs__${getFormattedDate()}`;
    Analytics.incrementCounter(key);
  }

  export function incrementCounter(key: string, increment: number = 1): void {
    PropertiesService.getScriptProperties().setProperty(
      key,
      String(
        parseInt(
          PropertiesService.getScriptProperties().getProperty(key) ?? "0"
        ) + increment
      )
    );
  }

  export function getFormattedDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  }
}
