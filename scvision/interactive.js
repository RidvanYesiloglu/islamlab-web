/* ============================================================================
   scVision project page — interactive results explorer (#benchmarks) and
   real-scImage gallery (#gallery). All numbers are loaded from results.json
   (machine-extracted from the paper's evaluation files); all gallery images
   are real rendered scImages from fig1_real_genomaps.npz. No fabricated data.
   Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- shared ---------- */
  var COL = {
    scVision: "#c8543f", scGPT: "#4f7290", scFoundation: "#6f9159",
    Geneformer: "#8e6f96", "HVG-kNN": "#9aa0a6", scVI: "#b08636",
    Harmony: "#b0a89a", PCA: "#c9c2b6"
  };
  var INK = "#1b1e20", MUTED = "#71777d", LINE = "#e9e5de", FAINT = "#9aa0a6";
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function svg(inner, vw, vh){
    return '<svg viewBox="0 0 '+vw+' '+vh+'" width="100%" preserveAspectRatio="xMidYMid meet" '+
           'font-family="Inter,-apple-system,sans-serif" role="img">'+inner+'</svg>';
  }

  /* ======================================================================
     #2  RESULTS EXPLORER
     ====================================================================== */
  (function results(){
    var chart = document.getElementById("rexChart");
    if (!chart) return;
    var elTitle=document.getElementById("rexTitle"), elSub=document.getElementById("rexSub"),
        elLegend=document.getElementById("rexLegend"), elNote=document.getElementById("rexNote"),
        elCtl=document.getElementById("rexControls");
    var DATA=null, view="robust", robustMode="genemask", effMetric="throughput", integMetric="bio", integTissue="average";

    /* ---- horizontal bar chart (shared by efficiency / integration / ablation) ---- */
    function hbars(items, opt){
      opt = opt || {};
      var vw=720, rowH=46, top=12, vh=items.length*rowH+top*2;
      var labelW=opt.labelW||158, rightPad=opt.rightPad||116, x0=labelW, barMaxW=vw-rightPad-x0;
      var vals=items.map(function(d){return d.value;});
      var max=opt.max!=null?opt.max:Math.max.apply(null,vals);
      function w(v){ if(v<=0) return 0;
        return opt.log ? (Math.log10(v+1)/Math.log10(max+1))*barMaxW : (v/max)*barMaxW; }
      var s="";
      items.forEach(function(d,i){
        var cy=top+i*rowH+rowH/2, bw=w(d.value), h=d.hl?24:20, col=d.color||"#c9c2b6";
        s+='<text x="'+(x0-12)+'" y="'+(cy+4)+'" text-anchor="end" font-size="13.5" '+
             'font-weight="'+(d.hl?600:500)+'" fill="'+(d.hl?INK:"#3a4045")+'">'+esc(d.label)+'</text>';
        s+='<rect x="'+x0+'" y="'+(cy-h/2)+'" width="'+Math.max(bw,1.5)+'" height="'+h+'" rx="4" '+
             'fill="'+col+'" opacity="'+(d.hl?1:.82)+'"/>';
        s+='<text x="'+(x0+bw+8)+'" y="'+(cy+4)+'" font-size="12.5" font-weight="'+(d.hl?600:500)+'" '+
             'fill="'+(d.hl?d.color:MUTED)+'">'+esc(d.vlabel!=null?d.vlabel:d.value)+'</text>';
      });
      return svg(s, vw, vh);
    }

    /* ---- multi-line chart (robustness) ---- */
    function lineChart(series, xs, opt){
      var vw=720, vh=360, L=52, R=150, T=18, B=48, pw=vw-L-R, ph=vh-T-B;
      var ymax=opt.ymax||0.5;
      var xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
      function px(xv){ var t=(xv-xmin)/(xmax-xmin||1); if(opt.reverse) t=1-t; return L+t*pw; }
      function py(yv){ return T+ph-(yv/ymax)*ph; }
      var s="";
      // y gridlines + labels
      for(var g=0; g<=5; g++){ var yv=ymax*g/5, y=py(yv);
        s+='<line x1="'+L+'" y1="'+y+'" x2="'+(L+pw)+'" y2="'+y+'" stroke="'+LINE+'" stroke-width="1"/>';
        s+='<text x="'+(L-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="11.5" fill="'+FAINT+'">'+yv.toFixed(1)+'</text>';
      }
      // x labels
      xs.forEach(function(xv){ var x=px(xv);
        s+='<text x="'+x+'" y="'+(T+ph+22)+'" text-anchor="middle" font-size="11.5" fill="'+MUTED+'">'+opt.xfmt(xv)+'</text>';
      });
      s+='<text x="'+(L+pw/2)+'" y="'+(vh-6)+'" text-anchor="middle" font-size="12" fill="'+MUTED+'">'+esc(opt.xlab)+'</text>';
      s+='<text transform="translate(14,'+(T+ph/2)+') rotate(-90)" text-anchor="middle" font-size="12" fill="'+MUTED+'">balanced accuracy</text>';
      // lines
      series.forEach(function(se){
        var pts=[]; for(var i=0;i<xs.length;i++){ var v=se.mean[i]; if(v==null)continue; pts.push([px(xs[i]),py(v)]); }
        if(!pts.length) return;
        var d=pts.map(function(p,i){return (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1);}).join(" ");
        s+='<path d="'+d+'" fill="none" stroke="'+se.color+'" stroke-width="'+(se.hl?3.4:1.9)+'" '+
             'opacity="'+(se.hl?1:.85)+'" stroke-linejoin="round" stroke-linecap="round"/>';
        pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(se.hl?4:3)+'" fill="'+se.color+'"/>'; });
        // end label
        var last=pts[pts.length-1];
        s+='<text x="'+(L+pw+10)+'" y="'+(last[1]+4)+'" font-size="12" font-weight="'+(se.hl?600:500)+'" fill="'+se.color+'">'+esc(se.name)+'</text>';
      });
      return svg(s, vw, vh);
    }

    function legend(items){
      return items.map(function(d){
        return '<span class="rl"><i style="background:'+d.color+'"></i>'+esc(d.label)+'</span>';
      }).join("");
    }
    function ctlButtons(defs, active, cb){
      elCtl.innerHTML = defs.map(function(d){
        return '<button class="rseg'+(d.k===active?" on":"")+'" data-k="'+d.k+'">'+esc(d.t)+'</button>';
      }).join("");
      Array.prototype.forEach.call(elCtl.querySelectorAll(".rseg"), function(b){
        b.addEventListener("click", function(){ cb(b.getAttribute("data-k")); });
      });
    }

    var ROB_METHODS=["scVision","scFoundation","Geneformer","scGPT","HVG-kNN"];
    function renderRobust(){
      var r=DATA.robustness[robustMode];
      elTitle.textContent="Robustness to corrupted input";
      elSub.textContent=DATA.robustness.atlas+" · balanced accuracy";
      ctlButtons([{k:"genemask",t:"Genes removed"},{k:"downsample",t:"Counts downsampled"}], robustMode,
        function(k){ robustMode=k; renderRobust(); });
      var series=ROB_METHODS.map(function(m){ var md=r.methods[m]||{mean:[]};
        return {name:m, mean:md.mean, color:COL[m], hl:(m==="scVision")}; });
      var isGM=robustMode==="genemask";
      chart.innerHTML=lineChart(series, r.x, {
        ymax:0.5, reverse:!isGM,
        xfmt:function(v){ return isGM?(Math.round(v*100)+"%"):(v===1?"full":Math.round(v*100)+"%"); },
        xlab:isGM?"fraction of genes removed":"fraction of counts kept (1.0 = clean)"
      });
      elLegend.innerHTML=legend(ROB_METHODS.map(function(m){return {label:m,color:COL[m]};}));
      elNote.textContent = isGM
        ? "As input genes are randomly dropped, scVision degrades most gracefully while the classical HVG-kNN baseline collapses. Five-fold mean."
        : "As raw counts are downsampled (sparser cells), scVision retains the most accuracy. Five-fold mean.";
    }

    function renderEff(){
      elTitle.textContent="Inference efficiency";
      elSub.textContent="512 cells · single GPU · frozen encoder";
      ctlButtons([{k:"throughput",t:"Throughput"},{k:"params",t:"Parameters"},{k:"gpu",t:"Peak GPU"}], effMetric,
        function(k){ effMetric=k; renderEff(); });
      var items=DATA.efficiency.map(function(e){
        var v,vl;
        if(effMetric==="throughput"){ v=e.cells_per_s; vl=e.cells_per_s+" cells/s"+(e.speedup>1?"  ·  "+e.speedup+"× slower":""); }
        else if(effMetric==="params"){ v=e.params_M; vl=e.params_M+"M"; }
        else { v=e.gpu_gb; vl=e.gpu_gb+" GB"; }
        return {label:e.method, value:v, vlabel:vl, color:COL[e.method], hl:(e.method==="scVision")};
      });
      chart.innerHTML=hbars(items, {log:(effMetric==="throughput")});
      elLegend.innerHTML="";
      elNote.textContent = effMetric==="throughput"
        ? "End-to-end cells/second (scVision includes image rendering). scVision is 37–293× faster than token foundation models. Log scale."
        : (effMetric==="params" ? "Encoder parameters (measured from checkpoints)."
                                : "Peak GPU memory during encoding of 512 cells.");
    }

    function renderInteg(){
      var tkeys=Object.keys(DATA.integration.tissues);
      elTitle.textContent="Multi-study integration (scIB)";
      var src = integTissue==="average" ? DATA.integration.average : DATA.integration.tissues[integTissue].methods;
      var tlabel = integTissue==="average" ? "mean over "+tkeys.length+" tissues"
                 : (DATA.integration.tissues[integTissue].label||integTissue);
      elSub.textContent=tlabel+" · bio 0.6 / batch 0.4";
      ctlButtons([{k:"bio",t:"Bio conservation"},{k:"total",t:"Combined scIB"},{k:"batch",t:"Batch mixing"}], integMetric,
        function(k){ integMetric=k; renderInteg(); });
      var order=["scVision","scGPT","scVI","Geneformer","PCA","Harmony"];
      var items=order.filter(function(m){return src[m];}).map(function(m){
        var v=src[m][integMetric];
        return {label:m, value:v, vlabel:v.toFixed(3), color:COL[m], hl:(m==="scVision")};
      }).sort(function(a,b){return b.value-a.value;});
      chart.innerHTML=hbars(items, {max:Math.max.apply(null,items.map(function(d){return d.value;}))*1.02});
      // tissue selector as a second control row
      var tsel='<div class="rex-tissues"><span>tissue</span>'+
        ['average'].concat(tkeys).map(function(t){
          var lab=t==="average"?"average":(DATA.integration.tissues[t].label||t);
          return '<button class="rchip'+(t===integTissue?" on":"")+'" data-t="'+t+'">'+esc(lab)+'</button>';
        }).join("")+'</div>';
      elLegend.innerHTML=tsel;
      Array.prototype.forEach.call(elLegend.querySelectorAll(".rchip"), function(b){
        b.addEventListener("click", function(){ integTissue=b.getAttribute("data-t"); renderInteg(); });
      });
      elNote.textContent = integMetric==="bio"
        ? "Biological-structure conservation (higher = better). scVision conserves the most biology of any method tested — with no batch labels."
        : (integMetric==="total" ? "Combined scIB score (0.6·bio + 0.4·batch). scVision matches the strongest token models, scGPT and scVI."
                                 : "Batch-mixing component (higher = batches better merged).");
    }

    function renderSSL(){
      elTitle.textContent="Pretraining-objective ablation";
      elSub.textContent="kidney cortex · balanced accuracy · same backbone & data";
      elCtl.innerHTML="";
      var items=DATA.ssl_ablation.map(function(s){
        return {label:s.label, value:s.balacc, vlabel:s.balacc.toFixed(3),
                color:s.hl?COL.scVision:"#b8b0a4", hl:!!s.hl};
      });
      chart.innerHTML=hbars(items, {labelW:150, max:Math.max.apply(null,items.map(function(d){return d.value;}))*1.04});
      elLegend.innerHTML="";
      elNote.textContent="Holding the network and data fixed, masked-image modelling (scVision) is the best pretraining objective — ahead of contrastive and gene-language variants.";
    }

    function render(){
      Array.prototype.forEach.call(document.querySelectorAll("#rexTabs .rtab"), function(t){
        t.classList.toggle("active", t.getAttribute("data-v")===view);
      });
      if(view==="robust") renderRobust();
      else if(view==="eff") renderEff();
      else if(view==="integ") renderInteg();
      else renderSSL();
    }

    Array.prototype.forEach.call(document.querySelectorAll("#rexTabs .rtab"), function(t){
      t.addEventListener("click", function(){ view=t.getAttribute("data-v"); render(); });
    });

    fetch("results.json").then(function(r){return r.json();}).then(function(d){ DATA=d; render(); })
      .catch(function(){ chart.innerHTML='<p class="rex-err">Could not load results data.</p>'; });
  })();

  /* ======================================================================
     #3  REAL scIMAGE GALLERY + masking
     ====================================================================== */
  (function gallery(){
    var host=document.getElementById("galGrid");
    if(!host) return;
    var LAT=104, PG=8, PS=LAT/PG;
    var VIR=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];
    function vir(t){t=t<0?0:t>1?1:t;var x=t*4,i=x|0,fr=x-i,a=VIR[i],b=VIR[i+1<5?i+1:4];
      return[(a[0]+(b[0]-a[0])*fr)|0,(a[1]+(b[1]-a[1])*fr)|0,(a[2]+(b[2]-a[2])*fr)|0];}
    function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
    var maskSeed=51;
    function buildMask(ratio){var a=[];for(var p=0;p<PG*PG;p++)a.push(p);var r=mulberry32(maskSeed);
      for(var i=a.length-1;i>0;i--){var j=(r()*(i+1))|0,t=a[i];a[i]=a[j];a[j]=t;}
      var n=Math.round(ratio*PG*PG),set={};for(var k=0;k<n;k++)set[a[k]]=1;return set;}
    function reconField(f,set){
      var means=new Float32Array(PG*PG),cnt=new Float32Array(PG*PG);
      for(var y=0;y<LAT;y++)for(var x=0;x<LAT;x++){var p=((y/PS)|0)*PG+((x/PS)|0);means[p]+=f[y*LAT+x];cnt[p]++;}
      var vis=[];for(var p=0;p<PG*PG;p++){means[p]/=cnt[p];if(set[p]!==1)vis.push({cx:((p%PG)+0.5)/PG,cy:(((p/PG)|0)+0.5)/PG,m:means[p]});}
      var out=Float32Array.from(f);
      for(var q=0;q<PG*PG;q++){if(set[q]!==1)continue;var pr=(q/PG)|0,pc=q%PG;
        for(var y2=pr*PS;y2<(pr+1)*PS;y2++)for(var x2=pc*PS;x2<(pc+1)*PS;x2++){
          var nx=(x2+0.5)/LAT,ny=(y2+0.5)/LAT,num=0,den=0;
          for(var v=0;v<vis.length;v++){var dx=nx-vis[v].cx,dy=ny-vis[v].cy,w=1/(dx*dx+dy*dy+2e-3);num+=w*vis[v].m;den+=w;}
          out[y2*LAT+x2]=den>0?num/den:0.5;}}
      return out;}
    function paint(cv,f,set,masked){
      var ctx=cv.getContext("2d"),im=ctx.createImageData(LAT,LAT),d=im.data;
      for(var y=0;y<LAT;y++)for(var x=0;x<LAT;x++){var idx=y*LAT+x,pi=idx*4,rgb;
        if(masked&&set[((y/PS)|0)*PG+((x/PS)|0)]===1)rgb=[214,210,202];else rgb=vir(f[idx]);
        d[pi]=rgb[0];d[pi+1]=rgb[1];d[pi+2]=rgb[2];d[pi+3]=255;}
      ctx.putImageData(im,0,0);}

    var man=null, fields=[], cur=0, ratio=0.75;
    var cvFull=document.getElementById("galFull"), cvMask=document.getElementById("galMask"),
        cvRecon=document.getElementById("galRecon"), elLabel=document.getElementById("galLabel"),
        elTissue=document.getElementById("galTissue"), elPct=document.getElementById("galPct"),
        elCapMask=document.getElementById("galCapMask"), slider=document.getElementById("galSlider");

    function renderSelected(){
      var f=fields[cur], set=buildMask(ratio);
      paint(cvFull,f,set,false); paint(cvMask,f,set,true); paint(cvRecon,reconField(f,set),set,false);
      var pct=Math.round(ratio*100)+"%"; elPct.textContent=pct; elCapMask.textContent=pct+" hidden";
      elLabel.textContent=man.cells[cur].label; elTissue.textContent=man.cells[cur].tissue;
      Array.prototype.forEach.call(host.querySelectorAll(".gthumb"), function(t){
        t.classList.toggle("sel", +t.getAttribute("data-i")===cur); });
    }
    function select(i){ cur=i; renderSelected(); }

    // load manifest + sprite, extract per-cell intensity fields
    Promise.all([
      fetch("assets/scimages.json").then(function(r){return r.json();}),
      new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im);};im.onerror=rej;im.src="assets/scimages.png";})
    ]).then(function(out){
      man=out[0]; var img=out[1];
      var off=document.createElement("canvas"); off.width=img.width; off.height=img.height;
      var octx=off.getContext("2d"); octx.drawImage(img,0,0);
      var big=octx.getImageData(0,0,img.width,img.height).data, W=img.width;
      man.cells.forEach(function(c){
        var f=new Float32Array(LAT*LAT), ox=c.col*LAT, oy=c.row*LAT;
        for(var y=0;y<LAT;y++)for(var x=0;x<LAT;x++){
          var sp=((oy+y)*W+(ox+x))*4; f[y*LAT+x]=big[sp]/255; }
        fields[c.i]=f;
      });
      // build gallery grouped by (tissue,label)
      var groups={}, order=[];
      man.cells.forEach(function(c){ var key=c.label+"||"+c.tissue;
        if(!groups[key]){groups[key]=[];order.push(key);} groups[key].push(c); });
      var html="";
      order.forEach(function(key){
        var g=groups[key], first=g[0];
        html+='<div class="ggroup"><div class="ghead"><b>'+esc(first.label)+'</b><span>'+esc(first.tissue)+' · '+g.length+' cells</span></div><div class="grow">';
        g.forEach(function(c){ html+='<canvas class="gthumb" width="104" height="104" data-i="'+c.i+'" title="'+esc(first.label)+'"></canvas>'; });
        html+='</div></div>';
      });
      host.innerHTML=html;
      // paint thumbnails + wire clicks
      Array.prototype.forEach.call(host.querySelectorAll(".gthumb"), function(t){
        var i=+t.getAttribute("data-i"); paint(t, fields[i], null, false);
        t.addEventListener("click", function(){ select(i); });
      });
      select(0);
    }).catch(function(){ host.innerHTML='<p class="rex-err">Could not load scImage gallery.</p>'; });

    if(slider) slider.addEventListener("input", function(e){ ratio=(+e.target.value)/100; renderSelected(); });
    var rm=document.getElementById("galRemask");
    if(rm) rm.addEventListener("click", function(){ maskSeed=(Math.random()*1e9)|0; renderSelected(); });

    /* ---- live inference: run the REAL scVision model (GCP backend) ---- */
    var API=(window.SCVISION_API||"").replace(/\/+$/,"");
    var runBtn=document.getElementById("galRun"), liveOut=document.getElementById("galLive");
    function maskedPatchList(){ var s=buildMask(ratio); return Object.keys(s).map(Number); }
    function showLive(cls, html){ liveOut.hidden=false; liveOut.className="gal-live "+cls; liveOut.innerHTML=html; }
    if(runBtn && !API){ runBtn.style.display="none"; }
    if(runBtn && API){
      runBtn.addEventListener("click", function(){
        runBtn.disabled=true;
        showLive("loading", "Running the real scVision model on this cell…");
        fetch(API+"/annotate", {method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({cell:cur, mask_patches:maskedPatchList()})})
          .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
          .then(function(d){
            var conf=Math.round((d.confidence||0)*100), shift=(d.embedding_shift_cos!=null?d.embedding_shift_cos:1);
            var nbrs=(d.neighbors||[]).slice(0,5).map(function(n){
              return '<li><span>'+esc(n.label)+'</span><i>'+Number(n.sim).toFixed(2)+'</i></li>'; }).join("");
            showLive(d.correct?"good":"bad",
              '<div class="gl-head"><span class="gl-tag">'+(d.correct?"✓ correct":"✗ mis-annotated")+'</span>'+
                '<span class="gl-conf">'+conf+'% of '+((d.neighbors||[]).length||"k")+' neighbours</span></div>'+
              '<div class="gl-body">'+
                '<figure class="gl-attn-wrap"><canvas class="gl-attn" width="13" height="13"></canvas><figcaption>gene-program<br>attention</figcaption></figure>'+
                '<div class="gl-info">'+
                  '<div class="gl-pred">predicted <b>'+esc(d.pred)+'</b> &middot; true <b>'+esc(d.true)+'</b></div>'+
                  '<div class="gl-meta">'+(d.n_masked_patches||0)+' patches hidden &middot; embedding vs. clean = <b>'+Number(shift).toFixed(2)+'</b> cosine</div>'+
                  '<div class="gl-nbrs">nearest reference cells<ul>'+nbrs+'</ul></div>'+
                '</div>'+
              '</div>');
            var ac=liveOut.querySelector(".gl-attn");
            if(ac && d.attention){
              var g=d.attention_grid||13, ic=ac.getContext("2d"), im=ic.createImageData(g,g), pd=im.data;
              for(var p=0;p<g*g;p++){ var rgb=vir(d.attention[p]); pd[p*4]=rgb[0];pd[p*4+1]=rgb[1];pd[p*4+2]=rgb[2];pd[p*4+3]=255; }
              ic.putImageData(im,0,0);
            }
          })
          .catch(function(e){ showLive("err","Could not reach the model ("+esc(e.message)+"). It may be waking up — try again in a few seconds."); })
          .then(function(){ runBtn.disabled=false; });
      });
    }
  })();

  /* ======================================================================
     DISEASE AXIS  (precomputed viz)
     ====================================================================== */
  (function disease(){
    var host=document.getElementById("diseaseChart");
    if(!host) return;
    fetch("assets/disease.json").then(function(r){return r.json();}).then(function(d){
      var g=document.getElementById("diseaseGenes");
      if(g) g.innerHTML=(d.top_genes||[]).map(function(x){return "<span>"+esc(x)+"</span>";}).join(", ");
      var vw=680, vh=280, L=44, R=14, T=16, B=42, pw=vw-L-R, ph=vh-T-B;
      var xc=d.bin_centers, hcm=d.hcm, nor=d.normal, n=xc.length;
      var xmin=xc[0], xmax=xc[n-1], ymax=Math.max(Math.max.apply(null,hcm),Math.max.apply(null,nor))*1.08;
      var bw=pw/n*0.9;
      var X=function(v){return L+(v-xmin)/(xmax-xmin)*pw;}, Y=function(v){return T+ph-(v/ymax)*ph;};
      var s="";
      for(var gi=0;gi<=4;gi++){ var y=Y(ymax*gi/4); s+='<line x1="'+L+'" y1="'+y+'" x2="'+(L+pw)+'" y2="'+y+'" stroke="'+LINE+'" stroke-width="1"/>'; }
      for(var i=0;i<n;i++){ var x=X(xc[i])-bw/2;
        s+='<rect x="'+x+'" y="'+Y(nor[i])+'" width="'+bw+'" height="'+(T+ph-Y(nor[i]))+'" fill="#4f7290" opacity="0.42"/>';
        s+='<rect x="'+x+'" y="'+Y(hcm[i])+'" width="'+bw+'" height="'+(T+ph-Y(hcm[i]))+'" fill="#c8543f" opacity="0.55"/>';
      }
      s+='<line x1="'+X(d.mean_normal)+'" y1="'+T+'" x2="'+X(d.mean_normal)+'" y2="'+(T+ph)+'" stroke="#4f7290" stroke-width="1.5" stroke-dasharray="4 3"/>';
      s+='<line x1="'+X(d.mean_hcm)+'" y1="'+T+'" x2="'+X(d.mean_hcm)+'" y2="'+(T+ph)+'" stroke="#c8543f" stroke-width="1.5" stroke-dasharray="4 3"/>';
      s+='<text x="'+(L+pw/2)+'" y="'+(vh-6)+'" text-anchor="middle" font-size="12" fill="'+MUTED+'">disease-axis score  (higher = more diseased)</text>';
      s+='<text transform="translate(13,'+(T+ph/2)+') rotate(-90)" text-anchor="middle" font-size="12" fill="'+MUTED+'">cells</text>';
      s+='<rect x="'+(L+pw-148)+'" y="'+T+'" width="11" height="11" fill="#c8543f" opacity="0.55"/><text x="'+(L+pw-132)+'" y="'+(T+10)+'" font-size="12" fill="'+INK+'">diseased ('+d.n_hcm+')</text>';
      s+='<rect x="'+(L+pw-148)+'" y="'+(T+18)+'" width="11" height="11" fill="#4f7290" opacity="0.42"/><text x="'+(L+pw-132)+'" y="'+(T+28)+'" font-size="12" fill="'+INK+'">healthy ('+d.n_normal+')</text>';
      host.innerHTML=svg(s, vw, vh);
    }).catch(function(){ host.innerHTML='<p class="rex-err">Could not load disease-axis data.</p>'; });
  })();
})();
