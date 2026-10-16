# dsh-glass-opaque-fix

让被液态玻璃主题「玻璃化」的浮层恢复正常的不透明背景。

一个可照抄的样板：**改一处选择器**，就能修好另一个插件与玻璃主题的兼容问题。

> 本项目由 DeepSeek Harness 的 AI 智能体开发。

---

## 一、问题是什么

液态玻璃主题插件（`dsh-plugin-wallpaper-engine`）实现「透出壁纸」的方式，是**改写宿主自己的背景别名**。

它的样式表里有一组 `body[data-we-glass-page]` 规则，把宿主的

```
--dsw-alias-bg-layer-1
--dsw-alias-bg-layer-2
--dsw-alias-bg-layer-3
```

重新映射成由 `color-mix(…, transparent)` 合成的**半透明膜**。

**这是主题的正当设计** —— 壁纸正是从这些膜下面透出来的。

**但它是一个全局改动。** 任何**用这些别名画面板**的插件，都会**跟着一起变半透明** —— 哪怕那个插件跟壁纸毫无关系。

### 后果

| 现象 | 说明 |
|---|---|
| 浮窗/弹窗变半透明 | 文字压在壁纸上，难以阅读 |
| **插件里没有开关可调** | 因为那个插件是按「宿主别名本来不透明」写的 |
| 用户无解 | 只能二选一：要么关壁纸，要么忍受看不清 |

**这不是谁的 bug，是两个正确设计撞在一起的结果。** 本仓库负责收尾。

---

## 二、为什么改主题或改插件的设置都没用

我们实测过两条最直觉的路径，**都走不通**。

### 路径一：找主题的「浮层不透明度」设置

`dsh-plugin-wallpaper-engine` **确实有**「浮层玻璃 · 玻璃透明度」这个设置项（`浮层玻璃·独立配置` / `Popover glass · glass opacity`）。

**但它管不到第三方浮层。** 它的选择器只有三类：

```
body[data-we-glass-floaters] [data-install-registry]    ← DSH 官方安装注册面板
body[data-we-glass-floaters] .we-update-notice           ← 主题自己的更新提示
body[data-we-glass-floaters] .we-repo-panel              ← 主题自己的壁纸仓库
```

全是 `we-` 前缀的自家组件，或官方组件。**没有 `[role=dialog]`、没有任何通用匹配** —— 所以第三方浮层不在它管辖范围内。

而且那条滑块在数学上也**到不了不透明**：

```js
// wallpaper-engine 1.3.3
const glassAlpha = Math.max(0.10, 0.25 - (selection.glassAlpha / 100) * 0.15);
```

| 滑块 | alpha | 效果 |
|---|---|---|
| 0 | **0.25** | 最「实」，**但仍 25% 透明** |
| 100 | 0.10 | 最透 |

**下限锁死在 0.25** —— 这是主题的可读性铁律，不是配置失误。

### 路径二：改被影响插件的文件

我们最初的做法，是把一条 CSS 规则**打进主题插件的 bundle**：

```css
/* 曾经这样修过，现已失效 */
body[data-we-glass-page] .cm-stat-dialog { background: var(--we-panel-color) !important; }
```

**它撑到主题下一次更新就没了** —— 实测 `1.3.2 → 1.3.3` 把这条规则整个抹掉，浮层重新变半透明。

**为什么必然如此**：冲突的两边都是**第三方插件**，**两边都会更新**。

| 补丁位置 | 谁更新会抹掉它 |
|---|---|
| 主题插件的 `lib/client.js` | **主题**更新 |
| 被影响插件的文件 | **被影响插件**更新 |

**所以正确的做法是第三个位置：你自己的插件。** 它不属于任何一方，没人会覆盖它。

---

## 三、修复原理

三步，**每一步都不能少**。

### 第 1 步：用不会被改写的颜色变量

```
❌ var(--dsw-alias-bg-layer-1)     ← 正是被主题改成半透明膜的那个
✅ var(--dsw-static-neutral-bluish-00)   ← 主题从不赋值，天然不透明
✅ var(--dsw-static-neutral-bluish-875)  ← 深色版本
✅ var(--we-panel-color)                 ← 主题基于上面两个定义，色调更协调
```

