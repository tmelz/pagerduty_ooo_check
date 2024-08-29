import { jest } from "@jest/globals";

import { StandupBot } from "../src/standup-bot";
import { MessageElement } from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import { messages } from "./slack-data";

describe("StandupBot.getUserIdMentionsFromMessage", () => {
  test("should pull ids from message", () => {
    expect(StandupBot.getUserIdMentionsFromMessage(messages[0])).toEqual([
      "U044HT4GLVD",
      "U1V25CFLP",
    ]);
  });
});
