"""Render the narrated, fully animated Dynomap pipeline explainer.

Usage: build_explainer_video.py ASSET_DIRECTORY OUTPUT_MP4 NARRATION_AUDIO
The voice track is prepared by ``build_voiceover.py``. No manuscript figures
are used in the animation; reported performance values are manuscript values.
"""

from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg


WIDTH, HEIGHT, FPS = 1280, 720, 24
INK, PAPER, ACCENT, BLUE, GOLD, SOFT = "#071936", "#f8f5ef", "#a83f35", "#476d89", "#b38536", "#465262"
FEATURES = ["NKX2-1", "EGFR", "SOX9", "MSLN", "TFF2", "TFF1", "PRSS3", "CFTR", "PON1", "SFTPC", "GPC1", "AIF1"]
VALUES = [.86, .72, .78, .62, .22, .30, .58, .49, .20, .26, .47, .18]
GATES = [.93, .88, .84, .79, .71, .67, .64, .57, .38, .35, .31, .28]
COLORS = [ACCENT, ACCENT, GOLD, ACCENT, BLUE, BLUE, GOLD, ACCENT, BLUE, BLUE, GOLD, BLUE]
TARGETS = [(760,225),(845,275),(700,290),(790,355),(430,235),(380,300),(680,405),(620,350),(460,405),(515,275),(650,490),(410,485)]
SCENES = [
    (14, "THE REPRESENTATION PROBLEM", "Biomedical tables contain measurements, but their columns have no meaningful geometry.", "Reordering columns changes the picture, not the biology."),
    (12, "1 / GATE", "Dynomap learns which measurements to amplify or suppress.", "Feature identity is preserved."),
    (18, "2 / PLACE", "Prediction error moves every feature through a continuous two-dimensional space.", "Task-relevant neighborhoods emerge during training."),
    (14, "3 / RENDER", "Gated values are painted with differentiable Gaussian kernels.", "One shared topology; a different map for every sample."),
    (14, "4 / READ", "A vision branch detects local patterns in the rendered map.", "The image and gated-vector branches are optimized together."),
    (16, "5 / ATTRIBUTE", "The prediction returns to named source features on the learned topology.", "Integrated Gradients in the manuscript; Gradient SHAP in the web analysis."),
    (18, "EVIDENCE", "High discrimination across liquid-biopsy cohorts and RNA carriers.", "Inspect 59 saved analyses or retrain Dynomap on your table."),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for path in [Path("C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf")]:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines, current = [], ""
    for word in text.split():
        candidate = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), candidate, font=face)[2] <= width:
            current = candidate
        else:
            lines.append(current); current = word
    if current: lines.append(current)
    return lines


def base(scene: int, progress: float) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    frame = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(frame, "RGBA")
    draw.rectangle((0,0,WIDTH,70), fill="#ffffff")
    draw.ellipse((42,25,60,43), fill=ACCENT); draw.ellipse((60,31,68,39), fill=GOLD); draw.ellipse((50,42,58,50), fill=BLUE)
    draw.text((78,22), "Islam Lab", font=font(24,True), fill=INK)
    draw.text((1080,24), "DYNOMAP", font=font(17,True), fill=ACCENT)
    duration, eyebrow, title, body = SCENES[scene]
    draw.text((54,94), eyebrow, font=font(17,True), fill=ACCENT)
    y=127
    for line in wrap(draw,title,font(39,True),1160)[:2]: draw.text((54,y),line,font=font(39,True),fill=INK); y+=46
    draw.rectangle((0,620,WIDTH,HEIGHT), fill=(255,255,255,244)); draw.rectangle((0,620,8,HEIGHT), fill=ACCENT)
    draw.text((42,642), body, font=font(24), fill=SOFT)
    elapsed=sum(item[0] for item in SCENES[:scene])+duration*progress
    draw.rectangle((0,714,int(WIDTH*elapsed/sum(item[0] for item in SCENES)),720), fill=ACCENT)
    return frame, draw


