(() => {
  const story = document.querySelector(".gfm-story");
  if (!story) return;

  const canvas = story.querySelector(".gfm-canvas");
  const coreLabel = story.querySelector(".gfm-core small");
  const captionNumber = story.querySelector(".gfm-caption span");
  const captionTitle = story.querySelector(".gfm-caption strong");
  const captionLabel = story.querySelector(".gfm-caption small");
  const nodes = [
    [12,27],[23,15],[31,34],[18,50],[38,54],[45,26],[54,42],[63,20],
    [72,37],[83,18],[87,51],[66,64],[48,72],[28,72],[77,76]
  ];
  const edges = [
    [0,1],[0,2],[0,3],[1,2],[2,3],[2,4],[2,5],[4,5],[4,13],[5,6],[5,7],[6,7],
    [6,8],[6,11],[7,8],[7,9],[8,9],[8,10],[8,11],[10,11],[11,12],[11,14],[12,13],[12,14]
  ];
  const stages = [
    ["01", "Describe structural role", "structural prompts"],
    ["02", "Encode two views", "text + graph streams"],
    ["03", "Align across graphs", "shared representation"],
    ["04", "Adapt to a new graph", "zero-shot transfer"]
  ];

  edges.forEach(([from, to], index) => {
    const [ax, ay] = nodes[from];
    const [bx, by] = nodes[to];
    const dx = bx - ax;
    const dy = by - ay;
    const edge = document.createElement("i");
    edge.className = "gfm-edge";
    edge.style.left = `${ax}%`;
    edge.style.top = `${ay}%`;
    edge.style.width = `${Math.hypot(dx, dy)}%`;
    edge.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
    edge.style.setProperty("--edge-delay", `${index * 35}ms`);
    canvas.appendChild(edge);
  });

  const nodeElements = nodes.map(([x, y], index) => {
    const node = document.createElement("span");
    node.className = `gfm-node community-${index % 4}`;
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.style.setProperty("--node-delay", `${index * 70}ms`);
    node.appendChild(document.createElement("b"));
    canvas.appendChild(node);
    return node;
  });

  let stage = 2;
  let timer;
  const render = () => {
    const [number, title, label] = stages[stage];
    story.dataset.gfmStage = String(stage);
    captionNumber.textContent = number;
    captionTitle.textContent = title;
    captionLabel.textContent = label;
    coreLabel.textContent = label;
    nodeElements.forEach((node, index) => {
      node.firstElementChild.textContent = stage === 1 && index % 5 === 0
        ? ["deg", "core", "pr"][index % 3]
        : "";
    });
  };
  const start = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      stage = (stage + 1) % stages.length;
      render();
    }, 2600);
  };
  const stop = () => window.clearInterval(timer);

  story.addEventListener("mouseenter", stop);
  story.addEventListener("mouseleave", start);
  story.addEventListener("focusin", stop);
  story.addEventListener("focusout", start);
  render();
  start();
})();
