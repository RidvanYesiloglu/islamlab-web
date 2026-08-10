(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"}[char]));

  const navToggle = $(".nav-toggle");
  const nav = $("#primary-nav");
  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  });
  $$('nav a').forEach(link => link.addEventListener("click", () => {
    nav?.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  }));

  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      }), {threshold: 0.08})
    : null;
  $$(".reveal").forEach(item => revealObserver ? revealObserver.observe(item) : item.classList.add("visible"));

  const addGrid = (target, size, hotCells) => {
    const group = typeof target === "string" ? $(target) : target;
    if (!group) return;
    const cell = size <= 5 ? 18 : 23;
    const gap = size <= 5 ? 5 : 3;
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", column * (cell + gap));
        rect.setAttribute("y", row * (cell + gap));
        rect.setAttribute("width", cell);
        rect.setAttribute("height", cell);
        if (hotCells.includes(row * size + column)) rect.classList.add("hot");
        group.appendChild(rect);
      }
    }
  };
  addGrid(".structure-map", 6, [1, 4, 7, 8, 14, 15, 20, 23, 28, 31, 34]);
  addGrid(".stack-structure", 6, [1, 4, 7, 8, 14, 15, 20, 23, 28, 31, 34]);
  addGrid(".stack-feature", 6, [2, 5, 8, 11, 13, 17, 20, 25, 29, 32, 35]);

  const stages = $$(".pipeline-stage .stage");
  const dots = $$(".step-dots i");
  const labels = ["01 · Network + features", "02 · Cluster communities", "03 · Structure becomes an image", "04 · Features become an image", "05 · Train the CNN", "06 · Scale once, train on images"];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let currentStage = prefersReducedMotion ? 5 : 0;
  let stageTimer = null;
  let paused = prefersReducedMotion;
  const motionToggle = $("#motion-toggle");

  const showStage = index => {
    currentStage = (index + stages.length) % stages.length;
    stages.forEach((stage, i) => stage.classList.toggle("active", i === currentStage));
    dots.forEach((dot, i) => dot.classList.toggle("active", i === currentStage));
    const label = $("#hero-step-label");
    if (label) label.textContent = labels[currentStage];
  };
  const stopTimer = () => { if (stageTimer) window.clearInterval(stageTimer); stageTimer = null; };
  const startTimer = () => {
    stopTimer();
    if (!paused && stages.length) stageTimer = window.setInterval(() => showStage(currentStage + 1), 2600);
  };
  motionToggle?.addEventListener("click", () => {
    paused = !paused;
    motionToggle.textContent = paused ? "Play" : "Pause";
    motionToggle.setAttribute("aria-pressed", String(paused));
    startTimer();
  });
  $("#motion-restart")?.addEventListener("click", () => {
    paused = false;
    if (motionToggle) { motionToggle.textContent = "Pause"; motionToggle.setAttribute("aria-pressed", "false"); }
    showStage(0);
    startTimer();
  });
  if (motionToggle && prefersReducedMotion) { motionToggle.textContent = "Play"; motionToggle.setAttribute("aria-pressed", "true"); }
  if (stages.length) {
    showStage(currentStage);
    startTimer();
  }

  const scaleAnimation = $("#scale-animation");
  const scaleToggle = $("#scale-toggle");
  const scalePhases = ["01 · Full network", "02 · One-time conversion", "03 · CNN trains on images", "04 · GNN memory grows"];
  let scalePhase = prefersReducedMotion ? scalePhases.length - 1 : 0;
  let scalePaused = prefersReducedMotion;
  let scaleTimer = null;
  const showScalePhase = index => {
    scalePhase = (index + scalePhases.length) % scalePhases.length;
    const output = $("#scale-phase");
    if (output) output.textContent = scalePhases[scalePhase];
  };
  const stopScaleTimer = () => { if (scaleTimer) window.clearInterval(scaleTimer); scaleTimer = null; };
  const startScaleTimer = () => {
    stopScaleTimer();
    scaleAnimation?.classList.toggle("playing", !scalePaused);
    if (!scalePaused) scaleTimer = window.setInterval(() => showScalePhase(scalePhase + 1), 1700);
  };
  scaleToggle?.addEventListener("click", () => {
    scalePaused = !scalePaused;
    scaleToggle.textContent = scalePaused ? "Play" : "Pause";
    scaleToggle.setAttribute("aria-pressed", String(scalePaused));
    startScaleTimer();
  });
  $("#scale-restart")?.addEventListener("click", () => {
    scalePaused = false;
    if (scaleToggle) { scaleToggle.textContent = "Pause"; scaleToggle.setAttribute("aria-pressed", "false"); }
    showScalePhase(0);
    scaleAnimation?.classList.remove("playing");
    window.requestAnimationFrame(() => startScaleTimer());
  });
  if (scaleToggle && prefersReducedMotion) { scaleToggle.textContent = "Play"; scaleToggle.setAttribute("aria-pressed", "true"); }
  showScalePhase(scalePhase);
  startScaleTimer();

  let examples = [];
  let exampleIndex = 0;
  let activeTab = "performance";
  let exampleMetric = "accuracy";
  let atlasMetric = "accuracy";
  const viewer = $("#example-viewer");

  const barChartMarkup = example => {
    const metricLabel = exampleMetric === "accuracy" ? "Accuracy" : "Macro-F1";
    return `<div class="comparison-chart" data-provenance="${escapeHtml(example.comparison_provenance)}">
      <div class="chart-head"><div><span class="score-label">Held-out comparison</span><h4>${metricLabel} across all nine methods</h4></div><div class="mini-toggle" role="group" aria-label="Example metric"><button class="${exampleMetric === "accuracy" ? "active" : ""}" type="button" data-example-metric="accuracy">Accuracy</button><button class="${exampleMetric === "f1" ? "active" : ""}" type="button" data-example-metric="f1">Macro-F1</button></div></div>
      <div class="chart-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>
      <div class="bar-table">${example.comparison.map(item => `<div class="bar-row ${item.model === "Graph2Image" ? "featured" : ""}"><span>${escapeHtml(item.model)}</span><i><b style="--score:${Number(item[exampleMetric]).toFixed(4)}%"></b></i><strong>${Number(item[exampleMetric]).toFixed(1)}%</strong></div>`).join("")}</div>
      <p class="protocol">${escapeHtml(example.protocol)}</p>
    </div>`;
  };

  const schematicGrid = (size, tone, seed, label) => {
    const cells = Array.from({length: size * size}, (_, index) => {
      const strength = (((index + 3) * (seed + 5)) % 17) / 16;
      return `<i style="--alpha:${(0.12 + strength * 0.82).toFixed(2)}"></i>`;
    }).join("");
    return `<figure class="generated-channel ${tone}"><div class="generated-grid" style="--grid:${size}">${cells}</div><figcaption>${escapeHtml(label)}</figcaption></figure>`;
  };

  const channelsMarkup = example => {
    if (example.channels.mode === "artifact") {
      return `<div class="channel-pair">
        <figure><img src="${escapeHtml(example.channels.feature)}" alt="Feature channel from ${escapeHtml(example.name)}"><figcaption><span>Feature channel</span><span>${escapeHtml(example.channels.caption)}</span></figcaption></figure>
        <figure><img src="${escapeHtml(example.channels.structure)}" alt="Structure channel from ${escapeHtml(example.name)}"><figcaption><span>Structure channel</span><span>same node map</span></figcaption></figure>
      </div><p class="artifact-note">These are real saved channel artifacts. The performance and biological charts elsewhere are rendered from numeric tables.</p>`;
    }
    if (example.channels.mode === "multiomic") {
      return `<div class="multiomic-channels">${schematicGrid(10, "coral-grid", 2, "Gene expression")}${schematicGrid(10, "blue-grid", 5, "Copy-number variation")}${schematicGrid(10, "sand-grid", 8, "DNA methylation")}</div><p class="artifact-note">Method schematic based on the verified three-layer input contract; not a saved manuscript figure.</p>`;
    }
    return `<div class="channel-pair schematic-pair">${schematicGrid(example.channels.size, "blue-grid", exampleIndex + 1, "Structure channel")}${schematicGrid(example.channels.size, "coral-grid", exampleIndex + 4, "Feature channel")}</div><p class="artifact-note">Deterministic method schematic at the verified grid size; not a saved output or scientific measurement.</p>`;
  };

  const biologyMarkup = example => {
    const biology = example.biology;
    let visual = "";
    if (biology.type === "correlations") {
      visual = `<div class="correlation-bars">${biology.values.map(item => `<div><span>${escapeHtml(item.label)}</span><i class="${item.value < 0 ? "negative" : "positive"}"><b style="--score:${Math.abs(item.value) * 100}%"></b></i><strong>${item.value > 0 ? "+" : ""}${Number(item.value).toFixed(3)}</strong></div>`).join("")}</div>`;
    } else if (biology.type === "corum") {
      visual = `<div class="corum-number"><strong>${Number(biology.odds_ratio).toFixed(1)}<small>×</small></strong><span>CORUM enrichment</span><p>${Number(biology.observed_edges).toLocaleString()} / ${Number(biology.total_edges).toLocaleString()} graph edges</p></div><div class="complex-list">${biology.complexes.map((item, i) => `<div><i>0${i + 1}</i><span>${escapeHtml(item)}</span></div>`).join("")}</div>`;
    } else if (biology.type === "systems") {
      visual = `<div class="systems-map">${biology.groups.map((group, index) => `<div class="system-group" style="--turn:${index * 8}deg"><strong>${escapeHtml(group.name)}</strong>${group.items.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>`).join("")}</div>`;
    } else if (biology.type === "multiomic") {
      visual = `<div class="omics-stack">${biology.layers.map((layer, index) => `<div class="layer-${index + 1}"><span>0${index + 1}</span><strong>${escapeHtml(layer)}</strong></div>`).join("")}</div><div class="scale-comparison"><div><span>Complete Graph2Image network</span><i><b style="--score:100%"></b></i><strong>${biology.complete_edges_millions}M edges</strong></div><div><span>Down-sampled baseline network</span><i><b style="--score:${biology.baseline_edges_millions / biology.complete_edges_millions * 100}%"></b></i><strong>${biology.baseline_edges_millions}M edges</strong></div><p>Message-passing baselines exceeded ${biology.baseline_memory_gb} GB before down-sampling.</p></div>`;
    }
    return `<div class="biology-native" data-provenance="${escapeHtml(biology.provenance)}"><div class="biology-copy"><span class="score-label">Result interpretation</span><h4>${escapeHtml(biology.title)}</h4><p>${escapeHtml(biology.body)}</p></div><div class="biology-visual">${visual}</div></div>`;
  };

  const panelMarkup = example => {
    if (activeTab === "channels") {
      return channelsMarkup(example);
    }
    if (activeTab === "biology") {
      return biologyMarkup(example);
    }
    return barChartMarkup(example);
  };

  const renderExample = () => {
    if (!viewer || !examples.length) return;
    const example = examples[exampleIndex];
    viewer.innerHTML = `<article class="example-shell" data-example="${escapeHtml(example.id)}">
      <div class="example-sidebar">
        <span class="example-tag">Stored result · ${escapeHtml(example.level)} · no retraining</span>
        <h3>${escapeHtml(example.name)}</h3>
        <p class="example-subtitle">${escapeHtml(example.subtitle)}</p>
        <div class="example-facts"><div><span>Nodes</span><b>${escapeHtml(example.nodes)}</b></div><div><span>Attributes</span><b>${escapeHtml(example.features)}</b></div><div><span>Graph</span><b>${escapeHtml(example.edges)}</b></div><div><span>Image</span><b>${escapeHtml(example.grid)}</b></div></div>
        <p class="stored-note">This opens curated, precomputed artifacts immediately and does not start an analysis job.</p>
      </div>
      <div class="example-main">
        <div class="example-tabs" role="tablist" aria-label="${escapeHtml(example.name)} result views">
          ${["performance", "channels", "biology"].map(tab => `<button type="button" role="tab" aria-selected="${activeTab === tab}" class="${activeTab === tab ? "active" : ""}" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join("")}
        </div>
        <div class="example-panel" role="tabpanel">${panelMarkup(example)}</div>
      </div>
    </article>`;
    $("#example-current").textContent = String(exampleIndex + 1).padStart(2, "0");
    $("#example-total").textContent = String(examples.length).padStart(2, "0");
    $$(".example-tabs button", viewer).forEach(button => button.addEventListener("click", () => { activeTab = button.dataset.tab; renderExample(); }));
    $$("[data-example-metric]", viewer).forEach(button => button.addEventListener("click", () => { exampleMetric = button.dataset.exampleMetric; renderExample(); }));
    window.requestAnimationFrame(() => viewer.classList.add("drawn"));
  };

  const renderAtlas = () => {
    const chart = $("#atlas-chart");
    if (!chart || !examples.length) return;
    const metricName = atlasMetric === "accuracy" ? "Accuracy" : "Macro-F1";
    chart.innerHTML = `<div class="atlas-scale"><span>${metricName}</span><i>0</i><i>25</i><i>50</i><i>75</i><i>100%</i></div>${examples.map(example => {
      const graph2image = example.comparison.find(item => item.model === "Graph2Image");
      const baseline = example.comparison.filter(item => item.model !== "Graph2Image").sort((a, b) => b[atlasMetric] - a[atlasMetric])[0];
      return `<article class="atlas-row" data-provenance="${escapeHtml(example.comparison_provenance)}"><div><strong>${escapeHtml(example.name)}</strong><span>${escapeHtml(example.level)} · ${escapeHtml(example.task)}</span></div><div class="paired-bars"><p><span>Graph2Image</span><i><b class="g2i" style="--score:${graph2image[atlasMetric]}%"></b></i><strong>${Number(graph2image[atlasMetric]).toFixed(1)}%</strong></p><p><span>${escapeHtml(baseline.model)}</span><i><b style="--score:${baseline[atlasMetric]}%"></b></i><strong>${Number(baseline[atlasMetric]).toFixed(1)}%</strong></p></div></article>`;
    }).join("")}`;
    window.requestAnimationFrame(() => chart.classList.add("drawn"));
  };

  fetch("public/assets/examples.json")
    .then(response => { if (!response.ok) throw new Error(`Example manifest returned ${response.status}`); return response.json(); })
    .then(data => { examples = data.examples.filter(example => example.saved_result === true); renderExample(); renderAtlas(); })
    .catch(error => {
      if (viewer) viewer.innerHTML = `<p class="protocol">Saved examples could not be loaded. Start the demo through the local web server rather than opening the HTML file directly.</p>`;
      console.error(error);
    });
  $("#example-prev")?.addEventListener("click", () => { if (examples.length) { exampleIndex = (exampleIndex - 1 + examples.length) % examples.length; activeTab = "performance"; renderExample(); } });
  $("#example-next")?.addEventListener("click", () => { if (examples.length) { exampleIndex = (exampleIndex + 1) % examples.length; activeTab = "performance"; renderExample(); } });
  $$("[data-atlas-metric]").forEach(button => button.addEventListener("click", () => {
    atlasMetric = button.dataset.atlasMetric;
    $$("[data-atlas-metric]").forEach(item => item.classList.toggle("active", item === button));
    renderAtlas();
  }));

  const channelImage = $("#channel-image");
  const channelNote = $("#channel-note");
  $$("[data-channel]").forEach(button => button.addEventListener("click", () => {
    const channel = button.dataset.channel;
    $$("[data-channel]").forEach(item => item.classList.toggle("active", item === button));
    if (!channelImage) return;
    channelImage.style.opacity = "0";
    window.setTimeout(() => {
      channelImage.src = `public/assets/examples/depmap-${channel}.png`;
      channelImage.alt = `${channel[0].toUpperCase() + channel.slice(1)} channel from the saved DepMap Common Essential example`;
      channelImage.style.opacity = "1";
      if (channelNote) channelNote.textContent = `DepMap Common Essential sample 14352 · ${channel} channel`;
      const glow = $(".channel-glow");
      if (glow) glow.style.background = channel === "feature" ? "var(--coral)" : "var(--blue)";
    }, 180);
  }));

  $("#copy-bibtex")?.addEventListener("click", async event => {
    const text = $("#bibtex")?.innerText.trim() || "";
    try {
      await navigator.clipboard.writeText(text);
      event.currentTarget.textContent = "Copied";
    } catch {
      $("#bibtex")?.focus();
      event.currentTarget.textContent = "Select citation below";
    }
    window.setTimeout(() => { event.currentTarget.textContent = "Copy BibTeX"; }, 1800);
  });
  $("#year").textContent = String(new Date().getFullYear());
})();