def table(draw: ImageDraw.ImageDraw, x: int, y: int, gate_progress: float = 0.0, shuffled: float = 0.0) -> None:
    draw.rounded_rectangle((x,y,x+300,y+355), radius=6, fill="#ffffff", outline="#d9d6ce", width=2)
    draw.text((x+18,y+14), "feature", font=font(14,True), fill=SOFT); draw.text((x+198,y+14), "value", font=font(14,True), fill=SOFT)
    for index,(name,value,gate,color) in enumerate(zip(FEATURES,VALUES,GATES,COLORS)):
        row=index
        if shuffled>.5: row=(index*5)%len(FEATURES)
        yy=y+48+row*24
        draw.rectangle((x+12,yy-13,x+286,yy+8), fill="#f5f3ee" if row%2 else "#faf9f6")
        draw.text((x+20,yy-10),name,font=font(13,index<4),fill=SOFT)
        draw.rectangle((x+173,yy-5,x+253,yy+3),fill="#dfdbd2")
        draw.rectangle((x+173,yy-5,x+173+int(80*value*((1-gate_progress)+gate_progress*gate)),yy+3),fill=color)
        if gate_progress>0: draw.ellipse((x+266,yy-9,x+278,yy+3),fill=color+(hex(int(50+205*gate_progress*gate))[2:].zfill(2)))


