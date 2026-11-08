# hack-backfuture · 光墙探索

一个用 Three.js 制作的 3D 探索原型。穿过展厅的光墙，探索地下洞穴、收集能量电池，再踩着发光水母跳到对岸。

## 本地试玩

在仓库目录运行以下命令，然后用支持 WebGL 的浏览器打开入口。页面通过 jsDelivr 加载 Three.js，启动时需要联网。

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

| 入口 | 用途 |
| --- | --- |
| [完整游戏](http://127.0.0.1:8765/exploration.html) | 从展厅出发 |
| [洞穴](http://127.0.0.1:8765/exploration.html?scene=cave) | 从地下生态站入口出发 |
| [电池拾取](http://127.0.0.1:8765/exploration.html?scene=battery) | 直达苔藓机器人旁 |
| [水母湖](http://127.0.0.1:8765/exploration.html?scene=jellyfish) | 直达湖边，试玩水母跳跃 |
| [3D 模型资产工作台](http://127.0.0.1:8765/walk-workbench.html) | 查看模型和探索者步态 |

方向键移动或调整朝向。靠近金色收集点后，点击「取出电池」或按 `E`。在水母湖对准高亮落点后按空格跳跃。

地面和岩壁贴图的来源见[素材来源](cave-assets/SOURCES.md)。
