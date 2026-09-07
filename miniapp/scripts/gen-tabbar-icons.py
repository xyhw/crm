"""生成 miniapp tabBar 图标。

微信小程序 tabBar 的 iconPath 只支持本地 PNG/JPG（不支持 SVG，也不支持 base64），
因此这里用 Pillow 以 4 倍超采样绘制线性图标后缩放，得到边缘平滑的 81x81 PNG。

用法：
    python3 scripts/gen-tabbar-icons.py

输出：src/static/tabbar/{name}.png 与 {name}-active.png
"""

from PIL import Image, ImageDraw

SIZE = 81
SS = 4  # 超采样倍数
CANVAS = SIZE * SS

INACTIVE = (122, 122, 122, 255)  # #7A7A7A 与 pages.json color 一致
ACTIVE = (4, 140, 71, 255)       # #048C47 与 pages.json selectedColor 一致

OUT_DIR = "src/static/tabbar"


def new_canvas():
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def px(v):
    """把 0-100 的设计坐标映射到超采样画布。"""
    return v / 100 * CANVAS


def stroke():
    return max(1, int(px(7)))


def draw_home(d, color):
    w = stroke()
    # 屋顶
    d.line([(px(18), px(48)), (px(50), px(20)), (px(82), px(48))], fill=color, width=w, joint="curve")
    # 墙体
    d.line([(px(27), px(46)), (px(27), px(80))], fill=color, width=w)
    d.line([(px(73), px(46)), (px(73), px(80))], fill=color, width=w)
    d.line([(px(27), px(80)), (px(73), px(80))], fill=color, width=w)
    # 门
    d.rectangle([px(42), px(58), px(58), px(80)], outline=color, width=w)


def draw_hall(d, color):
    """大厅：宫格，表示商机列表。"""
    w = stroke()
    for cx in (px(30), px(64)):
        for cy in (px(30), px(64)):
            half = px(13)
            d.rectangle([cx - half, cy - half, cx + half, cy + half], outline=color, width=w)


def draw_publish(d, color):
    """发布：圆形加号。"""
    w = stroke()
    d.ellipse([px(16), px(16), px(84), px(84)], outline=color, width=w)
    d.line([(px(50), px(33)), (px(50), px(67))], fill=color, width=w)
    d.line([(px(33), px(50)), (px(67), px(50))], fill=color, width=w)


def draw_crm(d, color):
    """CRM：人物 + 卡片，表示客户管理。"""
    w = stroke()
    d.ellipse([px(36), px(18), px(64), px(46)], outline=color, width=w)
    d.arc([px(22), px(50), px(78), px(96)], start=180, end=360, fill=color, width=w)
    d.line([(px(22), px(76)), (px(78), px(76))], fill=color, width=w)


def draw_mine(d, color):
    """我的：头像轮廓。"""
    w = stroke()
    d.ellipse([px(14), px(14), px(86), px(86)], outline=color, width=w)
    d.ellipse([px(38), px(30), px(62), px(54)], outline=color, width=w)
    d.arc([px(28), px(58), px(72), px(96)], start=180, end=360, fill=color, width=w)


ICONS = {
    "home": draw_home,
    "hall": draw_hall,
    "publish": draw_publish,
    "crm": draw_crm,
    "mine": draw_mine,
}


def render(name, painter, color, suffix=""):
    img, d = new_canvas()
    painter(d, color)
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    path = f"{OUT_DIR}/{name}{suffix}.png"
    img.save(path, "PNG", optimize=True)
    return path


def main():
    for name, painter in ICONS.items():
        print("generated", render(name, painter, INACTIVE))
        print("generated", render(name, painter, ACTIVE, "-active"))


if __name__ == "__main__":
    main()
