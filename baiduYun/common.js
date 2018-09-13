function onBdyInit(callback) {
  var interval = setInterval(function() {
    if (window.$ && $(".g-button").size() > 0) {
      clearInterval(interval);
      callback();
    }
  }, 100);
}

function buildPdownButton() {
  var pdownBtn = $(
    '<span class="g-dropdown-button last-button" style="display: inline-block;">' +
      '      <a class="g-button" href="javascript:;" title="PD下载" style="color:#fff;background: #f8645c;">' +
      '        <span class="g-button-right">' +
      '          <em class="icon icon-download" title="PD下载">' +
      "          </em>" +
      '          <span class="text" style="width: auto;">PD下载</span>' +
      "        </span>" +
      "      </a>" +
      '      <span class="menu" style="width: 96px;z-index: 49;">' +
      '        <a data-menu-id="pd-direct" class="g-button-menu" href="javascript:;">直链下载</a>' +
      '        <a data-menu-id="pd-batch" class="g-button-menu" href="javascript:;">压缩链接下载</a>' +
      '        <a data-menu-id="pd-push" class="g-button-menu" href="javascript:;">批量推送下载</a>' +
      '        <div style="height:1px;width:100%;background:#e9e9e9;overflow:hidden;"></div>' +
      '        <a data-menu-id="pd-batch" class="g-button-menu" target="_blank" href="https://github.com/proxyee-down-org/proxyee-down-extension/tree/master/baiduYun">使用教程</a>' +
      "      </span>" +
      "    </span>"
  );
  pdownBtn.hover(
    function() {
      $(this).addClass("button-open");
    },
    function() {
      $(this).removeClass("button-open");
    }
  );
  return pdownBtn;
}

