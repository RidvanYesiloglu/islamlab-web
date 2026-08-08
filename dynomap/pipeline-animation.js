(function () {
  "use strict";
  var canvas=document.getElementById("pipelineCanvas");
  if(!canvas)return;
  var context=canvas.getContext("2d"), play=document.getElementById("pipelinePlay"), restart=document.getElementById("pipelineRestart"), progress=document.getElementById("pipelineProgress"), stageOutput=document.getElementById("pipelineStage");
  var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running=!reduced, started=performance.now(), pausedAt=0, total=24;
  var stages=[
    {start:0,end:4,label:"1. Unordered table"},
    {start:4,end:8,label:"2. Learn a feature gate"},
    {start:8,end:14,label:"3. Move features into a task-optimized topology"},
    {start:14,end:19,label:"4. Render a sample-specific Dynomap"},
    {start:19,end:24,label:"5. Read local patterns and attribute the prediction"}
  ];
  var features=[
    {name:"NKX2-1",value:.86,gate:.93,color:"#a83f35",tx:.76,ty:.23},
    {name:"EGFR",value:.72,gate:.88,color:"#a83f35",tx:.83,ty:.31},
    {name:"SOX9",value:.78,gate:.84,color:"#b38536",tx:.69,ty:.32},
    {name:"MSLN",value:.62,gate:.79,color:"#a83f35",tx:.77,ty:.40},
    {name:"TFF2",value:.22,gate:.71,color:"#476d89",tx:.28,ty:.26},
    {name:"TFF1",value:.30,gate:.67,color:"#476d89",tx:.22,ty:.34},
    {name:"PRSS3",value:.58,gate:.64,color:"#b38536",tx:.68,ty:.48},
    {name:"CFTR",value:.49,gate:.57,color:"#a83f35",tx:.59,ty:.40},
    {name:"PON1",value:.20,gate:.38,color:"#476d89",tx:.31,ty:.46},
    {name:"SFTPC",value:.26,gate:.35,color:"#476d89",tx:.38,ty:.31},
    {name:"GPC1",value:.47,gate:.31,color:"#b38536",tx:.63,ty:.61},
    {name:"AIF1",value:.18,gate:.28,color:"#476d89",tx:.32,ty:.61},
    {name:"FHOD3",value:.42,gate:.24,color:"#b38536",tx:.55,ty:.70},
    {name:"NRXN1",value:.15,gate:.18,color:"#476d89",tx:.23,ty:.71}
  ];
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function ease(value){value=clamp(value,0,1);return value*value*(3-2*value);}
  function phase(time,start,end){return ease((time-start)/(end-start));}
  function roundRect(x,y,w,h,r,fill,stroke){context.beginPath();context.roundRect(x,y,w,h,r);if(fill){context.fillStyle=fill;context.fill();}if(stroke){context.strokeStyle=stroke;context.lineWidth=1;context.stroke();}}
  function label(text,x,y,color,size,weight){context.fillStyle=color||"#17202c";context.font=(weight||600)+" "+(size||15)+"px Source Sans 3, Arial, sans-serif";context.fillText(text,x,y);}
  function arrow(x1,y1,x2,y2,alpha){context.save();context.globalAlpha=alpha;context.strokeStyle="#a83f35";context.fillStyle="#a83f35";context.lineWidth=2;context.beginPath();context.moveTo(x1,y1);context.lineTo(x2,y2);context.stroke();var a=Math.atan2(y2-y1,x2-x1);context.beginPath();context.moveTo(x2,y2);context.lineTo(x2-9*Math.cos(a-.45),y2-9*Math.sin(a-.45));context.lineTo(x2-9*Math.cos(a+.45),y2-9*Math.sin(a+.45));context.closePath();context.fill();context.restore();}
  function draw(time){
    context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle="#fbfaf7";context.fillRect(0,0,canvas.width,canvas.height);
    var gateP=phase(time,4,8), moveP=phase(time,8,14), mapP=phase(time,14,19), readP=phase(time,19,24);
    label("ONE SAMPLE",30,35,"#a83f35",12,700);label("LEARNABLE TOPOLOGY",335,35,"#a83f35",12,700);label("DYNOMAP",745,35,"#a83f35",12,700);label("OUTPUT",1010,35,"#a83f35",12,700);
    roundRect(24,50,255,458,4,"#ffffff","#d9d6ce");roundRect(316,50,380,458,4,"#ffffff","#d9d6ce");roundRect(728,50,245,458,4,"#ffffff","#d9d6ce");roundRect(1000,50,176,458,4,"#ffffff","#d9d6ce");
    label("feature",42,78,"#707a86",12,600);label("value",190,78,"#707a86",12,600);label("gate",238,78,"#707a86",12,600);
    features.forEach(function(feature,index){
      var y=101+index*27.3, gated=feature.value*((1-gateP)+gateP*feature.gate);
      context.fillStyle=index%2?"#faf8f3":"#f4f1ea";context.fillRect(36,y-17,231,23);
      label(feature.name,43,y,"#465262",12,index<4?700:500);
      context.fillStyle="#e3dfd6";context.fillRect(157,y-10,60,8);context.fillStyle=feature.color;context.fillRect(157,y-10,60*feature.value,8);
      label(feature.value.toFixed(2),221,y,"#707a86",10,500);
      context.strokeStyle="#d9d6ce";context.strokeRect(247,y-13,10,10);context.fillStyle=feature.color;context.globalAlpha=.18+.82*gateP*feature.gate;context.fillRect(248,y-12,8,8);context.globalAlpha=1;
      if(gateP>.05&&index<4){context.strokeStyle=feature.color;context.lineWidth=1.5;context.strokeRect(34,y-19,235,27);}
      feature.gated=gated;
    });
    label(gateP<.5?"Columns have values, but no geometry.":"The gate learns which measurements matter.",42,490,"#465262",13,600);
    arrow(282,279,307,279,clamp((time-3)/2,0,1));
    var mapX=742,mapY=105,mapW=217,mapH=352;
    if(mapP>.01){
      features.forEach(function(feature){
        var gx=mapX+feature.tx*mapW,gy=mapY+feature.ty*mapH,radius=(18+36*feature.gated)*mapP;
        var gradient=context.createRadialGradient(gx,gy,0,gx,gy,radius);gradient.addColorStop(0,feature.color+"bb");gradient.addColorStop(.4,feature.color+"55");gradient.addColorStop(1,feature.color+"00");context.fillStyle=gradient;context.fillRect(gx-radius,gy-radius,radius*2,radius*2);
      });
    }
    context.strokeStyle="#eeeae2";context.lineWidth=1;for(var grid=1;grid<6;grid++){context.beginPath();context.moveTo(mapX+grid*mapW/6,mapY);context.lineTo(mapX+grid*mapW/6,mapY+mapH);context.stroke();context.beginPath();context.moveTo(mapX,mapY+grid*mapH/6);context.lineTo(mapX+mapW,mapY+grid*mapH/6);context.stroke();}
    features.forEach(function(feature,index){
      var sx=345+(index%4)*82,sy=112+Math.floor(index/4)*103;
      var tx=347+feature.tx*315,ty=87+feature.ty*382;
      var x=sx+(tx-sx)*moveP,y=sy+(ty-sy)*moveP,r=4+7*feature.gated*gateP;
      if(moveP>.04&&moveP<.99){context.beginPath();context.moveTo(sx,sy);context.lineTo(x,y);context.strokeStyle=feature.color+"30";context.stroke();}
      context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fillStyle=feature.color;context.globalAlpha=.35+.6*feature.gated;context.fill();context.globalAlpha=1;
      if((index<4&&moveP>.58)||(index<2&&moveP<=.58)){label(feature.name,x+9,y-7,"#465262",12,600);}
    });
    label(moveP<.2?"Features start without task-specific neighborhoods.":moveP<.86?"Prediction loss moves the coordinates.":"High-signal features form local neighborhoods.",338,490,"#465262",13,600);
    arrow(699,279,721,279,clamp((time-12)/2,0,1));
    if(readP>.01){
      var scanX=mapX+readP*(mapW-64);context.strokeStyle="#17202c";context.lineWidth=3;context.strokeRect(scanX,mapY+92,64,64);context.fillStyle="rgba(23,32,44,.05)";context.fillRect(scanX,mapY+92,64,64);
    }
    label(mapP<.5?"Gaussian kernels paint each value.":readP<.2?"The same topology creates a new map per sample.":"A vision branch reads local patterns.",742,490,"#465262",13,600);
    arrow(976,279,994,279,clamp((time-18)/2,0,1));
    roundRect(1020,91,136,82,4,"#f5f3ee","#d9d6ce");label("Cancer",1040,119,"#465262",13,600);label((50+46*readP).toFixed(0)+"%",1040,153,"#a83f35",30,700);
    label("Top attribution",1020,213,"#707a86",12,700);
    features.slice(0,4).forEach(function(feature,index){var y=243+index*44;context.globalAlpha=.18+.82*readP;context.fillStyle=feature.color;context.fillRect(1020,y-13,102*feature.gate*readP,9);label(feature.name,1020,y-19,"#465262",11,600);context.globalAlpha=1;});
    label(readP<.55?"Prediction emerges as local structure is read.":"Attribution returns to named source features.",1020,490,"#465262",12,600);
    var current=stages[stages.length-1];for(var i=0;i<stages.length;i++){if(time>=stages[i].start&&time<stages[i].end){current=stages[i];break;}}
    stageOutput.textContent=current.label;progress.style.width=(100*time/total)+"%";canvas.setAttribute("aria-label",current.label+" in the animated Dynomap pipeline.");
  }
  function frame(now){
    var time=running?((now-started)/1000)%total:pausedAt;
    draw(time);
    if(running)requestAnimationFrame(frame);
  }
  play.addEventListener("click",function(){
    if(running){pausedAt=((performance.now()-started)/1000)%total;running=false;play.textContent="Play animation";}
    else{running=true;started=performance.now()-pausedAt*1000;play.textContent="Pause animation";requestAnimationFrame(frame);}
  });
  restart.addEventListener("click",function(){pausedAt=0;started=performance.now();if(!running){running=true;play.textContent="Pause animation";requestAnimationFrame(frame);}});
  if(reduced){pausedAt=23.5;play.textContent="Play animation";draw(pausedAt);}else{requestAnimationFrame(frame);}
}());
