(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character];
    });
  }

  function metric(value) {
    return value && value.mean != null ? (100 * Number(value.mean)).toFixed(1) + "%" : "—";
  }

  function category(value) {
    return {core:"Core study",liquid:"Liquid biopsy",benchmark:"Benchmark"}[value] || value;
  }

  var track = document.getElementById("datasetTrack");
  var previous = document.getElementById("datasetPrev");
  var next = document.getElementById("datasetNext");
  var position = document.getElementById("datasetPosition");
  var entries = [];

  function updateCarousel() {
    if (!track || !entries.length) return;
    var cards = track.querySelectorAll(".dataset-card");
    if (!cards.length) return;
    var cardWidth = cards[0].getBoundingClientRect().width + 14;
    var first = Math.min(entries.length - 1, Math.max(0, Math.round(track.scrollLeft / cardWidth)));
    var visible = Math.max(1, Math.floor((track.clientWidth + 14) / cardWidth));
    position.textContent = "Analyses " + (first + 1) + "–" + Math.min(entries.length, first + visible) + " of " + entries.length;
    previous.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  }

  function moveCarousel(direction) {
    track.scrollBy({left: direction * Math.max(280, track.clientWidth * .88), behavior:"smooth"});
  }

  if (track) {
    previous.addEventListener("click", function () { moveCarousel(-1); });
    next.addEventListener("click", function () { moveCarousel(1); });
    track.addEventListener("scroll", updateCarousel, {passive:true});
    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); moveCarousel(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
    window.addEventListener("resize", updateCarousel);
    fetch("assets/examples.json").then(function (response) {
      if (!response.ok) throw new Error("The saved-analysis catalog is unavailable.");
      return response.json();
    }).then(function (payload) {
      entries = payload.entries || [];
      track.innerHTML = entries.map(function (entry) {
        var primary = entry.metrics.auroc && entry.metrics.auroc.mean != null ? ["AUROC",entry.metrics.auroc] : ["Accuracy",entry.metrics.accuracy];
        var facts = [entry.n_samples == null ? null : Number(entry.n_samples).toLocaleString() + " samples",entry.n_features == null ? null : Number(entry.n_features).toLocaleString() + " features",entry.n_classes == null ? null : entry.n_classes + " classes"].filter(Boolean).join(" · ");
        return '<article class="dataset-card"><div class="dataset-card-top"><span>' + escapeHtml(category(entry.category)) + '</span><b>' + escapeHtml(primary[0]) + ' ' + escapeHtml(metric(primary[1])) + '</b></div><h3>' + escapeHtml(entry.title) + '</h3><p class="task">' + escapeHtml(entry.task) + '</p><p class="domain">' + escapeHtml(entry.domain) + '</p><p class="facts">' + escapeHtml(facts || "Saved aggregate analysis") + '</p><a class="button ghost" href="https://app.islamlab.org/dynomap/#example=' + encodeURIComponent(entry.id) + '">Open saved result</a></article>';
      }).join("");
      updateCarousel();
    }).catch(function (error) {
      track.innerHTML = '<p class="dataset-loading">' + escapeHtml(error.message) + '</p>';
      position.textContent = "";
      previous.disabled = next.disabled = true;
    });
  }

  var copyButton = document.getElementById("copyBibtex");
  if (copyButton) {
    copyButton.addEventListener("click", function () {
      var citation = document.getElementById("bibtexBlock").textContent;
      navigator.clipboard.writeText(citation).then(function () {
        copyButton.textContent = "Copied";
        window.setTimeout(function () { copyButton.textContent = "Copy BibTeX"; }, 1800);
      }).catch(function () {
        copyButton.textContent = "Select the citation to copy";
      });
    });
  }

  var attributionCanvas = document.getElementById("attributionCanvas");
  var attributionButtons = Array.prototype.slice.call(document.querySelectorAll(".attribution-tab"));
  var attributionPayload = null;
  var attributionTask = "general_cancer";
  var attributionHits = [];

  function drawAttribution(taskName) {
    if (!attributionCanvas || !attributionPayload || !attributionPayload.tasks[taskName]) return;
    var task = attributionPayload.tasks[taskName];
    var points = task.points;
    var context = attributionCanvas.getContext("2d");
    var width = attributionCanvas.width, height = attributionCanvas.height, padding = 58;
    var xs = points.map(function (point) { return point.x; });
    var ys = points.map(function (point) { return point.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var maxIg = Math.max.apply(null, points.map(function (point) { return point.ig; })) || 1;
    var ranked = points.slice().sort(function (a,b) { return b.ig - a.ig; });
    var labelSet = {};
    ranked.slice(0,8).forEach(function (point) { labelSet[point.gene] = true; });
    function px(point) { return padding + (point.x-minX)/(maxX-minX || 1)*(width-2*padding); }
    function py(point) { return height-padding-(point.y-minY)/(maxY-minY || 1)*(height-2*padding); }
    context.clearRect(0,0,width,height);
    context.fillStyle = "#fbfaf7"; context.fillRect(0,0,width,height);
    context.strokeStyle = "#e5e1d8"; context.lineWidth = 1;
    for (var grid=1; grid<6; grid+=1) {
      var gx = padding + grid*(width-2*padding)/6, gy = padding + grid*(height-2*padding)/6;
      context.beginPath(); context.moveTo(gx,padding); context.lineTo(gx,height-padding); context.stroke();
      context.beginPath(); context.moveTo(padding,gy); context.lineTo(width-padding,gy); context.stroke();
    }
    attributionHits = [];
    points.forEach(function (point) {
      var x=px(point), y=py(point), magnitude=point.ig/maxIg, radius=4+11*Math.sqrt(magnitude);
      context.beginPath(); context.arc(x,y,radius,0,Math.PI*2);
      context.fillStyle = point.direction >= 0 ? "rgba(168,63,53,"+(.28+.68*magnitude)+")" : "rgba(71,109,137,"+(.28+.68*magnitude)+")";
      context.fill();
      if (labelSet[point.gene]) {
        var onRight = x < width*.68, tx = x + (onRight ? 17 : -17), align = onRight ? "left" : "right";
        context.beginPath(); context.moveTo(x+(onRight?radius:-radius),y); context.lineTo(tx+(onRight?2:-2),y-7); context.strokeStyle="rgba(70,82,98,.55)"; context.stroke();
        context.textAlign=align; context.font="600 17px Source Sans 3, Arial, sans-serif"; context.fillStyle="#17202c"; context.fillText(point.gene,tx,y-10);
      }
      attributionHits.push({x:x,y:y,r:Math.max(13,radius),point:point});
    });
    context.textAlign="left"; context.font="600 14px Source Sans 3, Arial, sans-serif"; context.fillStyle="#a83f35"; context.fillText("RARE-Seq learned coordinates",padding,29);
    context.font="13px Source Sans 3, Arial, sans-serif"; context.fillStyle="#707a86"; context.fillText("larger point = greater mean |Integrated Gradients|",padding,49);
    document.getElementById("attributionSummary").innerHTML = '<h3>'+escapeHtml(task.title)+'</h3><p>'+escapeHtml(task.summary)+'</p><p><b>'+task.source_donors+' source donors</b> &middot; attribution summarized from '+task.ig_samples+' held-out samples for this class.</p>';
    document.getElementById("attributionFeatures").innerHTML = ranked.slice(0,8).map(function(point,index){
      return '<div class="feature-rank"><span>'+String(index+1).padStart(2,"0")+'</span><div><b>'+escapeHtml(point.gene)+'</b><small>'+(point.direction>=0?'positive':'negative')+' source association</small></div><i>|IG| '+point.ig.toFixed(3)+'</i></div>';
    }).join("");
    attributionCanvas.setAttribute("aria-label",task.title+" attribution map. Highest-ranked features: "+ranked.slice(0,8).map(function(point){return point.gene;}).join(", ")+".");
  }

  if (attributionCanvas) {
    fetch("assets/rareseq-attribution.json").then(function(response){
      if (!response.ok) throw new Error("Attribution data unavailable");
      return response.json();
    }).then(function(payload){ attributionPayload=payload; drawAttribution(attributionTask); }).catch(function(error){
      document.getElementById("attributionSummary").innerHTML='<h3>Map unavailable</h3><p>'+escapeHtml(error.message)+'</p>';
    });
    attributionButtons.forEach(function(button){ button.addEventListener("click",function(){
      attributionTask=button.getAttribute("data-attribution");
      attributionButtons.forEach(function(item){ item.classList.toggle("active",item===button); });
      drawAttribution(attributionTask);
    }); });
    attributionCanvas.addEventListener("mousemove",function(event){
      var rectangle=attributionCanvas.getBoundingClientRect(), x=(event.clientX-rectangle.left)*attributionCanvas.width/rectangle.width, y=(event.clientY-rectangle.top)*attributionCanvas.height/rectangle.height;
      var hit=attributionHits.find(function(item){return Math.hypot(item.x-x,item.y-y)<=item.r;});
      var tip=document.getElementById("attributionTip");
      if(!hit){tip.hidden=true;return;}
      tip.hidden=false; tip.innerHTML='<b>'+escapeHtml(hit.point.gene)+'</b><br>|IG| '+hit.point.ig.toFixed(4)+'<br>'+(hit.point.direction>=0?'positive':'negative')+' source association';
      tip.style.left=Math.min(rectangle.width-150,event.clientX-rectangle.left+14)+'px'; tip.style.top=Math.max(8,event.clientY-rectangle.top-15)+'px';
    });
    attributionCanvas.addEventListener("mouseleave",function(){document.getElementById("attributionTip").hidden=true;});
  }
}());
