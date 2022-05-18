const NODE_SIZE = 40;
const NODE_SPACING = [5 * NODE_SIZE, 5 * NODE_SIZE];
const ARROW_SIZE = (NODE_SIZE * NODE_SIZE) / 15.0;
const ARROW_LENGTH = Math.sqrt((4 * ARROW_SIZE) / Math.sqrt(3));
const ARROW = d3.symbol().type(d3.symbolTriangle).size(ARROW_SIZE);
const TEXT_SPACING = NODE_SIZE * 1.5 + 10;
const TEXT_PADDING = [10, 5];

function distance(a, b) {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return Math.sqrt(x * x + y * y);
}

function computeArrowTransform(edge, target) {
  let high = edge.controller.line.getTotalLength() - target * 0.95;
  let low = 0;
  let search = edge.controller.line.getTotalLength() - target;
  const end = edge.points[edge.points.length - 1];

  let radius = distance(edge.controller.line.getPointAtLength(search), end);
  while (Math.abs(radius - target) > 5) {
      if (radius > target) {
        high = search;
      } else {
        low = search;
      }

      search = (high + low) / 2;
      radius = distance(edge.controller.line.getPointAtLength(search), end);
  }

  const final = edge.controller.line.getPointAtLength(search);
  const finalPrime = edge.controller.line.getPointAtLength(search + 5);
  const dx = final.x - finalPrime.x;
  const dy = final.y - finalPrime.y;
  const angle = (Math.atan2(-dy, -dx) * 180) / Math.PI + 90;
  return `translate(${final.x}, ${final.y}) rotate(${angle})`;
}

function computeArrowTransformNaive(edge, path) {
  const [end, start] = edge.points.slice().reverse();
  const dx = start.x - end.x;
  const dy = start.y - end.y;
  const scale = (NODE_SIZE * 1.15) / Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(-dy, -dx) * 180) / Math.PI + 90;
  return `translate(${end.x + dx * scale}, ${end.y + dy * scale}) rotate(${angle})`;
}

const DEGREES = ["red", "orange", "yellow", "green", "blue", "purple"];

function onMouseOut(event) {
  const topic = d3.select(event.target).datum();
  topic._circle.style.fill = "white";
  topic._textBox.style.fill = "rgba(255, 255, 255, 0.85)";

  let degree = 1;
  let incoming = topic._incoming;

  while (incoming.length > 0) {
    let newIncoming = [];
    const color = "white";
    for (const edge of incoming) {
      edge._line.style.stroke = color;
      edge._arrow.style.stroke = color;
      edge._arrow.style.fill = color;
      edge.source._circle.style.fill = color;
      edge.source._textBox.style.fill = "rgba(255, 255, 255, 0.85)";
      newIncoming.push(...edge.source._incoming);
    }

    incoming = newIncoming;
    degree += 1;
  }
}


class NodeController {
  constructor(node) {
    this.node = new WeakRef(node);
    this.group = null;
    this.circle = null;
    this.text = null;
    this.textBox = null;
    this.textBoxGeometry = null;
    this.incoming = [];
    this.outgoing = [];
  }

  setText(text) {
    this.text = text;
    this.computeTextBoxGeometry();
  }

  computeTextBoxGeometry() {
    const box = this.text.getBBox();
    this.textBoxGeometry = {
      width: box.width + TEXT_PADDING[0] * 2,
      height: box.height + TEXT_PADDING[1] * 2,
      x: box.x - TEXT_PADDING[0],
      y: box.y - TEXT_PADDING[1],
    };
  }

  *ancestors() {
    let incoming = this.incoming;
    while (incoming.length > 0) {
      let newIncoming = [];
      for (const edge of incoming) {
        yield edge;
        newIncoming.push(...edge.source.controller.incoming);
      }
      incoming = newIncoming;
    }
  }

  enter() {
    this.group.classList.add("hover");
    for (const edge of this.ancestors()) {
      edge.controller.group.classList.add("hover-ancestor");
      edge.source.controller.group.classList.add("hover-ancestor");
    }
  }

  leave() {
    this.group.classList.remove("hover");
    for (const edge of this.ancestors()) {
      edge.controller.group.classList.remove("hover-ancestor");
      edge.source.controller.group.classList.remove("hover-ancestor");
    }
  }

  select() {
    this.group.classList.add("select");
  }

  deselect() {
    this.group.classList.remove("select");
  }
}

class EdgeController {
  constructor(edge) {
    this.edge = new WeakRef(edge);
    this.group = null;
    this.line = null;
    this.arrow = null;
  }
}

