import { Slack } from "./slack";
import { MessageElement } from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import { Log } from "./checks/log";
import { Config } from "./config";
import { GetEvents } from "./checks/get-events";
import { User } from "@slack/web-api/dist/response/UsersInfoResponse";
import { CheckOOO } from "./checks/ooo";
import { GoogleDoc } from "./gdoc";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace StandupBot {
  export enum StandupPhase {
    Start,
    Nudge,
    Finish,
  }

  export function getStandupEvent(
    config: Config.StandupConfig,
    currentTime: Date
  ): GoogleAppsScript.Calendar.Schema.Event | undefined {
    const twoHoursAgo = new Date(currentTime.getTime());
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    const oneHourFuture = new Date(currentTime.getTime());
    oneHourFuture.setHours(oneHourFuture.getHours() + 1);

    const events = GetEvents.getEventsForDateRangeCustomCalendar(
      twoHoursAgo,
      oneHourFuture,
      config.calendarId
    );

    Log.log(
      `Searching for event with title substring ${config.titleSubstring.toLocaleLowerCase()}`
    );
    const standup = events.find((event) =>
      event.summary
        ?.toLocaleLowerCase()
        .includes(config.titleSubstring.toLocaleLowerCase())
    );

    if (standup === undefined) {
      Log.log("No standup event found");
      return undefined;
    } else {
      Log.log("Standup event found" + standup.summary);
    }

    return standup;
  }

  export function getStandupPhase(
    config: Config.StandupConfig,
    currentTime: Date,
    standup: GoogleAppsScript.Calendar.Schema.Event
  ): StandupBot.StandupPhase | undefined {
    if (
      standup?.start?.dateTime === undefined ||
      standup?.end?.dateTime === undefined
    ) {
      Log.log("Standup event does not have a specific start & end time");
      return undefined;
    }

    const standupStart = new Date(standup?.start?.dateTime);
    const standupEnd = new Date(standup?.end?.dateTime);
    if (isRoughlyThisTime(standupStart, currentTime)) {
      Log.log(`Is roughly standup start time! ${standupStart.toISOString()}`);
      return StandupPhase.Start;
    } else {
      for (const reminderOffset of config.reminderOffsets) {
        const reminderTime = new Date(standupStart);
        reminderTime.setMinutes(reminderTime.getMinutes() + reminderOffset);
        if (isRoughlyThisTime(reminderTime, currentTime)) {
          Log.log(
            `Is roughly reminder time, sending standup nudges (${reminderTime.toISOString()})`
          );
          return StandupPhase.Nudge;
        }

        if (isRoughlyThisTime(standupEnd, currentTime)) {
          Log.log(`Is roughly standup end time! ${standupEnd.toISOString()}`);
          return StandupPhase.Finish;
        }
      }
    }
    return undefined;
  }

  function isRoughlyThisTime(desiredTime: Date, currentTime: Date): boolean {
    // Check if the current time is within ±3 minutes of the standup time
    const threeMinutes = 3 * 60 * 1000; // 3 minutes in milliseconds
    return (
      Math.abs(desiredTime.getTime() - currentTime.getTime()) <= threeMinutes
    );
  }

  export function postStandupThread(
    config: Config.StandupConfig,
    event: GoogleAppsScript.Calendar.Schema.Event
  ) {
    const existingStandup = getRecentStandupThreadOrMessage(config.channelId);
    if (existingStandup !== undefined) {
      Log.log("Recent standup message already exists");
      return;
    }

    const rollCall = getUserRollcallMessage(config.userGroupId, event);
    const standupMessage = `${config.standupBlurb}\n\n${rollCall}`;
    Slack.postMessage(config.channelId, standupMessage);
  }

  export function sendStandupNudges(
    config: Config.StandupConfig,
    event: GoogleAppsScript.Calendar.Schema.Event
  ) {
    const threadMessages = getRecentStandupThreadWithMessages(config.channelId);
    if (threadMessages === undefined || threadMessages.length === 0) {
      Log.log("No messages found in thread; should have at least initial post");
      return;
    }

    const threadLink = Slack.generateSlackMessageLink(
      config.channelId,
      threadMessages[0].ts!
    );

    const availabilities = getUserAvailabilityForStandup(
      config.userGroupId,
      event
    );
    const onlineUsers = availabilities.working.map((user) => user.id!);
    Log.log(`Online users: ${onlineUsers.join(", ")}`);
    const respondedUserIds = threadMessages
      .map((message) => message.user)
      .filter(
        (userId) => userId !== Slack.BOT_ID && userId !== undefined
      ) as string[];
    Log.log(`Responded users: ${respondedUserIds.join(", ")}`);

    // Filter out users who have already responded
    const usersToNudge = onlineUsers.filter(
      (userId) => !respondedUserIds.includes(userId)
    );

    // if  config.nudgeMessage includes "$LINK", replace it with the thread link
    // if it doesn't, append the thread link to the message after \n\n
    let nudgeMessage = config.nudgeMessage;
    if (config.nudgeMessage.includes("$LINK")) {
      nudgeMessage = nudgeMessage.replace("$LINK", threadLink);
    } else {
      nudgeMessage = `${nudgeMessage}\n\n${threadLink}`;
    }

    // Send nudge messages to users who haven't responded
    usersToNudge.forEach((userId) => {
      Slack.sendDirectMessage(userId, nudgeMessage);
    });

    const nudgeNames = availabilities.working
      .filter((user) => usersToNudge.includes(user.id!))
      .map((user) => user.profile?.real_name);
    Log.log(`Sent nudges to users: ${nudgeNames.join(", ")}`);
  }

  export function getUserIdMentionsFromMessage(
    message: MessageElement
  ): string[] {
    const userIds: string[] = [];

    message.blocks?.forEach((block) => {
      block.elements?.forEach((section) => {
        section.elements?.forEach((element) => {
          // @ts-expect-error
          if (element?.type === "user" && element.user_id) {
            // @ts-expect-error
            userIds.push(element.user_id);
          }
        });
      });
    });

    return userIds;
  }

  export function getRecentStandupThreadWithMessages(
    channelId: string
  ): MessageElement[] | undefined {
    const result = getRecentStandupThreadOrMessage(channelId);
    if (result === undefined) {
      return undefined;
    } else if (result.threadTs === undefined) {
      return [result.message];
    }

    const replies = Slack.getAllRepliesInThread(channelId, result.threadTs);
    return replies?.messages;
  }

  export function getRecentStandupThreadOrMessage(channelId: string):
    | {
        ts: string;
        threadTs: string | undefined;
        message: MessageElement;
      }
    | undefined {
    // Find the most recent thread from Standup bot, should be posted in the last 2 hours
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const messages =
      Slack.listMessagesFromTimeRange(channelId, twoHoursAgo, now) ?? [];

    // TODO ensure we pick most recent message
    Log.log(
      `Looking for message from bot (${Slack.BOT_ID}) in channel ${channelId} across ${messages.length} recent messages`
    );
    for (const message of messages) {
      Log.log(`Message: ${JSON.stringify(message)}`);
      if (message.bot_id === Slack.BOT_ID) {
        Log.log(`Found message from bot: ${message.ts}`);
        return {
          threadTs: message.thread_ts,
          ts: message.ts!,
          message: message,
        };
      }
    }

    return undefined;
  }
  export function getUserAvailabilityForStandup(
    userGroupId: string,
    event: GoogleAppsScript.Calendar.Schema.Event
  ): { working: User[]; ooo: User[] } {
    const cacheKey = `${userGroupId}-${event.id}`;
    const cache = CacheService.getScriptCache();

    const cachedAvailability = cache.get(cacheKey);
    if (cachedAvailability) {
      return JSON.parse(cachedAvailability);
    }

    const users = Slack.getUsersFromGroup(userGroupId);
    const ooo: User[] = [];

    for (const user of users) {
      const userEmail = user.profile?.email;
      if (userEmail === undefined) {
        Log.log(`User ${user.id} has no email, skipping`);
        continue;
      }
      if (CheckOOO.checkIsOOODuringEvent(event, userEmail)) {
        ooo.push(user);
      }
    }

    const working = users.filter((user) => !ooo.includes(user));
    const availability = { working, ooo };

    // 3 hours
    cache.put(cacheKey, JSON.stringify(availability), 10800);

    return availability;
  }

  export function getUserRollcallMessage(
    userGroupId: string,
    event: GoogleAppsScript.Calendar.Schema.Event
  ): string {
    const availabilities = getUserAvailabilityForStandup(userGroupId, event);

    let message =
      "Folks working today: " +
      availabilities.working
        .map((user) => `${user.profile?.real_name}`)
        .join(", ") +
      "\n\n";
    if (availabilities.ooo.length > 0) {
      message +=
        "(OOO folks: " +
        availabilities.ooo
          .map((user) => `${user.profile?.real_name}`)
          .join(", ") +
        ")";
    }

    return message;
  }

  export function postStandupsToDoc(config: Config.StandupConfig): void {
    const users = Slack.getUsersFromGroup(config.userGroupId);
    const messages = StandupBot.getRecentStandupThreadWithMessages(
      config.channelId
    );

    if (messages === undefined || messages.length === 0) {
      Log.log("No standup thread found");
      return;
    }
    Log.log(`Found ${messages.length} messages in standup thread`);
    // JSON dump messages to lo
    Log.log(JSON.stringify(messages));
    // json log users
    Log.log(JSON.stringify(users));
    const standupLink = Slack.generateSlackMessageLink(
      config.channelId,
      messages[0].ts!
    );

    // filter out messages with bot_id not undefined
    const realMessages = messages.filter(
      (message) => message.bot_id === undefined
    );

    // group messages by user
    const messagesByUser: Map<string, string[]> = new Map();
    for (const message of realMessages) {
      const userId = message.user;
      const user = users.find((user) => user.id === userId)?.real_name;
      const text = message.text;
      if (user === undefined || text === undefined) {
        continue;
      }

      if (!messagesByUser.has(user)) {
        messagesByUser.set(user, []);
      }

      messagesByUser.get(user)?.push(text);
    }

    GoogleDoc.appendToGoogleDoc(
      config.notesDocumentUrl,
      messagesByUser,
      standupLink
    );
  }
}
