import { GetEvents } from "./get-events";
import { LogLevel, Log } from "./log";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheckOOO {
  export const OOO_EVENT_TYPE: string = "outOfOffice";
  export const OOO_TITLE_PREFIX_NOTICE: string = "[🚨OOO] ";
  export const OOO_DESCRIPTION_BLURB: string =
    "\n<small><i>[🚨OOO: detected that an attendee is OOO at this time]</i></small>";
  export const OOO_WORKDAY_EVENT_TITLE: string = "OOO- Automated by Workday";

  type CompareEvents = (
    myEvent: GoogleAppsScript.Calendar.Schema.Event,
    theirEvent: GoogleAppsScript.Calendar.Schema.Event
  ) => boolean;

  export function checkIsOOODuringEvent(
    event: GoogleAppsScript.Calendar.Schema.Event,
    theirEmail: string,
    getEvents: GetEvents.EventFetcherWithError = GetEvents.getEventsForDateRangeCustomCalendarWithErrorCatch,
    checkIsOOOAndOverlaps: CompareEvents = checkIfEventIsOOOAndOverlaps
  ): boolean | undefined {
    Log.log(
      `Checking OOO for event "${event.summary}", theirEmail = ${theirEmail}`
    );
    if (theirEmail == null) {
      Log.log(`null email, continue`);
      return undefined;
    }

    const start = new Date(event.start!.dateTime!);
    // Handle bug where single day Workday-OOO events are for some reason excluded when making queries within that day
    start.setDate(start.getDate() - 1);
    const end = new Date(event.end!.dateTime!);
    const theirEventsDuringMeeting = getEvents(start, end, theirEmail);
    if (theirEventsDuringMeeting === undefined) {
      Log.log("👮‍♂️ Error fetching their calendar");
      return undefined;
    }

    let hasOOOoverlap = false;
    for (const theirEvent of theirEventsDuringMeeting) {
      if (checkIsOOOAndOverlaps(event, theirEvent)) {
        Log.log("👮‍♂️ Found OOO an overlapping event");
        hasOOOoverlap = true;
        break;
      }
    }

    return hasOOOoverlap;
  }

  export function checkIfEventIsOOOAndOverlaps(
    myEvent: GoogleAppsScript.Calendar.Schema.Event,
    theirEvent: GoogleAppsScript.Calendar.Schema.Event
  ): boolean {
    Log.log(`🔎 Examining their event: 📅 "${theirEvent.summary}"`);
    LogLevel.DEBUG && Log.log(`\\Raw details: "${theirEvent}"`);

    if (
      theirEvent.eventType !== CheckOOO.OOO_EVENT_TYPE &&
      theirEvent.summary !== CheckOOO.OOO_WORKDAY_EVENT_TITLE
    ) {
      Log.log(`👎 Not a OOO event,`);
      return false;
    }

    Log.log(`Found potentially relevant OOO event,`);

    // All day event handling
    if (
      theirEvent.start?.date &&
      theirEvent.end?.date &&
      myEvent.start?.dateTime &&
      myEvent.end?.dateTime
    ) {
      const myEventStartDate = new Date(myEvent.start.dateTime);
      const myEventEndDate = new Date(myEvent.end.dateTime);
      Log.log(
        `Debug: myEventStartDate=${myEventStartDate} myEventEndDate=${myEventEndDate}`
      );
      myEventStartDate.setHours(0, 0, 0, 0);
      myEventEndDate.setHours(0, 0, 0, 0);
      // Ugh this was annoying and janky but it works :shrug:. Basically these values are simple dates like "09-03-2023", but
      // javascript will interpret them as UTC and subtract 7 hours from pacific, so effectively the dates are -1.
      // Ugly hack for that is add back the delta between UTC and current timezone. Probably a much better way but this seems
      // stable and I'm lazy and don't want to spend too much time on this.
      const theirOOOStart = new Date(theirEvent.start.date);
      theirOOOStart.setMinutes(
        theirOOOStart.getMinutes() + theirOOOStart.getTimezoneOffset()
      );
      Log.log(`Debug: theirOOOStart=${theirOOOStart}`);
      theirOOOStart.setHours(0, 0, 0, 0);
      const theirOOOEnd = new Date(theirEvent.end.date);
      theirOOOEnd.setMinutes(
        theirOOOEnd.getMinutes() + theirOOOEnd.getTimezoneOffset()
      );
      Log.log(`Debug: theirOOOEnd=${theirOOOEnd}`);
      theirOOOEnd.setHours(0, 0, 0, 0);

      // TODO NOTE this is forked from original code and I need to backport / library-ify it
      if (
        (myEventStartDate >= theirOOOStart && myEventEndDate <= theirOOOEnd) ||
        (theirOOOStart >= myEventStartDate && theirOOOEnd <= myEventEndDate)
      ) {
        Log.log(
          `✅ Yep, that OOO event overlaps! Will modify and flag the even (only date check, not mins/hours): oooStart=${theirOOOStart}, oooEnd=${theirOOOEnd}, myEventDate=${myEventStartDate}`
        );

        return true;
      } else {
        Log.log(
          `👎 No, that OOO doensnt appear to overlap (only date check, not mins/hours): oooStart=${theirOOOStart}, oooEnd=${theirOOOEnd}, myEventDate=${myEventStartDate}`
        );
        return false;
      }
      // Specific start/end time handling
    } else if (
      theirEvent.start?.dateTime &&
      theirEvent.end?.dateTime &&
      myEvent.start?.dateTime &&
      myEvent.end?.dateTime
    ) {
      const theirOOOStart = new Date(theirEvent.start.dateTime);
      const theirOOOEnd = new Date(theirEvent.end.dateTime);

      const myEventStart = new Date(myEvent.start.dateTime);
      const myEventEnd = new Date(myEvent.end.dateTime);

      if (myEventStart >= theirOOOStart && myEventEnd <= theirOOOEnd) {
        Log.log(
          "✅ Yep, that OOO event overlaps! Will modify and flag the event"
        );
        return true;
      } else {
        Log.log(
          `👎 No, that OOO doensnt appear to overlap (interval check): oooStart=${theirOOOStart}, oooEnd=${theirOOOEnd}, myEventStart=${myEventStart}, myEventEnd=${myEventEnd}`
        );
        return false;
      }
    }

    Log.log(
      `👎 No, that OOO doensnt appear to overlap (hit edge case where date set strangely...)`
    );
    return false;
  }
}
