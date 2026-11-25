"""Render the current navigation guide from captured website screens and narration.
Run: python render_guide.py --audio-dir PATH. Requires Pillow and ffmpeg.
"""
import json, subprocess, math, argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT=Path(__file__).resolve().parent
ap=argparse.ArgumentParser();ap.add_argument('--audio-dir',required=True);args=ap.parse_args()
A=Path(args.audio_dir);scenes=json.loads((ROOT/'scenes.json').read_text());W,H=1920,1080
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def ft(n,b=False):return ImageFont.truetype(bold if b else font,n)
def wrap(s,font,width):
 out=[];line=''
 for w in s.split():
  cand=(line+' '+w).strip()
  if font.getlength(cand)>width and line:out.append(line);line=w
  else:line=cand
 return out+[line]
# Camera windows and focus boxes refer to the captured screen, in pixels.
crops=[(0,0,1330,720),(40,270,1290,890),(40,315,1290,850),(45,0,1285,650),(470,0,1010,310),(40,290,1290,920),(25,0,1290,710),(650,0,1220,330),(0,0,1330,720)]
boxes=[(40,465,260,532),(62,345,1267,430),(62,440,1267,590),(1055,240,1250,290),(586,116,811,166),(206,399,600,455),(685,16,815,72),(825,22,908,66),(1180,24,1275,65)]
clips=[];cues=[];offset=0
for i,s in enumerate(scenes):
 audio=A/f'{i}.mp3';duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(audio)]))+0.65
 s['start']=round(offset,3);s['duration']=round(duration,3)
 im=Image.new('RGB',(W,H),'#f5f6f0');d=ImageDraw.Draw(im)
 d.text((64,25),'LUGGAGE ATLAS / QUICK GUIDE',font=ft(22,True),fill='#5c705b')
 d.text((64,60),s['title'],font=ft(40,True),fill='#203c31')
 d.text((1740,60),f'{i+1} / {len(scenes)}',font=ft(26),fill='#5c705b')
 shot=Image.open(ROOT/'source'/s['image']).convert('RGB');crop=crops[i];shot=shot.crop(crop)
 # Screen stays large and readable; crop rather than inventing interface elements.
 ratio=min(1792/shot.width,770/shot.height);sz=(int(shot.width*ratio),int(shot.height*ratio));shot=shot.resize(sz,Image.Resampling.LANCZOS)
 x=(W-sz[0])//2;y=130+(770-sz[1])//2
 im.paste(shot,(x,y));d.rounded_rectangle((x-2,y-2,x+sz[0]+2,y+sz[1]+2),radius=3,outline='#c5cec0',width=2)
 b=boxes[i];bb=(int(x+(b[0]-crop[0])*ratio),int(y+(b[1]-crop[1])*ratio),int(x+(b[2]-crop[0])*ratio),int(y+(b[3]-crop[1])*ratio))
 # Focus outline points to the control used in this step.
 if bb[1]>=y and bb[3]<=y+sz[1]:d.rounded_rectangle(bb,radius=10,outline='#b2673e',width=5)
 d.rectangle((0,920,W,H),fill='#203c31')
 lines=wrap(s['text'],ft(30),1780)
 for j,line in enumerate(lines):d.text((70,945+j*39),line,font=ft(30),fill='white')
 d.rectangle((0,1072,int(W*(i+1)/len(scenes)),1080),fill='#b99d63')
 png=A/f'{i}.png';im.save(png)
 out=A/f'{i}.mp4'
 subprocess.run(['ffmpeg','-loglevel','error','-y','-loop','1','-framerate','24','-i',str(png),'-i',str(audio),'-t',str(duration),'-vf','fade=t=in:st=0:d=0.15','-af','apad','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(out)],check=True)
 clips.append(out);cues.append((offset,offset+duration,s['text']));offset+=duration
 print('Rendered',i,flush=True)
(A/'concat.txt').write_text('\n'.join("file '"+str(p)+"'" for p in clips))
subprocess.run(['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(A/'concat.txt'),'-c','copy','-movflags','+faststart',str(ROOT/'luggage-guide.mp4')],check=True)
def ts(t):
 ms=round(t*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'
(ROOT/'captions.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{ts(a)} --> {ts(b)}\n{t}' for a,b,t in cues)+'\n')
(ROOT/'scenes.json').write_text(json.dumps(scenes,indent=2)+'\n')
(ROOT/'chapters.json').write_text(json.dumps([{'start':s['start'],'title':s['title']} for s in scenes],indent=2)+'\n')
(ROOT/'transcript.txt').write_text('\n\n'.join(s['text'] for s in scenes)+'\n')
(ROOT/'transcript.md').write_text('# Luggage Atlas quick guide\n\nUpdated 25 November 2026. Current website navigation only.\n\n'+'\n\n'.join('## '+s['title']+'\n\n'+s['text'] for s in scenes)+'\n')
poster=Image.open(A/'0.png');poster.save(ROOT/'poster.jpg',quality=90)
(ROOT/'guide-verification.json').write_text(json.dumps({'updated':'2026-11-25','width':1920,'height':1080,'durationSeconds':round(offset,2),'screens':'Actual website captures','narration':'English, en-US-AriaNeural','captions':'English, also burned in','scope':'Current navigation, search, filters, compare, export, news and Insights'},indent=2)+'\n')
print('Duration',offset)
