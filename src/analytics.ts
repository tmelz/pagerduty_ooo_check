import { Log } from "./checks/log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Analytics {
  export let enabled: boolean = true;

  export function disable(): void {
    Analytics.enabled = false;
  }
}
