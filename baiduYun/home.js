(function () {
  onBdyInit(function () {
    var btnsDiv = $('.g-button[title=离线下载]').parent('div');
    btnsDiv.append(buildPdownButton());
  });
})();
