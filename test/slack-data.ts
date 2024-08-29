import { MessageElement } from "@slack/web-api/dist/response/ConversationsHistoryResponse";

export const messages: MessageElement[] = [
  {
    user: "U07GXS7AR9U",
    type: "message",
    ts: "1723845203.271289",
    bot_id: "B07HH5QNWN5",
    app_id: "A07H4BL6U1Z",
    text: "Hello, standup time!\nRollcall: <@U044HT4GLVD>, <@U1V25CFLP>, <@U02JCV9RM1B>, <@U03211RL2LV>, <@U03JM9P7P7F>, <@U04ANRFDCPN>, <@U0744U56YMN>, <@U076D9JLWDN>, <@U077V7EJY65>, <@U079PN26CS3>",
    team: "T05HJ0CKWG5",
    bot_profile: {
      id: "B07HH5QNWN5",
      deleted: false,
      name: "Android DX Standup",
      updated: 1723749303,
      app_id: "A07H4BL6U1Z",
      icons: {
        image_36: "https://a.slack-edge.com/80588/img/plugins/app/bot_36.png",
        image_48: "https://a.slack-edge.com/80588/img/plugins/app/bot_48.png",
        image_72:
          "https://a.slack-edge.com/80588/img/plugins/app/service_72.png",
      },
      team_id: "T05HJ0CKWG5",
    },
    thread_ts: "1723845203.271289",
    reply_count: 1,
    reply_users_count: 1,
    latest_reply: "1723845249.215299",
    reply_users: ["U044HT4GLVD"],
    is_locked: false,
    subscribed: false,
    blocks: [
      {
        // @ts-expect-error
        type: "rich_text",
        block_id: "fgR",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              // @ts-expect-error
              { type: "text", text: "Hello, standup time!\nRollcall: " },
              // @ts-expect-error
              { type: "user", user_id: "U044HT4GLVD" },
              // @ts-expect-error
              { type: "text", text: ", " },
              // @ts-expect-error
              { type: "user", user_id: "U1V25CFLP" },
            ],
          },
        ],
      },
    ],
  },
  {
    user: "U044HT4GLVD",
    type: "message",
    ts: "1723845249.215299",
    client_msg_id: "3d179a4c-f8b9-4166-bb69-3b7e230c729d",
    text: "test standup i did it",
    team: "T05HJ0CKWG5",
    thread_ts: "1723845203.271289",
    parent_user_id: "U07GXS7AR9U",
    blocks: [
      {
        // @ts-expect-error
        type: "rich_text",
        block_id: "bX/wm",
        elements: [
          {
            type: "rich_text_section",
            // @ts-expect-error
            elements: [{ type: "text", text: "test standup i did it" }],
          },
        ],
      },
    ],
  },
];
