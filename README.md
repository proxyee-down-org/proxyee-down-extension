# Proxyee Down扩展仓库
根目录下每个文件夹代表一个扩展，文件夹里必须包含一个`manifest.json`文件。

## manifest.json
通过这个文件来配置插件相关信息，例如：
```json
{
  "title": "百度云盘下载插件",
  "version": 0.1,
  "description": "可以直接获取下载链接并推送到Proxyee Down下载",
  "contentScripts": [
    {
      "domains": ["pan.baidu.com", "yun.baidu.com"],
      "matches": ["^(pan|yun).baidu.com/disk/home.*$"],
      "scripts": ["util.js", "home.js"]
    },
    {
      "domains": ["pan.baidu.com", "yun.baidu.com"],
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
### contentScripts
配置扩展注入js的条件，可以配置多个。
- domains
  表示下载器代理配置的域名通配符。
- matches
  当浏览器`url`匹配到这里的正则表达式时，就会将js注入至对应的页面。
- scripts
  当`matches`生效时，注入扩展目录下指定的js文件。