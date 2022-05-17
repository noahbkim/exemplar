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

function computeArrowTransform(edge, path, target) {
  let high = path.getTotalLength() - target * 0.95;
  let low = 0;
  let search = path.getTotalLength() - target;
  const end = edge.points[edge.points.length - 1];

  let radius = distance(path.getPointAtLength(search), end);
  while (Math.abs(radius - target) > 5) {
      if (radius > target) {
        high = search;
      } else {
        low = search;
      }

      search = (high + low) / 2;
      radius = distance(path.getPointAtLength(search), end);
  }

  const final = path.getPointAtLength(search);
  const finalPrime = path.getPointAtLength(search + 5);
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

function onMouseOver(event) {
  const topic = d3.select(event.target).datum();
  topic._circle.style.fill = "red";
  topic._textBox.style.fill = "red";

  let degree = 1;
  let incoming = topic._incoming;

  while (incoming.length > 0) {
    let newIncoming = [];
    const color = DEGREES[degree % DEGREES.length];
    for (const edge of incoming) {
      edge._line.style.stroke = color;
      edge._arrow.style.stroke = color;
      edge._arrow.style.fill = color;
      edge.source._circle.style.fill = color;
      edge.source._textBox.style.fill = color;
      newIncoming.push(...edge.source._incoming);
    }

    incoming = newIncoming;
    degree += 1;
  }
}

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

function onClick(event) {
  const topic = d3.select(event.target).datum();
  d3.select("#content").classed("visible", true);
  d3.select("#title").text(topic.data.title);
  d3.select("#body").html(topic.data.content);
}


class NodeElements {

}

class EdgeElements {

}

class Graph {
  constructor(svg) {
    this.svg = svg;
  }
}



window.addEventListener("load", () => {
  const svg = d3.select("#svg");
  const topics = d3
    .dagStratify()(curricula.cpp);

  window.topics = topics;

  for (const topic of topics.descendants()) {
    topic._incoming = [];
    topic._outgoing = [];
  }

  const layout = d3
    .sugiyama()
    .layering(d3.layeringLongestPath())
    .decross(d3.decrossTwoLayer())
    .coord(d3.coordSimplex())
    .nodeSize((node) => node === undefined ? [0, 0] : NODE_SPACING);

  const {width, height} = layout(topics);
  svg.attr("viewBox", `${-NODE_SIZE} ${-NODE_SIZE} ${width + 2 * NODE_SIZE} ${height + 2 * NODE_SIZE}`);

  const group = svg.append("g");
  const zoom = d3.zoom()
    .scaleExtent([0.5, Infinity])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", (event) => group.attr("transform", event.transform));
  svg.call(zoom);

  const line = d3
    .line()
    .curve(d3.curveCatmullRom)
    .x((d) => d.x)
    .y((d) => d.y);

  const links = topics.links();

  const edges = group
    .append("g")
    .selectAll("path")
    .data(links)
    .enter()
    .append("path")
    .attr("d", ({ points }) => line(points))
    .attr("fill", "none")
    .attr("stroke-width", 3)
    .attr("stroke", "white")
    .call((selection) => selection.each(function(link) {
      link._line = this;
      link.source._outgoing.push(link);
      link.target._incoming.push(link);
    }));

  // Arrows for edges
  group
    .append("g")
    .selectAll("path")
    .data(links)
    .enter()
    .append("path")
    .attr("d", ARROW)
    .attr("transform", (edge, index) => computeArrowTransform(edge, edges.nodes()[index], NODE_SIZE + ARROW_LENGTH / 2))
    .attr("fill", "white")
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .call((selection) => selection.each(function(link) { link._arrow = this; }));

  const nodes = group
    .append("g")
    .selectAll("g")
    .data(topics.descendants())
    .enter()
    .append("g")
    .attr("transform", (topic) => `translate(${topic.x}, ${topic.y})`);

  // Plot node circles
  nodes
    .append("circle")
    .attr("r", NODE_SIZE)
    .attr("fill", "white")
    .call((selection) => selection.each(function(topic) { topic._circle = this; }))
    .on("mouseover", onMouseOver)
    .on("mouseout", onMouseOut)
    .on("click", onClick);

  // Add text to nodes
  nodes
    .append("text")
    .text((node) => node.data.title)
    .attr("font-weight", "bold")
    .attr("font-family", "sans-serif")
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .attr("transform", `translate(0, ${TEXT_SPACING})`)
    .call((selection) => selection.each(function(topic) { topic._text = this; }));

  // Add background to text
  nodes
    .insert("rect", "text")
    .attr("width", (node) => node._text.getBBox().width + TEXT_PADDING[0] * 2)
    .attr("height", (node) => node._text.getBBox().height + TEXT_PADDING[1] * 2)
    .attr("x", (node) => node._text.getBBox().x - TEXT_PADDING[0])
    .attr("y", (node) => node._text.getBBox().y - TEXT_PADDING[1])
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("transform", `translate(0, ${TEXT_SPACING})`)
    .style("fill", "rgba(255, 255, 255, 0.85)")
    .call((selection) => selection.each(function(topic) { topic._textBox = this; }));
});
