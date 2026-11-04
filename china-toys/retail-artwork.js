/* Reuse reviewed packaging UVs in the 2D drawing. No generated product artwork. */
(() => {
 const faces=new Map();
 window.ATLAS_PLAN_ART={get:id=>faces.get(id),ready:null};
 const make=async([id,p])=>{try{
  const image=new Image();image.src=p.image;await image.decode();
  const [A,B,C,D]=p.front,dx1=B[0]-C[0],dx2=D[0]-C[0],dy1=B[1]-C[1],dy2=D[1]-C[1],sx=A[0]-B[0]+C[0]-D[0],sy=A[1]-B[1]+C[1]-D[1],den=dx1*dy2-dx2*dy1,g=den?(sx*dy2-dx2*sy)/den:0,j=den?(dx1*sy-sx*dy1)/den:0;
  const a=B[0]-A[0]+g*B[0],b=D[0]-A[0]+j*D[0],d=B[1]-A[1]+g*B[1],e=D[1]-A[1]+j*D[1];
  const source=(u,v)=>{const q=g*u+j*v+1;return [(a*u+b*v+A[0])/q,(d*u+e*v+A[1])/q]};
  const canvas=document.createElement('canvas');canvas.width=220;canvas.height=360;const ctx=canvas.getContext('2d');
  const triangle=(uv)=>{const src=uv.map(([u,v])=>source(u,v)),dst=uv.map(([u,v])=>[u*canvas.width,v*canvas.height]);
   const [q,r,t]=src,[x,y,z]=dst,det=q[0]*(r[1]-t[1])+r[0]*(t[1]-q[1])+t[0]*(q[1]-r[1]);
   const solve=k=>[(x[k]*(r[1]-t[1])+y[k]*(t[1]-q[1])+z[k]*(q[1]-r[1]))/det,(x[k]*(t[0]-r[0])+y[k]*(q[0]-t[0])+z[k]*(r[0]-q[0]))/det,(x[k]*(r[0]*t[1]-t[0]*r[1])+y[k]*(t[0]*q[1]-q[0]*t[1])+z[k]*(q[0]*r[1]-r[0]*q[1]))/det];
   const mx=solve(0),my=solve(1);ctx.save();ctx.beginPath();ctx.moveTo(...x);ctx.lineTo(...y);ctx.lineTo(...z);ctx.closePath();ctx.clip();ctx.setTransform(mx[0],my[0],mx[1],my[1],mx[2],my[2]);ctx.drawImage(image,0,0);ctx.restore();
  };
  const n=12;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n,v=y/n,U=(x+1)/n,V=(y+1)/n;triangle([[u,v],[U,v],[U,V]]);triangle([[u,v],[U,V],[u,V]])}
  faces.set(id,canvas.toDataURL('image/png'));
 }catch{ /* Source photo remains available if the reviewed face cannot load. */ }};
 window.ATLAS_PLAN_ART.ready=Promise.all(Object.entries(window.ATLAS_RETAIL_PACKS||{}).map(make)).then(()=>document.dispatchEvent(new Event('atlas:pack-art-ready')));
})();
