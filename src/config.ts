// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Config {
  export const CONFIG_SPREADSHEET_KEY = "CONFIG_SPREADSHEET";

  export type OncallConfig = {
    scheduleName: string;
    scheduleId: string;
    strictMode: boolean;
  };

  export function loadConfigs(): OncallConfig[] {
    const spreadSheetId = PropertiesService.getScriptProperties().getProperty(
      Config.CONFIG_SPREADSHEET_KEY
    );
    if (spreadSheetId === null) {
      throw new Error(
        "CONFIG_SPREADSHEET property is not set in the script properties"
      );
    }
    const spreadsheet = SpreadsheetApp.openById(spreadSheetId);
    const sheet = spreadsheet.getSheetByName("official");
    if (sheet === null) {
      throw new Error("'official' tab not found in the spreadsheet.");
    }
    const data = sheet.getDataRange().getValues();

    const configs: OncallConfig[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const config: OncallConfig = {
        scheduleName: row[0].toString(),
        scheduleId: row[1].toString(),
        strictMode: row[2].toString().trim().toLowerCase() === "true",
      };
      configs.push(config);
    }

    return configs;
  }
}