**实测依据**：在 `wallpaper-engine 1.3.3` 的 bundle 里搜索这两个 `--dsw-static-neutral-bluish-*`，**赋值次数为 0** —— 主题不碰它们。

所以它们是**构造上就不透明**的，装不装壁纸都可靠。

本插件用的表达式：

```css
background: var(--we-panel-color, var(--dsw-static-neutral-bluish-00, #ffffff)) !important;
```

优先用主题的面板色（与周围玻璃同色调），主题不在时退回静态中性色。

### 第 2 步：加 `!important`

**这是必需的，不是习惯性写法。**

主题的令牌映射挂在 `body[data-we-glass-page]` 下，**作用域优先级高于一个裸的 class 选择器**。不加 `!important` 压不过它。

### 第 3 步：父与子一起写

如果浮层有独立的头部/主体，**它们也要列上**：

```css
.cm-stat-dialog,
.cm-stat-dialog .cm-stat-dialog-head,
.cm-stat-dialog .cm-stat-dialog-body {
  background: … !important;
}
```

**原因**：子元素自己的 `background` 会盖在父元素之上。只给父元素设不透明，子元素那块**仍会是半透明的** —— 表现为面板上一条条透光的带。

---

## 四、怎么用它修另一个插件（给 AI 的操作指南）

**整个流程改动的只有一处：`client.js` 里的 `RECIPES` 数组。**

### 步骤

```
① 打开那个半透明的浮窗
② DevTools → Elements → 点选该浮窗 → 读它的 class 属性
③ 把类名加进 client.js 的 RECIPES（形如 '.that-class'）
④ 重启 DSH（改动 client.js 需要重启才加载）
⑤ 复查：浮窗应不再透出壁纸
⑥ 若头部/主体仍透光 → 把子元素选择器也加进去
```

### 要改的那一处

`client.js` 顶部：

```js
const RECIPES = [
  {
    id: 'cost-meter',
    plugin: 'dsh-cost-meter',
    note: '费用明细 dialog。已验证 1.8.32。',
    selectors: [
      '.cm-stat-dialog',
      '.cm-stat-dialog .cm-stat-dialog-head',
      '.cm-stat-dialog .cm-stat-dialog-body',
    ],
  },
  // ← 在这里加新条目
  // {
  //   id: 'some-plugin',
  //   plugin: 'dsh-some-plugin',
  //   note: '设置弹窗；选择器取自 DevTools。',
  //   selectors: ['.some-dialog'],
  // },
];
```

### 怎么找到正确的选择器

| 目标 | 做法 |
|---|---|
| 定位浮窗元素 | DevTools → 左上角「选择元素」图标 → 点浮窗 |
| 读类名 | 看 `class="…"` 属性，优先选**最外层**那个面板元素 |
| 确认它真的透光 | DevTools → Computed → 看 `background-color` 的 alpha 是否小于 1 |
| 确认生效 | 加完规则后，看 computed 里 `background-color` 是否变成不透明 |

### 排查：加了规则但没效果

按顺序查这三条：

| 检查 | 方法 |
|---|---|
| **样式注入成功了吗** | DevTools → Elements → 搜 `style[data-plugin-css="dsh-glass-opaque-fix"]`，应能找到 |
| **选择器匹配到了吗** | 在 Console 里跑 `document.querySelectorAll('.你的选择器').length`，应 ≥ 1 |
| **优先级够吗** | 看 computed 的 `background-color` 值旁有没有被划掉（划掉说明被别的规则赢了） |

---

## 五、已收录的修复用例

