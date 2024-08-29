import {
  ConversationsHistoryResponse,
  MessageElement,
} from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import { User } from "@slack/web-api/dist/response/UsersInfoResponse";
import {
  UsersInfoResponse,
  UsergroupsUsersListResponse,
} from "@slack/web-api/dist/response";
import { ChatPostMessageResponse } from "@slack/web-api/dist/response";
import { ConversationsRepliesResponse } from "@slack/web-api/dist/response";
import { Log } from "./checks/log";

import { ChatPostEphemeralResponse } from "@slack/web-api/dist/response";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Slack {
  export const TOKEN_KEY = "SLACK_BOT_SECRET_TOKEN";
  export const BOT_ID_KEY = "SLACK_BOT_USER_ID";
  export const TOKEN = PropertiesService.getScriptProperties().getProperty(
    Slack.TOKEN_KEY
  );
  export const BOT_ID = PropertiesService.getScriptProperties().getProperty(
    Slack.BOT_ID_KEY
  );

  export function postMessage(
    channelId: string,
    message: string,
    threadTs?: string
  ): ChatPostMessageResponse | undefined {
    Log.log(
      `Calling postMessage with channelId: ${channelId}, message: ${message}, threadTs: ${threadTs}`
    );
    const url = "https://slack.com/api/chat.postMessage";
    const payload = { channel: channelId, text: message, thread_ts: threadTs };
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${Slack.TOKEN}` },
      muteHttpExceptions: true,
      payload: JSON.stringify(payload),
    };

    const response = UrlFetchApp.fetch(url, params);
    const json: ChatPostMessageResponse = JSON.parse(response.getContentText());
    // Log.log(`postMessage response: ${JSON.stringify(json)}`);

    return json.ok ? json : undefined;
  }

  export function listMessagesFromTimeRange(
    channelId: string,
    oldest: Date,
    latest: Date
  ): MessageElement[] | undefined {
    Log.log(
      `Calling listMessagesFromTimeRange with channelId: ${channelId}, oldest: ${oldest.toISOString()}, latest: ${latest.toISOString()}`
    );
    const oldestSeconds = Math.floor(oldest.getTime() / 1000);
    const latestSeconds = Math.floor(latest.getTime() / 1000);
    const url = `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldestSeconds}&latest=${latestSeconds}`;
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "get",
      headers: { Authorization: `Bearer ${Slack.TOKEN}` },
    };

    const response = UrlFetchApp.fetch(url, options);
    const result: ConversationsHistoryResponse = JSON.parse(
      response.getContentText()
    );
    // Log.log(`listMessagesFromTimeRange response: ${JSON.stringify(result)}`);

    return result.ok ? (result.messages ?? []) : undefined;
  }

  export function getUsersFromGroup(userGroupId: string): User[] {
    Log.log(`Calling getUsersFromGroup with userGroupId: ${userGroupId}`);
    const members = listUserGroupMembers(userGroupId);
    if (members === undefined) {
      return [];
    }

    const users: User[] = [];
    for (const userId of members.users!) {
      const user = getUserDetails(userId);
      if (user !== undefined) {
        users.push(user);
      }
    }

    return users;
  }

  export function listUserGroupMembers(
    userGroupId: string
  ): UsergroupsUsersListResponse | undefined {
    Log.log(`Calling listUserGroupMembers with userGroupId: ${userGroupId}`);
    const url = `https://slack.com/api/usergroups.users.list?usergroup=${userGroupId}`;
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "get",
      contentType: "application/x-www-form-urlencoded",
      headers: { Authorization: `Bearer ${Slack.TOKEN}` },
      muteHttpExceptions: true,
    };

    const fetchResult = UrlFetchApp.fetch(url, params);
    const response: UsergroupsUsersListResponse = JSON.parse(
      fetchResult.getContentText()
    );
    // Log.log(`listUserGroupMembers response: ${JSON.stringify(response)}`);

    return response.ok ? response : undefined;
  }

  export function getUserDetails(userId: string): User | undefined {
    Log.log(`Calling getUserDetails with userId: ${userId}`);
    const url = `https://slack.com/api/users.info?user=${userId}`;
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "get",
      contentType: "application/x-www-form-urlencoded",
      headers: { Authorization: `Bearer ${Slack.TOKEN}` },
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, params);
    const structuredResponse: UsersInfoResponse = JSON.parse(
      response.getContentText()
    );
    // Log.log(`getUserDetails response: ${JSON.stringify(structuredResponse)}`);

    return structuredResponse.ok ? structuredResponse.user : undefined;
  }

  export function getAllRepliesInThread(
    channelId: string,
    threadTs: string
  ): ConversationsRepliesResponse | undefined {
    Log.log(
      `Calling getAllRepliesInThread with channelId: ${channelId}, threadTs: ${threadTs}`
    );
    const url = `https://slack.com/api/conversations.replies?channel=${channelId}&ts=${threadTs}`;
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "get",
      contentType: "application/x-www-form-urlencoded",
      headers: { Authorization: `Bearer ${Slack.TOKEN}` },
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, params);
    const json: ConversationsRepliesResponse = JSON.parse(
      response.getContentText()
    );
    // Log.log(`getAllRepliesInThread response: ${JSON.stringify(json)}`);

    return json.ok ? json : undefined;
  }

  export function postEphemeralMessage(
    channel: string,
    user: string,
    thread_ts: string,
    text: string
  ) {
    const url = "https://slack.com/api/chat.postEphemeral";

    const payload = {
      channel: channel,
      user: user,
      text: text,
      thread_ts: thread_ts,
    };

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${Slack.TOKEN}`,
      },
      payload: JSON.stringify(payload),
    };

    const response = UrlFetchApp.fetch(url, options);
    // Logger.log(response.getContentText()); // Log the response for debuggin
    const json: ChatPostEphemeralResponse = JSON.parse(
      response.getContentText()
    );
    return json;
  }

  export function sendDirectMessage(
    userId: string,
    text: string
  ): ChatPostMessageResponse {
    const url = "https://slack.com/api/chat.postMessage";

    const payload = {
      channel: userId, // User ID for DM
      text: text,
      as_user: true, // Optional: Send as the bot user, or omit to use the app's bot identity
    };

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${Slack.TOKEN}`,
      },
      payload: JSON.stringify(payload),
    };

    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse: ChatPostMessageResponse = JSON.parse(
      response.getContentText()
    );

    if (!jsonResponse.ok) {
      console.error("Failed to send direct message:", jsonResponse.error);
      throw new Error(`Slack API Error: ${jsonResponse.error}`);
    }

    Log.log("Direct message sent successfully: " + jsonResponse.ts);
    return jsonResponse;
  }

  export function generateSlackMessageLink(
    channelId: string,
    messageTs: string
  ): string {
    const workspaceUrl = getWorkspaceDomain();
    const formattedTs = messageTs.replace(".", "");
    const slackUrl = `${workspaceUrl}/archives/${channelId}/p${formattedTs}`;
    return slackUrl;
  }

  function getWorkspaceDomain(): string {
    const response = UrlFetchApp.fetch("https://slack.com/api/auth.test", {
      method: "post",
      headers: {
        Authorization: `Bearer ${Slack.TOKEN}`,
      },
    });
    const result = JSON.parse(response.getContentText());
    const url = result.url;
    if (url.endsWith("/")) {
      return url.slice(0, -1);
    }
    return result.url;
  }
}
