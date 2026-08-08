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
}());
