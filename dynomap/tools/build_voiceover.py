"""Create scene-aligned neural narration for the Dynomap explainer."""

from __future__ import annotations

import asyncio
import subprocess
import sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg


SEGMENTS = [
    (14, "Biomedical tables are rich in information, but their columns do not come with a meaningful geometry. Reordering the columns changes their visual arrangement, even though the biology is unchanged."),
    (12, "Dynomap begins with a trainable feature gate. It learns which measurements should be amplified or suppressed, while retaining each feature's identity."),
    (18, "Each feature also receives a continuous two-dimensional coordinate. During training, prediction error sends gradients back through the model, causing coordinates to move. Features that support useful local interactions can settle into shared neighborhoods."),
    (14, "For every sample, Dynomap paints the gated values at these coordinates using differentiable Gaussian kernels. The topology is shared, but the intensities are sample specific."),
    (14, "A convolutional vision branch reads local texture from this map. Its representation is combined with the gated vector branch, and the complete system is optimized end to end."),
    (16, "Interpretation returns the prediction to named source features. Important genes or clinical variables can be shown directly on the learned map, using Integrated Gradients in the manuscript and Gradient SHAP in the web analysis."),
    (18, "Across ten donor-disjoint liquid biopsy tasks, pooled out-of-fold A U R O C ranged from zero point eight three five to zero point nine eight two. Users can inspect fifty-nine saved analyses, or retrain Dynomap on their own labelled table."),
]


async def create_segments(directory: Path) -> list[Path]:
    directory.mkdir(parents=True,exist_ok=True);paths=[]
    for index,(_,text) in enumerate(SEGMENTS):
        path=directory/f"voice-{index:02d}.mp3"
        await edge_tts.Communicate(text,"en-US-AvaMultilingualNeural",rate="-7%").save(str(path));paths.append(path)
    return paths


def main() -> None:
    if len(sys.argv)!=3: raise SystemExit("Expected TEMP_DIRECTORY OUTPUT_AUDIO")
    directory,output=Path(sys.argv[1]),Path(sys.argv[2]);paths=asyncio.run(create_segments(directory));ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    command=[ffmpeg,"-y"]
    for path in paths: command.extend(["-i",str(path)])
    filters=[]
    for index,(duration,_) in enumerate(SEGMENTS): filters.append(f"[{index}:a]apad,atrim=0:{duration}[a{index}]")
    filters.append("".join(f"[a{i}]" for i in range(len(paths)))+f"concat=n={len(paths)}:v=0:a=1[out]")
    command.extend(["-filter_complex",";".join(filters),"-map","[out]","-c:a","libmp3lame","-b:a","160k",str(output)])
    subprocess.run(command,check=True);print(f"wrote {output} ({sum(item[0] for item in SEGMENTS)} seconds)")


if __name__=="__main__": main()