(function() {
  onBdyInit(function() {
    $(document).trigger("bdyInit");
    //直链下载，只支持单文件
    $(document).on("click", "a[data-menu-id=pd-direct]", function() {
      $(this)
        .parents("span.g-dropdown-button")
        .removeClass("button-open");
      directDown(function(downFiles) {
        $.block();
        var fileInfo = downFiles[0];
        var request = buildRequest(fileInfo.dlink);
        if (!isShare()) {
          request.heads.Cookie = pdown.getCookie(fileInfo.dlink);
        }
        try {
          var result = pdown.resolve(request);
          pdown.createTask(result.request, result.response);
        } catch (error) {
          $.showError("创建任务失败，错误码:" + error.status);
        } finally {
          $.unblock();
        }
      });
    });
    //压缩链接下载，支持单文件和多文件，有最大文件数量下载限制
    $(document).on("click", "a[data-menu-id=pd-batch]", function() {
      $(this)
        .parents("span.g-dropdown-button")
        .removeClass("button-open");
      batchDown(function(downFiles) {
        $.block();
        $.showInfo("若下载的压缩包无法解压，请参考使用教程里的解压方法");
        var request = buildRequest(downFiles);
        try {
          var result = pdown.resolve(request);
          result.request.url = result.request.url.replace(/^https/, "http");
          pdown.createTask(result.request, result.response);
        } catch (error) {
          if (error.status == 400) {
            var response = JSON.parse(error.responseText);
            if (response.code == 4002) {
              $.showError(
                "创建任务失败：文件总大小过大或文件夹名称中不能包含+号"
              );
            } else {
              $.showError("创建任务失败，错误码:" + response.code);
            }
          } else {
            $.showError("创建任务异常");
          }
        } finally {
          $.unblock();
        }
      });
    });
    //直接推送下载，把选中的文件全部解析成直链，推送到Proxyee Down下载
    $(document).on("click", "a[data-menu-id=pd-push]", function() {
      $(this)
        .parents("span.g-dropdown-button")
        .removeClass("button-open");
      pushDown(function(downFiles) {
        var cookie = isShare() ? "" : pdown.getCookie(downFiles[0].dlink);
        var downConfig = pdown.getDownConfig();
        $.showInfo("正在推送中，请勿关闭浏览器", -1);
        pushTasks(downFiles, 0, cookie, downConfig);
      });
    });

    function pushTasks(downFiles, index, cookie, downConfig) {
      if (index < downFiles.length) {
        var fileInfo = downFiles[index];
        var request = buildRequest(fileInfo.dlink);
        request.heads.Cookie = cookie;
        var bdyfilePath = fileInfo.path.substring(
          0,
          fileInfo.path.lastIndexOf("/")
        );
        pdown.resolveAsync(
          request,
          function(result) {
            var downConfigTemp = Object.assign({}, downConfig, {
              filePath: downConfig.filePath + bdyfilePath
            });
            pdown.pushTask(
              {
                request: result.request,
                response: result.response,
                config: downConfigTemp
              },
              function() {
                $.showInfo(
                  "推送任务成功(" +
                    (index + 1) +
                    "/" +
                    downFiles.length +
                    ")：" +
                    fileInfo.server_filename,
                  index + 1 == downFiles.length ? null : -1
                );
                pushTasks(downFiles, index + 1, cookie, downConfig);
              },
              function(err) {
                var errTip = "";
                if (err.status == 400) {
                  var response = JSON.parse(err.responseText);
                  errTip = "，错误码" + response.code;
                }
                $.showError(
                  "推送任务失败" +
                    "(" +
                    (index + 1) +
                    "/" +
                    downFiles.length +
                    ")" +
                    errTip +
                    "：" +
                    fileInfo.server_filename,
                  index + 1 == downFiles.length ? null : -1
                );
                pushTasks(downFiles, index + 1, cookie, downConfig);
              }
            );
          },
          function(error) {
            $.showError(
              "解析任务失败(" +
                (index + 1) +
                "/" +
                downFiles.length +
                ")，重试中：" +
                fileInfo.server_filename,
              -1
            );
            pushTasks(downFiles, index, cookie, downConfig);
          }
        );
      }
    }

    var pdownTipTimer;
    $.extend({
      block: function() {
        var blockDiv = $("#pdownBlockDiv");
        if (blockDiv.size() == 0) {
          blockDiv = $(
            '<div id="pdownBlockDiv" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index: 95;background-color:rgba(255,255,255,.9)">' +
              '<div style="position: absolute;top:50%;left:50%;color:#2d8cf0">请求中...</div>' +
              "</div>"
          );
          $("body").append(blockDiv);
        } else {
          blockDiv.show();
        }
      },
      unblock: function() {
        $("#pdownBlockDiv").hide();
      },
      tip: function(tip, color, time) {
        var tipDiv = $("#pdownTipDiv");
        if (tipDiv.size() == 0) {
          tipDiv = $(
            '<div id="pdownTipDiv" style="position:absolute;top:74px;left:50%;z-index: 95;margin-left:-104px;padding:0 15px;background-color:' +
              color +
              ';color:#fff;height:40px;box-shadow:0 0 4px rgba(0,0,0,.2);border-radius:4px;">' +
              '<span style="display:block;margin:0 3px;font-size:13px;line-height:40px;white-space:nowrap;overflow:hidden;text-align:center;text-overflow:ellipsis;max-width:500px;min-width:1px">' +
              tip +
              "</span>" +
              "</div>"
          );
          $("body").append(tipDiv);
        } else {
          if (!tipDiv.is(":hidden")) {
            clearTimeout(pdownTipTimer);
          }
          tipDiv
            .css({ "background-color": color })
            .find("span")
            .text(tip)
            .parent()
            .show();
        }
        time = time || 3500;
        if (time > 0) {
          pdownTipTimer = setTimeout(function() {
            $("#pdownTipDiv").hide();
          }, time);
        }
      },
      showInfo: function(msg, time) {
        this.tip(msg, "#3b8cff", time);
      },
      showError: function(msg, time) {
        this.tip(msg, "#f8645c", time);
      }
    });
  });
  window.onload = function() {
    refreshPageInfo();
  };
  window.addEventListener("hashchange", function() {
    refreshPageInfo();
  });

  /**
   * 取当前选中的文件
   */
  function getCheckedFiles() {
    var checkedFiles = [];
    //网盘个人主页
    if (!isShare()) {
      if (PAGE_INFO.vmode == "list") {
        $("span.EOGexf")
          .parent()
          .each(function() {
            if (
              getDefaultStyle(
                $(this)
                  .find(">span>span")
                  .get(0),
                "display"
              ) != "none"
            ) {
              var fileName = $(this)
                .find("div.file-name div.text>a")
                .text();
              checkedFiles.push(fileName);
            }
          });
      } else if (PAGE_INFO.vmode == "grid") {
        $("div.cEefyz").each(function() {
          if (
            getDefaultStyle(
              $(this)
                .find(">span")
                .get(0),
              "display"
            ) != "none"
          ) {
            var fileName = $(this)
              .find("div.file-name>a")
              .text();
            checkedFiles.push(fileName);
          }
        });
      }
    } else {
      //分享页面
      if (
        PAGE_INFO.path == "/" &&
        yunData.FILEINFO.length == 1 &&
        yunData.FILEINFO[0].isdir == 0
      ) {
        checkedFiles = [yunData.FILEINFO[0].server_filename];
      } else {
        var listType = PAGE_INFO.vmode == "list" ? "dd" : "div";
        $(listType + ".JS-item-active").each(function() {
          checkedFiles.push(
            $(this)
              .find("a.filename")
              .text()
          );
        });
      }
    }
    return checkedFiles;
  }

  var PAGE_INFO = {
    path: "",
    vmode: "",
    fileList: []
  };

  /**
   * 通过API获取当前页面的信息
   */
  function refreshPageInfo() {
    PAGE_INFO.path = getPath();
    PAGE_INFO.vmode = getVmode();
    PAGE_INFO.fileList = resolvePath(PAGE_INFO.path);
  }

  /**
   * 取待下载的文件相关信息
   */
  function getDownFiles() {
    var checkedFileList = [];
    var checkedFiles = getCheckedFiles();
    if (checkedFiles.length == 0) {
      return checkedFileList;
    }
    var fileList = [];
    if (getSearchKey()) {
      fileList = getSearchFileList();
    } else {
      if (!PAGE_INFO.fileList) {
        refreshPageInfo();
      }
      fileList = PAGE_INFO.fileList;
    }
    $.each(checkedFiles, function(i, checked) {
      $.each(fileList, function(j, file) {
        if (file.server_filename == checked) {
          checkedFileList.push(file);
          return false;
        }
      });
    });
    return checkedFileList;
  }

  function directDown(callback) {
    var downFiles = getDownFiles();
    if (downFiles.length == 0) {
      $.showError("请选择要下载的文件");
      return;
    }
    if (
      downFiles.length > 1 ||
      (downFiles.length == 1 && downFiles[0].isdir == 1)
    ) {
      $.showError("直链下载只支持单个文件");
      return;
    }
    var type = "dlink";
    var result = resolveDownInfo(type, downFiles);
    handleDownResult(result, type, downFiles, callback);
  }

  function batchDown(callback) {
    var downFiles = getDownFiles();
    if (downFiles.length == 0) {
      $.showError("请选择要下载的文件");
      return;
    }
    var type = "batch";
    var result = resolveDownInfo(type, downFiles);
    handleDownResult(result, type, downFiles, callback);
  }

  function pushDown(callback) {
    var downFiles = resolveAllChecked();
    if (downFiles.length == 0) {
      $.showError("请选择要下载的文件");
      return;
    }
    var type = "dlink";
    var result = resolveDownInfo(type, downFiles);
    handleDownResult(result, type, downFiles, callback);
  }

  function handleDownResult(result, type, downFiles, callback) {
    if (result.errno == 0) {
      callback(buildFileInfoByFsId(result.dlink || result.list, downFiles));
    } else if (result.errno == -20) {
      var vcode = getVcode();
      $.showVcodeDialog(
        vcode.img,
        function(vcodeInput) {
          //提交验证码
          var response = resolveDownInfo(
            type,
            downFiles,
            vcodeInput,
            vcode.vcode
          );
          if (response.errno == 0) {
            callback(
              buildFileInfoByFsId(response.dlink || response.list, downFiles)
            );
            return 1;
          } else if (response.errno == -20) {
            $.showError("验证码输入错误");
            return 2;
          } else if (result.errno == 121) {
            $.showError("获取压缩链接失败，文件数量过多");
          } else {
            $.showError("获取下载链接失败，错误码：" + result.errno);
          }
          return -1;
        },
        function() {
          vcode = getVcode();
          return vcode.img;
        }
      );
    } else if (result.errno == 112) {
      $.showError("页面过期，请刷新重试");
    } else if (result.errno == 121) {
      $.showError("获取压缩链接失败，文件数量过多");
    } else {
      $.showError("获取下载链接失败，错误码：" + result.errno);
    }
  }

  /**
   * 解析选中文件的下载相关信息
   */
  function resolveDownInfo(type, downFiles, vcodeInput, vcodeStr) {
    if (!downFiles || downFiles.length == 0) {
      return;
    }
    var result;
    if (!isShare()) {
      var params = {
        sign: getSign(),
        timestamp: yunData.timestamp,
        fidlist: getFidList(downFiles),
        type: type,
        channel: "chunlei",
        web: 1,
        app_id: 250528,
        bdstoken: yunData.MYBDSTOKEN,
        logid: getLogID(),
        clienttype: 0
      };
      $.ajax({
        url: "/api/download",
        async: false,
        method: "POST",
        data: params,
        success: function(response) {
          result = response;
        }
      });
    } else {
      var params = {
        encrypt: 0,
        product: "share",
        uk: yunData.SHARE_UK,
        primaryid: yunData.SHARE_ID,
        fid_list: getFidList(downFiles)
      };
      if (type == "batch") {
        params.type = type;
      }
      if (yunData.SHARE_PUBLIC != 1) {
        var seKey = decodeURIComponent(getCookie("BDCLND"));
        params.extra = "{" + '"sekey":"' + seKey + '"' + "}";
      }
      //带验证码
      if (vcodeInput && vcodeStr) {
        params.vcode_input = vcodeInput;
        params.vcode_str = vcodeStr;
      }
      $.ajax({
        url:
          "/api/sharedownload?channel=chunlei&clienttype=0&web=1&app_id=250528&sign=" +
          yunData.SIGN +
          "&timestamp=" +
          yunData.timestamp +
          "&bdstoken=" +
          yunData.MYBDSTOKEN +
          "&logid=" +
          getLogID(),
        async: false,
        method: "POST",
        data: params,
        success: function(response) {
          result = response;
        }
      });
    }
    return result;
  }

  /**
   * 解析选中所有文件的直链列表
   */
  function resolveAllChecked() {
    var downFiles = getDownFiles();
    var fileList = [];
    var dirList = [];
    for (var i = 0; i < downFiles.length; i++) {
      if (downFiles[i].isdir) {
        dirList.push(downFiles[i]);
      } else {
        fileList.push(downFiles[i]);
      }
    }
    for (var i = 0; i < dirList.length; i++) {
      resolvePathDeep(dirList[i].path, fileList);
    }
    return fileList;
  }

  /**
   * 解析文件夹下所有的文件和文件夹
   */
  function resolvePath(path) {
    var fileList;
    if (!isShare()) {
      var params = {
        dir: path,
        bdstoken: yunData.MYBDSTOKEN,
        logid: getLogID(),
        order: "size",
        desc: 0,
        clienttype: 0,
        showempty: 0,
        web: 1,
        channel: "chunlei",
        appid: 250528
      };
      $.ajax({
        url: "/api/list",
        async: false,
        method: "GET",
        data: params,
        success: function(response) {
          fileList = 0 === response.errno ? response.list : [];
        }
      });
    } else {
      if (path == "/") {
        fileList = yunData.FILEINFO;
      } else {
        var shareType = yunData.SHARE_PUBLIC === 1 ? "public" : "secret";
        var params = {
          uk: yunData.SHARE_UK,
          shareid: yunData.SHARE_ID,
          order: "other",
          desc: 1,
          showempty: 0,
          web: 1,
          dir: path,
          t: Math.random(),
          bdstoken: yunData.MYBDSTOKEN,
          channel: "chunlei",
          clienttype: 0,
          app_id: 250528,
          logid: getLogID()
        };
        $.ajax({
          url: "/share/list",
          method: "GET",
          async: false,
          data: params,
          success: function(response) {
            fileList = 0 === response.errno ? response.list : [];
          }
        });
      }
    }
    return fileList;
  }

  /**
   * 解析文件夹下所有的文件和文件夹，并进行递归执行
   */
  function resolvePathDeep(path, fileList) {
    var resFileList = resolvePath(path);
    if (resFileList && resFileList.length) {
      for (var i = 0; i < resFileList.length; i++) {
        var fileInfo = resFileList[i];
        if (fileInfo.isdir == 1) {
          //是目录的话继续递归遍历
          resolvePathDeep(fileInfo.path, fileList);
        } else {
          //文件的话加入文件列表
          fileList.push(fileInfo);
        }
      }
    }
  }

  function getSearchFileList() {
    var filelist = [];
    var params = {
      recursion: 1,
      order: "time",
      desc: 1,
      showempty: 0,
      web: 1,
      page: 1,
      num: 100,
      key: getSearchKey(),
      channel: "chunlei",
      app_id: 250528,
      bdstoken: yunData.MYBDSTOKEN,
      logid: getLogID(),
      clienttype: 0
    };
    $.ajax({
      url: "/api/search",
      async: false,
      method: "GET",
      data: params,
      success: function(response) {
        filelist = 0 === response.errno ? response.list : [];
      }
    });
    return filelist;
  }

  /**
   * 取验证码
   */
  function getVcode() {
    var result;
    var params = {
      prod: "pan",
      t: Math.random(),
      bdstoken: yunData.MYBDSTOKEN,
      channel: "chunlei",
      clienttype: 0,
      web: 1,
      app_id: 250528,
      logid: getLogID()
    };
    $.ajax({
      url: "/api/getvcode",
      method: "GET",
      async: false,
      data: params,
      success: function(response) {
        result = response;
      }
    });
    return result;
  }

  /**
   * 判断是分享页面还是个人页面
   */
  function isShare() {
    return window.location.href.indexOf("/disk/home") == -1;
  }

  /**
   * 匹配下载文件对应的信息
   */
  function buildFileInfoByFsId(linkList, downFiles) {
    if (linkList && linkList.length > 0) {
      if (downFiles.length == 1) {
        $.extend(
          Array.isArray(linkList) ? linkList[0] : linkList,
          downFiles[0]
        );
      } else {
        for (var i = 0; i < linkList.length; i++) {
          var index = downFiles.findIndex(function(downFile) {
            return linkList[i].fs_id == downFile.fs_id;
          });
          if (index != -1) {
            $.extend(linkList[i], downFiles[index]);
          }
        }
      }
    }
    return linkList;
  }

  function buildRequest(url) {
    return url
      ? {
          url: url,
          heads: {},
          body: ""
        }
      : null;
  }

  function getDefaultStyle(obj, attribute) {
    return obj.currentStyle
      ? obj.currentStyle[attribute]
      : document.defaultView.getComputedStyle(obj, false)[attribute];
  }

  function getCookie(e) {
    var o, t;
    var n = document,
      c = decodeURI;
    return n.cookie.length > 0 && ((o = n.cookie.indexOf(e + "=")), -1 != o)
      ? ((o = o + e.length + 1),
        (t = n.cookie.indexOf(";", o)),
        -1 == t && (t = n.cookie.length),
        c(n.cookie.substring(o, t)))
      : "";
  }

  function getLogID() {
    var name = "BAIDUID";
    var u =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/~！@#￥%……&";
    var d = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
    var f = String.fromCharCode;

    function l(e) {
      if (e.length < 2) {
        var n = e.charCodeAt(0);
        return 128 > n
          ? e
          : 2048 > n
            ? f(192 | (n >>> 6)) + f(128 | (63 & n))
            : f(224 | ((n >>> 12) & 15)) +
              f(128 | ((n >>> 6) & 63)) +
              f(128 | (63 & n));
      }
      var n =
        65536 + 1024 * (e.charCodeAt(0) - 55296) + (e.charCodeAt(1) - 56320);
      return (
        f(240 | ((n >>> 18) & 7)) +
        f(128 | ((n >>> 12) & 63)) +
        f(128 | ((n >>> 6) & 63)) +
        f(128 | (63 & n))
      );
    }

    function g(e) {
      return (e + "" + Math.random()).replace(d, l);
    }

    function m(e) {
      var n = [0, 2, 1][e.length % 3];
      var t =
        (e.charCodeAt(0) << 16) |
        ((e.length > 1 ? e.charCodeAt(1) : 0) << 8) |
        (e.length > 2 ? e.charCodeAt(2) : 0);
      var o = [
        u.charAt(t >>> 18),
        u.charAt((t >>> 12) & 63),
        n >= 2 ? "=" : u.charAt((t >>> 6) & 63),
        n >= 1 ? "=" : u.charAt(63 & t)
      ];
      return o.join("");
    }

    function h(e) {
      return e.replace(/[\s\S]{1,3}/g, m);
    }

    function p() {
      return h(g(new Date().getTime()));
    }

    function w(e, n) {
      return n
        ? p(String(e))
            .replace(/[+\/]/g, function(e) {
              return "+" == e ? "-" : "_";
            })
            .replace(/=/g, "")
        : p(String(e));
    }

    return w(getCookie(name));
  }

  function getPath() {
    var hash = location.hash;
    var regx = /(^|&|\/|\?)path=([^&]*)(&|$)/i;
    var result = hash.match(regx);
    return result && result.length > 2 ? decodeURIComponent(result[2]) : "/";
  }

  function getVmode() {
    var hash = location.hash;
    var regx = /(^|&|\/|\?)vmode=([^&]*)(&|$)/i;
    var result = hash.match(regx);
    return result && result.length > 2 ? result[2] : "list";
  }

  function getSearchKey() {
    var hash = location.hash;
    var regx = /(^|&|\/|\?)key=([^&]*)(&|$)/i;
    var result = hash.match(regx);
    return result && result.length > 2 ? decodeURIComponent(result[2]) : null;
  }

  function getFidList(list) {
    var fidlist = null;
    if (list.length === 0) {
      return null;
    }
    var fileidlist = [];
    $.each(list, function(index, element) {
      fileidlist.push(element.fs_id);
    });
    fidlist = "[" + fileidlist + "]";
    return fidlist;
  }

  function getSign() {
    var signFnc = new Function("return " + yunData.sign2)();
    return base64Encode(signFnc(yunData.sign5, yunData.sign1));
  }

  function base64Encode(t) {
    var a,
      r,
      e,
      n,
      i,
      s,
      o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (e = t.length, r = 0, a = ""; e > r; ) {
      if (((n = 255 & t.charCodeAt(r++)), r == e)) {
        a += o.charAt(n >> 2);
        a += o.charAt((3 & n) << 4);
        a += "==";
        break;
      }
      if (((i = t.charCodeAt(r++)), r == e)) {
        a += o.charAt(n >> 2);
        a += o.charAt(((3 & n) << 4) | ((240 & i) >> 4));
        a += o.charAt((15 & i) << 2);
        a += "=";
        break;
      }
      s = t.charCodeAt(r++);
      a += o.charAt(n >> 2);
      a += o.charAt(((3 & n) << 4) | ((240 & i) >> 4));
      a += o.charAt(((15 & i) << 2) | ((192 & s) >> 6));
      a += o.charAt(63 & s);
    }
    return a;
  }
})();
