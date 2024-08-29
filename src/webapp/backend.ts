// eslint-disable-next-line @typescript-eslint/no-unused-vars
function doGet() {
  const template = HtmlService.createTemplateFromFile("src/webapp/Index");
  // const statusData = isUserInstalled();
  // template.installed = statusData.installed;
  // template.email = statusData.email;
  return template
    .evaluate()
    .setTitle("Slack bot")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