def layout(draw: ImageDraw.ImageDraw, progress: float, trails: bool = True, labels: bool = False) -> None:
    starts=[(390+(i%4)*98,235+(i//4)*104) for i in range(len(FEATURES))]
    for index,(start,target,color,gate) in enumerate(zip(starts,TARGETS,COLORS,GATES)):
        p=ease(progress); x=start[0]+(target[0]-start[0])*p; y=start[1]+(target[1]-start[1])*p
        if trails and progress>.02:
            draw.line((start[0],start[1],x,y),fill=color+"38",width=2)
        radius=5+int(7*gate); draw.ellipse((x-radius,y-radius,x+radius,y+radius),fill=color+"dd")
        if labels and index<7:
            draw.line((x+radius,y,x+radius+13,y-10),fill="#707a86",width=1); draw.text((x+radius+16,y-24),FEATURES[index],font=font(15,True),fill=INK)


def painted_map(draw: ImageDraw.ImageDraw, progress: float, scan: float = 0.0) -> None:
    x0,y0,x1,y1=375,215,900,560
    draw.rounded_rectangle((x0,y0,x1,y1),radius=6,fill="#ffffff",outline="#d9d6ce",width=2)
    for grid in range(1,7):
        gx=x0+grid*(x1-x0)/7; gy=y0+grid*(y1-y0)/7
        draw.line((gx,y0,gx,y1),fill="#ece8df",width=1);draw.line((x0,gy,x1,gy),fill="#ece8df",width=1)
    if progress>0:
        for (x,y),value,gate,color in zip(TARGETS,VALUES,GATES,COLORS):
            mx=x0+(x-350)/570*(x1-x0); my=y0+(y-200)/340*(y1-y0); maxr=int((28+45*value*gate)*progress)
            for radius in range(maxr,3,-5):
                alpha=int(6+38*(1-radius/max(1,maxr))); draw.ellipse((mx-radius,my-radius,mx+radius,my+radius),fill=color+hex(alpha)[2:].zfill(2))
            draw.ellipse((mx-5,my-5,mx+5,my+5),fill=color+"cc")
    if scan>0:
        sx=x0+int((x1-x0-92)*scan); draw.rectangle((sx,y0+105,sx+92,y0+197),outline=INK,width=4);draw.rectangle((sx,y0+105,sx+92,y0+197),fill="#07193612")


def render(scene: int, progress: float) -> Image.Image:
    frame,draw=base(scene,progress)
    if scene==0:
        table(draw,88,220,0,0 if progress<.45 else 1); draw.text((440,300),"same values",font=font(28,True),fill=INK);draw.text((440,345),"different column order",font=font(28,True),fill=ACCENT);draw.line((420,390,1040,390),fill="#d9d6ce",width=2);draw.text((440,420),"No locality for a vision model to exploit",font=font(24),fill=SOFT)
    elif scene==1:
        table(draw,82,220,ease(progress),0); draw.text((430,255),"Feature gate",font=font(31,True),fill=INK)
        for i,(name,gate,color) in enumerate(zip(FEATURES[:7],GATES[:7],COLORS[:7])):
            yy=305+i*34;draw.text((430,yy),name,font=font(16,True),fill=SOFT);draw.rectangle((535,yy+2,885,yy+15),fill="#e2ded5");draw.rectangle((535,yy+2,535+int(350*gate*ease(progress)),yy+15),fill=color)
        draw.text((925,305),"amplify",font=font(18,True),fill=ACCENT);draw.text((925,340),"suppress",font=font(18,True),fill=BLUE)
    elif scene==2:
        layout(draw,progress,True,progress>.72); draw.text((925,260),"gradient",font=font(20,True),fill=ACCENT);draw.text((925,292),"from prediction",font=font(20,True),fill=ACCENT);draw.line((915,320,820,360),fill=ACCENT,width=3)
    elif scene==3:
        painted_map(draw,ease(progress)); draw.text((940,275),"value",font=font(18,True),fill=INK);draw.text((940,310),"x coordinate",font=font(18,True),fill=INK);draw.text((940,345),"y coordinate",font=font(18,True),fill=INK);draw.text((940,380),"Gaussian width",font=font(18,True),fill=INK)
    elif scene==4:
        painted_map(draw,1,ease(progress)); draw.rounded_rectangle((960,270,1190,475),radius=8,fill="#ffffff",outline="#d9d6ce",width=2);draw.text((995,300),"vision branch",font=font(22,True),fill=INK);draw.text((995,345),"local texture",font=font(18),fill=SOFT);draw.text((995,380),"shared filters",font=font(18),fill=SOFT);draw.text((995,415),"hierarchical patterns",font=font(18),fill=SOFT)
    elif scene==5:
        layout(draw,1,False,True); draw.rounded_rectangle((925,230,1190,500),radius=8,fill="#ffffff",outline="#d9d6ce",width=2);draw.text((955,260),"Top attribution",font=font(22,True),fill=INK)
        for i,(name,gate,color) in enumerate(zip(FEATURES[:6],GATES[:6],COLORS[:6])):
            yy=310+i*31;draw.text((955,yy),name,font=font(15,True),fill=SOFT);draw.rectangle((1045,yy+2,1160,yy+11),fill="#e5e1d8");draw.rectangle((1045,yy+2,1045+int(115*gate*ease(progress)),yy+11),fill=color)
    else:
        cards=[("0.835-0.982","pooled AUROC","10 donor-disjoint liquid-biopsy tasks"),("93%","accuracy","RARE-Seq cancer versus control"),("92%","accuracy","five-class subtype, 622-gene panel")]
        for i,(value,label,body) in enumerate(cards):
            x=60+i*400;draw.rounded_rectangle((x,235,x+360,485),radius=8,fill="#ffffff",outline="#d9d6ce",width=2);draw.text((x+28,270),value,font=font(54,True),fill=ACCENT if i==0 else INK);draw.text((x+30,342),label.upper(),font=font(15,True),fill=SOFT);draw.text((x+30,385),body,font=font(17),fill=SOFT)
        draw.text((350,540),"59 saved analyses  |  app.islamlab.org/dynomap",font=font(27,True),fill=INK)
    return frame


def write_vtt(path: Path) -> None:
    def stamp(seconds: int) -> str: return f"00:{seconds//60:02d}:{seconds%60:02d}.000"
    lines=["WEBVTT",""]; elapsed=0
    for index,(duration,_,title,body) in enumerate(SCENES,1):
        lines.extend([str(index),f"{stamp(elapsed)} --> {stamp(elapsed+duration)}",f"{title} {body}",""]);elapsed+=duration
    path.write_text("\n".join(lines),encoding="utf-8")


def main() -> None:
    if len(sys.argv)!=4: raise SystemExit("Expected ASSET_DIRECTORY OUTPUT_MP4 NARRATION_AUDIO")
    assets,output,audio=Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]);output.parent.mkdir(parents=True,exist_ok=True)
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();command=[ffmpeg,"-y","-f","rawvideo","-vcodec","rawvideo","-pix_fmt","rgb24","-s",f"{WIDTH}x{HEIGHT}","-r",str(FPS),"-i","-","-i",str(audio),"-c:v","libx264","-preset","medium","-crf","22","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-movflags","+faststart",str(output)]
    process=subprocess.Popen(command,stdin=subprocess.PIPE);assert process.stdin is not None;first=None
    for scene,(duration,*_) in enumerate(SCENES):
        for index in range(duration*FPS):
            frame=render(scene,index/max(1,duration*FPS-1));first=first or frame.copy();process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait()!=0: raise RuntimeError("ffmpeg failed")
    assert first is not None;first.save(assets/"dynomap-demo-poster.jpg",quality=91,optimize=True);write_vtt(assets/"dynomap-demo-captions.vtt")
    print(f"wrote {output} ({sum(item[0] for item in SCENES)} seconds, narrated and captioned)")


if __name__=="__main__": main()
