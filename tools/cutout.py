"""photo.jpg -> assets/me_cutout.png : cropped to head & chest, background removed, black & white, transparent PNG.

usage: python tools/cutout.py [photo.jpg] [assets/me_cutout.png]
Crop box is in fractions of the photo: x0 y0 x1 y1 (tweak CROP if you use another photo).
"""
import sys, os, cv2, numpy as np
import mediapipe as mp

src = sys.argv[1] if len(sys.argv) > 1 else "photo.jpg"
out = sys.argv[2] if len(sys.argv) > 2 else "assets/me_cutout.png"
CROP = (.36, .10, .66, .60)          # generous box around head + chest
OUT_H = 1500
FADE_FROM = .66                      # bottom of the picture fades out from here

os.makedirs(os.path.dirname(out), exist_ok=True)
img = cv2.imread(src, cv2.IMREAD_COLOR)
h, w = img.shape[:2]
x0, y0, x1, y1 = int(CROP[0] * w), int(CROP[1] * h), int(CROP[2] * w), int(CROP[3] * h)
img = img[y0:y1, x0:x1]
s = OUT_H / img.shape[0]
img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)

with mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0) as seg:
    prob = seg.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).segmentation_mask
prob = cv2.GaussianBlur(prob, (0, 0), 3)

# refine the edge with GrabCut, seeded by the segmentation
small = .5
im_s = cv2.resize(img, None, fx=small, fy=small, interpolation=cv2.INTER_AREA)
p_s = cv2.resize(prob, (im_s.shape[1], im_s.shape[0]))
gc = np.full(p_s.shape, cv2.GC_PR_BGD, np.uint8)
gc[p_s > .4] = cv2.GC_PR_FGD
gc[p_s > .9] = cv2.GC_FGD
gc[p_s < .05] = cv2.GC_BGD
bgm = np.zeros((1, 65), np.float64); fgm = np.zeros((1, 65), np.float64)
cv2.grabCut(im_s, gc, None, bgm, fgm, 5, cv2.GC_INIT_WITH_MASK)
m = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
m = cv2.resize(m, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
if n > 1:
    m = np.where(lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
m = cv2.GaussianBlur(m, (0, 0), 1.6)

g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
g = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(6, 6)).apply(g)
g = np.clip((g.astype(np.float32) - 128) * 1.15 + 122, 0, 255).astype(np.uint8)

rgba = np.dstack([g, g, g, m])
ys, xs = np.where(m > 20)
rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
H = rgba.shape[0]
yy = (np.arange(H, dtype=np.float32) / H)[:, None]
fade = np.clip((1 - yy) / (1 - FADE_FROM), 0, 1) ** 1.2
rgba[..., 3] = (rgba[..., 3] * fade).astype(np.uint8)
cv2.imwrite(out, rgba)
print(out, rgba.shape)
