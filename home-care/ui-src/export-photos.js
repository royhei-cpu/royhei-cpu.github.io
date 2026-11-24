// Convert the exact catalog photo to a compact PNG that Excel can embed.
// Cross-origin images must permit CORS; failures keep the item and its photo link.
export function loadPhoto(url){return new Promise((resolve,reject)=>{
 if(!url){reject(new Error('No catalog photo'));return;}
 const image=new Image();image.crossOrigin='anonymous';
 const timer=setTimeout(()=>{image.onload=null;image.onerror=null;image.src='';reject(new Error('Photo timed out'));},12000);
 image.onerror=()=>{clearTimeout(timer);reject(new Error('Photo unavailable'));};
 image.onload=()=>{clearTimeout(timer);try{const scale=Math.min(1,160/image.naturalWidth,160/image.naturalHeight);const width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0,width,height);resolve({base64:canvas.toDataURL('image/png'),width,height});}catch(error){reject(error)}};
 image.src=url;
})}
export async function embedPhotos(book,sheet,items,photoUrl,{load=loadPhoto,onProgress=()=>{}}={}){
 let cursor=0,completed=0,embedded=0;const failures=[];
 await Promise.all(Array.from({length:Math.min(4,items.length)},async()=>{
  while(cursor<items.length){const index=cursor++,row=index+2,item=items[index];sheet.getRow(row).height=96;
   try{const photo=await load(photoUrl(item));const scale=Math.min(1,112/photo.width,112/photo.height);const width=photo.width*scale,height=photo.height*scale;const id=book.addImage({base64:photo.base64,extension:'png'});sheet.addImage(id,{tl:{col:0.08,row:row-1+0.06},ext:{width,height},editAs:'oneCell'});sheet.getCell(row,1).value='';embedded++;}
   catch{sheet.getCell(row,1).value='Photo unavailable — see Photo link';failures.push(item.id);}
   onProgress(++completed,items.length);
  }
 }));return {embedded,failed:failures.length,failedIds:failures};
}
