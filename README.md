# Proxyee Down 扩展仓库

根目录下每个文件夹代表一个扩展，文件夹里必须包含一个`manifest.json`文件。

## manifest.json

通过这个文件来配置插件相关信息，例如：

```json
{
  "title": "百度云下载插件",
  "version": 0.1,
  "description": "可以直接获取下载链接并推送到Proxyee Down下载",
  "proxyWildcards": ["pan.baidu.com", "yun.baidu.com"],
  "contentScripts": [
    {
      "matches": ["^(pan|yun).baidu.com/disk/home.*$"],
      "scripts": ["util.js", "home.js"]
    },
    {
      "matches": ["^(pan|yun).baidu.com/(s/|share/link).*$"],
      "scripts": ["util.js", "share.js"]
    }
  ]
}
```

### title

扩展的名称

### version

扩展的版本号，当检测到有更大的版本号时，扩展就会提示更新。

### description

扩展的描述

### proxyWildcards

域名通配符，代理服务器会在指定的域名通配符中生效

### contentScripts

配置扩展注入 js 的条件，可以配置多个。

- matches

  当浏览器`url`匹配到这里的正则表达式时，就会将 js 注入至对应的页面。
- scripts

  当`matches`生效时，注入扩展目录下指定的 js 文件。

## 贡献插件

1. 首先 fork 此仓库
2. 创建一个插件目录
3. 编写`manifest.json`和脚本
4. 编写`README.md`文件
5. 提交 PR