class Graph {
  constructor(svg) {
    this.svg = svg;
    this.dag = null;
    this.links = null;
    this.selection = null;

    // Rendering utilities
    this.layout = d3
      .sugiyama()
      .layering(d3.layeringLongestPath())
      .decross(d3.decrossTwoLayer())
      .coord(d3.coordSimplex())
      .nodeSize((node) => node === undefined ? [0, 0] : NODE_SPACING);
    this.line = d3
      .line()
      .curve(d3.curveCatmullRom)
      .x((d) => d.x)
      .y((d) => d.y);

    // Zoom and pan
    this.group = this.svg.append("g");
    this.zoom = d3.zoom()
      .scaleExtent([0.5, Infinity])
      .on("zoom", (event) => this.group.attr("transform", event.transform));
    this.svg.call(this.zoom);
  }

  load(curriculum) {
    // Generate graph and layout
    this.dag = d3.dagStratify()(curriculum);
    const {width, height} = this.layout(this.dag);

    // Size SVG and zoom
    const safe = {x: -NODE_SIZE, y: -NODE_SIZE, w: width + 2 * NODE_SIZE, h: height + 2 * NODE_SIZE};
    this.svg.attr("viewBox", `${safe.x} ${safe.y} ${safe.w} ${safe.h}`);
    this.zoom.translateExtent([[safe.x, safe.y], [safe.w, safe.h]]);

    // Attach controller to nodes and edges
    this.dag.descendants().forEach((node) => node.controller = new NodeController(node));
    this.links = this.dag.links();
    this.links.forEach((edge) => {
      edge.controller = new EdgeController(edge);
      edge.source.controller.outgoing.push(edge);
      edge.target.controller.incoming.push(edge);
    });

    // Clear
    this.group.enter().remove();

    // Generate edge groups
    const edges = this.group
      .append("g")
      .selectAll("g")
      .data(this.links)
      .enter()
      .append("g")
      .classed("edge", true)
      .call((selection) => selection.each(function(edge) { edge.controller.group = this; }));

    // Edge line
    edges
      .append("path")
      .attr("d", ({ points }) => this.line(points))
      .classed("edge-line", true)
      .call((selection) => selection.each(function(edge) { edge.controller.line = this; }));

    // Edge arrows
    edges
      .append("path")
      .attr("d", ARROW)
      .classed("edge-arrow", true)
      .attr("transform", (edge) => computeArrowTransform(edge, NODE_SIZE + ARROW_LENGTH / 2))
      .call((selection) => selection.each(function(edge) { edge.controller.arrow = this; }));

    // Node groups
    const nodes = this.group
      .append("g")
      .selectAll("g")
      .data(this.dag.descendants())
      .enter()
      .append("g")
      .classed("node", true)
      .attr("transform", (topic) => `translate(${topic.x}, ${topic.y})`)
      .call((selection) => selection.each(function(node) { node.controller.group = this; }));

    // Plot node circles
    nodes
      .append("circle")
      .attr("r", NODE_SIZE)
      .classed("node-circle", true)
      .on("mouseover", (event) => d3.select(event.target).datum().controller.enter())
      .on("mouseout", (event) => d3.select(event.target).datum().controller.leave())
      .on("click", (event) => this.select(event.target))
      .call((selection) => selection.each(function(node) { node.controller.circle = this; }));

    // Add text to nodes
    nodes
      .append("text")
      .text((node) => node.data.title)
      .attr("transform", `translate(0, ${TEXT_SPACING})`)
      .classed("node-text", true)
      .call((selection) => selection.each(function(node) { node.controller.setText(this); }));

    // Add background to text
    nodes
      .insert("rect", "text")
      .attr("x", (node) => node.controller.textBoxGeometry.x)
      .attr("y", (node) => node.controller.textBoxGeometry.y)
      .attr("width", (node) => node.controller.textBoxGeometry.width)
      .attr("height", (node) => node.controller.textBoxGeometry.height)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("transform", `translate(0, ${TEXT_SPACING})`)
      .classed("node-text-box", true)
      .call((selection) => selection.each(function(node) { node.controller.textBox = this; }));
  }

  select(target) {
    const selection = d3.select(target).datum();
    if (this.selection) {
      this.selection.controller.deselect();
    }

    if (this.selection === selection) {
      d3.select("#content").classed("visible", false);
      this.selection = null;
      // this.zoom.scaleBy(this.group, 0.6);
      // this.zoom.translateBy(this.group, -window.innerWidth * 0.6, 0);
    } else {
      if (this.selection === null) {
        // this.zoom.scaleBy(this.group,1 / 0.7);
        // this.zoom.translateBy(this.group, window.innerWidth * 0.6, 0);
      }

      this.selection = selection;
      this.selection.controller.select();
      d3.select("#content").classed("visible", true);
      d3.select("#title").text(this.selection.data.title);
      d3.select("#body").html(this.selection.data.content);
    }
  }
}

window.addEventListener("load", () => {
  window.graph = new Graph(d3.select("#svg"));
  window.graph.load(curricula.cpp);
});
