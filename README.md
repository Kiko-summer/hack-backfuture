# hack-backfuture · 光墙探索

一个用 Three.js 制作的 3D 探索原型。穿过展厅的光墙，探索地下洞穴、收集能量电池，再沿两座发光圆盘走到对岸。

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
| [浮岛湖](http://127.0.0.1:8765/exploration.html?scene=jellyfish) | 直达湖边，试玩圆盘步行过湖 |
| [地下观测站](http://127.0.0.1:8765/exploration.html?scene=observatory) | 从湖对岸出发，穿过岩洞进入观测站 |
| [观测站实验室](http://127.0.0.1:8765/exploration.html?scene=observatory-room) | 从室内入口出发，启动仪器并收集电池 |
| [3D 模型资产工作台](http://127.0.0.1:8765/walk-workbench.html) | 查看模型和探索者步态 |

方向键步行和转向。按住 `E` 沿当前朝向奔跑，跑动中也可以用方向键转向。靠近金色收集点后，点击「取出电池」或按 `Q`。沿湖中的两个圆盘到对岸，再沿灯光进站。靠近右侧黄铜仪器，点击「启动仪器」或按 `Q`。仪器送出电池后，走到托盘前取出。

地面和岩壁贴图的来源见[素材来源](cave-assets/SOURCES.md)。

## 背景音乐

游戏加入约两分钟的原创循环配乐「深处的微光」，以柔和的钢琴、钟音与合成器和声配合探索场景。首次点击画面、使用移动按键或点击右下角「开启音乐」后开始播放。

右下角可开关音乐、调整音量，选择会保存在本机浏览器中。切到其他标签页时自动暂停，返回游戏后继续。配乐文件随项目保存，音乐播放不依赖外部音频服务。

配乐：[hi3d-deep-light.mp3](cave-assets/audio/hi3d-deep-light.mp3)。生成源码位于 [hi3d-compose-music.py](tools/hi3d-compose-music.py)，使用 Python、NumPy 与 FFmpeg，无第三方音频采样。
