(function () {
  onBdyInit(function () {
    var btnsDiv = $('.g-button[title^=下载]:first').parent('div');
    btnsDiv.append(buildPdownButton());

    $.extend({
      //验证码弹框
      showVcodeDialog: function (img, confrim, refresh) {
        var blockDiv = $('<div class="module-canvas" style="position: fixed; left: 0px; top: 0px; z-index: 50; background: rgb(0, 0, 0); opacity: 0.5; width: 100%; height: 100%;"></div>');
        var vcodeDialog = $('<div class="dialog dialog-dialog3 dialog-gray" id="pdown-dialog" style="width: 30%; top: 20%; bottom: auto; left: 35%; right: auto; display: block; visibility: visible; z-index: 53;">' +
          '  <div class="dialog-header dialog-drag">' +
          '    <h3>' +
          '      <span class="dialog-header-title">' +
          '        <em class="select-text">提示</em>' +
          '      </span>' +
          '    </h3>' +
          '    <div class="dialog-control">' +
          '      <span type="close" class="dialog-icon dialog-close icon icon-close">' +
          '        <span class="sicon">×</span>' +
          '      </span>' +
          '    </div>' +
          '  </div>' +
          '  <div class="dialog-body">' +
          '    <div style="text-align:center;padding:22px;">' +
          '      <div class="download-verify" style="margin-top: 10px;padding: 0 28px;text-align: left;font-size: 12px;" id="downloadVerify">' +
          '        <div class="verify-body">请输入验证码：' +
          '          <input type="text" style="padding: 3px;width: 85px;height: 23px;border: 1px solid #C6C6C6;background-color: white;vertical-align: middle;"' +
          '            class="input-code" maxlength="4">' +
          '          <img class="img-code" type="refresh" style="margin-left: 10px;vertical-align: middle;" alt="点击换一张" src="' + img + '"' +
          '            width="100" height="30">' +
          '          <a href="javascript:;" type="refresh" style="text-decoration: underline;" class="underline">换一张</a>' +
          '        </div>' +
          '        <div style="padding-left: 84px;height: 18px;color: #d80000;" class="verify-error"></div>' +
          '      </div>' +
          '    </div>' +
          '  </div>' +
          '  <div class="dialog-footer g-clearfix">' +
          '    <a class="g-button g-button-blue" type="confrim" href="javascript:;" title="确定" style="padding-left: 36px;">' +
          '      <span class="g-button-right" style="padding-right: 36px;">' +
          '        <span class="text" style="width: auto;">确定</span>' +
          '      </span>' +
          '    </a>' +
          '    <a class="g-button" type="close" href="javascript:;" title="取消" style="padding-left: 36px;">' +
          '      <span class="g-button-right" style="padding-right: 36px;">' +
          '        <span class="text" style="width: auto;">取消</span>' +
          '      </span>' +
          '    </a>' +
          '  </div>' +
          '</div>')
        $('body').append(blockDiv);
        $('body').append(vcodeDialog);
        //提交验证码
        vcodeDialog.find('[type=confrim]').click(function () {
          var ret = confrim(vcodeDialog.find('input[type=text]').val());
          if (ret == 1) {
            //关闭窗口
            blockDiv.remove();
            vcodeDialog.remove();
          } else if (ret == 2) {
            //刷新验证码
            vcodeDialog.find('img[type=refresh]').attr('src', refresh());
          }
        });
        //刷新验证码
        vcodeDialog.find('[type=refresh]').click(function () {
          vcodeDialog.find('img[type=refresh]').attr('src', refresh());
        });
        //关闭
        vcodeDialog.find('[type=close]').click(function () {
          blockDiv.remove();
          vcodeDialog.remove();
        });
      }
    });
  });
})();