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
      '        <a data-menu-id="pd-direct" class="g-button-menu " href="javascript:;">直链下载</a>' +
      '        <a data-menu-id="pd-batch" class="g-button-menu " href="javascript:;">压缩链接下载</a>' +
      '        <a data-menu-id="pd-push" class="g-button-menu " href="javascript:;">批量推送下载</a>' +
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
      directDown(function(result) {
        console.log(result);
      });
    });
    //压缩链接下载，支持单文件和多文件，有最大文件数量下载限制
    $(document).on("click", "a[data-menu-id=pd-batch]", function() {
      $(this)
        .parents("span.g-dropdown-button")
        .removeClass("button-open");
      batchDown(function(result) {
        console.log(result);
      });
    });
    //直接推送下载，把选中的文件全部解析成直链，推送到Proxyee Down下载
    $(document).on("click", "a[data-menu-id=pd-push]", function() {
      $(this)
        .parents("span.g-dropdown-button")
        .removeClass("button-open");
      pushDown(function(result) {
        console.log(result);
      });
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
   * 通过API或取当前页面的信息
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
    $.each(checkedFiles, function(i, checked) {
      $.each(PAGE_INFO.fileList, function(j, file) {
        if (file.server_filename == checked) {
          checkedFileList.push(fileInfoConv(file));
          return false;
        }
      });
    });
    //}
    return checkedFileList;
  }

  function directDown(callback) {
    var downFiles = getDownFiles();
    if (downFiles.length == 0) {
      alert("请选择要下载的文件");
      return;
    }
    if (
      downFiles.length > 1 ||
      (downFiles.length == 1 && downFiles[0].isdir == 1)
    ) {
      alert("直链下载只支持单个文件");
      return;
    }
    var type = "dlink";
    var result = resolveDownInfo(type, downFiles);
    handleDownResult(result, type, downFiles, callback);
  }

  function batchDown(callback) {
    var downFiles = getDownFiles();
    if (downFiles.length == 0) {
      alert("请选择要下载的文件");
      return;
    }
    var type = "batch";
    var result = resolveDownInfo(type, downFiles);
    handleDownResult(result, type, downFiles, callback);
  }

  function pushDown(callback) {
    var downFiles = resolveAllChecked();
    if (downFiles.length == 0) {
      alert("请选择要下载的文件");
      return;
    }
    var type = "dlink";
    var result = resolveDownInfo(type, downFiles);
    handleDownResult(result, type, downFiles, callback);
  }

  function handleDownResult(result, type, downFiles, callback) {
    if (result.errno == 0) {
      callback(result);
      return;
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
            callback(response);
            return 1;
          } else if (response.errno == -20) {
            alert("验证码输入错误");
            return 2;
          }
          return -1;
        },
        function() {
          vcode = getVcode();
          return vcode.img;
        }
      );
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
        method: "GET",
        data: params,
        success: function(response) {
          result = response;
        }
      });
    } else {
      var params = {
        type: type,
        sign: yunData.SIGN,
        timestamp: yunData.timestamp,
        bdstoken: yunData.MYBDSTOKEN,
        channel: "chunlei",
        clienttype: 0,
        web: 1,
        app_id: 250528,
        logid: getLogID(),
        encrypt: 0,
        product: "share",
        uk: yunData.SHARE_UK,
        primaryid: yunData.SHARE_ID,
        fid_list: getFidList(downFiles)
      };
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
        url: "/api/sharedownload",
        async: false,
        method: "GET",
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
      if (path == "/" && yunData.FILEINFO.length == 1) {
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
          fileList.push(fileInfoConv(fileInfo));
        }
      }
    }
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

  function getDefaultStyle(obj, attribute) {
    return obj.currentStyle
      ? obj.currentStyle[attribute]
      : document.defaultView.getComputedStyle(obj, false)[attribute];
  }

  function fileInfoConv(file) {
    return {
      filename: file.server_filename,
      path: file.path,
      fs_id: file.fs_id,
      isdir: file.isdir
    };
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
