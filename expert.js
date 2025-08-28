function onFormSubmit(e) {
  var formResponse = e.response;
  var itemResponses = formResponse.getItemResponses();

  Logger.log("=== 新的表單回覆 ===");
  for (var i = 0; i < itemResponses.length; i++) {
    var item = itemResponses[i];
    Logger.log(item.getItem().getTitle() + "： " + item.getResponse());
  }
}
