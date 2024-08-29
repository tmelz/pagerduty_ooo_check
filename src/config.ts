// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Config {
  export const CONFIG_SPREADSHEET_KEY = "CONFIG_SPREADSHEET";

  export type StandupConfig = {
    calendarId: string;
    titleSubstring: string;
    standupBlurb: string;
    channelId: string;
    userGroupId: string;
    nudgeMessage: string;
    reminderOffsets: number[];
    notesDocumentUrl: string;
    documentHeader: string;
  };

  export function loadConfigs(): StandupConfig[] {
    const spreadSheetId = PropertiesService.getScriptProperties().getProperty(
      Config.CONFIG_SPREADSHEET_KEY
    );
    if (spreadSheetId === null) {
      throw new Error(
        "CONFIG_SPREADSHEET property is not set in the script properties"
      );
    }
    const spreadsheet = SpreadsheetApp.openById(spreadSheetId);
    const sheet = spreadsheet.getActiveSheet();
    const data = sheet.getDataRange().getValues();

    const configs: StandupConfig[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const config: StandupConfig = {
        calendarId: row[0].toString(),
        titleSubstring: row[1].toString(),
        standupBlurb: row[2].toString(),
        channelId: row[3].toString(),
        userGroupId: row[4].toString(),
        nudgeMessage: row[5].toString(),
        reminderOffsets: row[6]
          .toString()
          .split(",")
          .map((offset: string) => parseInt(offset.trim(), 10)),
        notesDocumentUrl: row[7].toString(),
        documentHeader: row[8].toString(),
      };
      configs.push(config);
    }

    return configs;
  }
}