| 插件 | 浮层 | 选择器 | 验证状态 |
|---|---|---|---|
| [`dsh-cost-meter`](https://github.com/) | 费用明细 dialog | `.cm-stat-dialog` + `.cm-stat-dialog-head` + `.cm-stat-dialog-body` | ✅ **实际使用中**（1.8.32） |

**关于验证状态的诚实说明**：✅ 表示这条配方在开发机上**实际解决了问题**。其他条目若由他人补充，请在 `note` 里写清验证到哪个版本 —— **本仓库的价值在于配方可靠**，一条没验证过的选择器比没有更糟。

### 为什么点名这些插件

因为**不点名就没法照抄** —— 「某个插件的某个浮窗」这种描述，AI 和人都无法定位到具体选择器。

**这些插件都没有错。** 半透明是玻璃主题的全局作用域导致的，被影响的插件只是按宿主的正常语义写了样式。本仓库做的是**在第三个位置收尾**，而不是指出谁的缺陷。

---

## 六、安装

### 方式一：本地目录（开发/自用推荐）

1. 克隆或用本地副本，放到任意目录
2. 在 profile 的 `package.json` 里加两处：

```jsonc
{
  "dependencies": {
    "dsh-glass-opaque-fix": "link:A:/你的路径/dsh-glass-opaque-fix"
  },
  "dsh": {
    "profile": {
      "bundles": [
        // …
        "dsh-glass-opaque-fix"
      ]
    }
  }
}
```

3. 在 `profile/node_modules/` 下建目录链接（Windows 用 Junction）：

```cmd
mklink /J "C:\Users\<你>\.dsh\profiles\desktop\node_modules\dsh-glass-opaque-fix" "A:\你的路径\dsh-glass-opaque-fix"
```

4. **重启 DSH**

### 方式二：复制一个配方，不用装插件

如果你只想修**一个**插件、也不想装东西：

1. 读第四节，找到选择器
2. 把那段 CSS 加进**你自己已有的某个插件**里
3. 或直接加进任意会被加载的样式表

**代价**：以后主题或那个插件更新时，你可能要重新加一遍 —— 这正是本插件把规则独立出来的原因。

### 环境要求

| 依赖 | 要求 |
|---|---|
| DSH | 能加载 `dsh.client` 插件的版本 |
| 主题插件 | 可选。没装玻璃主题时，本插件不产生可见变化（规则仍注入，但底色本来就是不透明的） |

**无需第三方依赖，无构建步骤。**

---

## 七、设计取舍

- **只加规则，不改别人的文件。** 这是它能活过插件更新的**唯一原因**。任何"顺手改一下主题插件"的做法都会回到原来的困境。
- **配方集中在 `RECIPES` 数组里。** 要改的地方只有一处，且改了哪条一目了然 —— 而不是散在几百行 CSS 里。
- **用 `ctx.effect` 绑定生命周期。** 卸载插件时样式随之移除。一个**已删除却仍在改页面**的插件，比它修的问题更糟。
- **没有配方时不注入空 `<style>`。** 空节点只会给日后排查的人添一个疑点。
- **`note` 字段是给人/AI 读的，代码不用它。** 但它必须准确 —— 本仓库的用途就是"照抄一条能用的配方"。
- **宁可不生效，不能加载失败。** 取不到 `document`、或 `ctx.effect` 不存在时，安静退出。DSH 的加载是全有或全无的，为一条装饰性规则把整个客户端拖垮不值得。

---

## 八、已知边界

| 边界 | 说明 |
|---|---|
| **改选择器需要重启** | `client.js` 在启动时加载，改完必须重启 DSH |
| **类名变了就失效** | 被修插件若重命名浮窗的 class，配方失效 —— 按第四节重新取一次选择器即可 |
| **只处理背景** | 本插件只设 `background`。若浮层的**边框/阴影/文字**也受玻璃影响，需另加规则 |
| **不是通用玻璃开关** | 它只对**列在 `RECIPES` 里**的选择器生效，不做全局兜底 |

**为什么不做全局兜底**（比如把所有 `[role=dialog]` 都设不透明）：那样会**覆盖掉主题本来正常工作的面板**（主题自己的设置窗、壁纸仓库等），把用户想要的效果也一起关掉。**精确列出目标**是有意的取舍。

---

## 九、贡献

**欢迎补充配方**，尤其是：

- 你在别的插件上遇到的同类半透明问题
- 验证过的选择器（请在 `note` 里写明**插件版本**）

**提交要求**：

1. 只改 `RECIPES` 里的对应条目（或新增条目）
2. `note` 必须写明：**哪个浮窗** + **验证到哪个版本**
3. 说明你的验证方法（DevTools 里看到什么）

**不接受**：把补丁打进主题或被修插件文件的方案 —— 那正是本仓库要避免的做法。

---

## 许可证

MIT
