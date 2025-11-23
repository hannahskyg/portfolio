import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale;

async function loadData() {
  // Add a timestamp query param to prevent browser caching
  const timestamp = new Date().getTime();
  const csvUrl = `loc.csv?t=${timestamp}`;

  const data = await d3.csv(csvUrl, (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      // Build commit object w/ visible properties
      let ret = {
        id: commit,
        url: 'https://github.com/hannahskyg/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      // Add lines property but make it hidden
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,   // hides it when console.logging / iterating ✅
        writable: true,
        configurable: true,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Helper function to add a stat
  function addStat(label, value) {
    const div = dl.append('div');
    div.append('dt').html(label);
    div.append('dd').text(value);
  }

  // Total LOC
  addStat('Total <abbr title="Lines of code">LOC</abbr>', data.length);

  // Total commits
  addStat('Total commits', commits.length);

  // Number of files
  const numFiles = d3.groups(data, d => d.file).length;
  addStat('Number of files', numFiles);

  // Longest file
  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  const [longestFileName, longestFileLines] = d3.greatest(fileLengths, d => d[1]);
  addStat('Longest file', `${longestFileName} (${longestFileLines} lines)`);

  // Average file length
  const avgFileLength = d3.mean(fileLengths, d => d[1]);
  addStat('Average file length', avgFileLength.toFixed(1));

  // Longest line
  const longestLine = d3.max(data, d => d.length);
  addStat('Longest line', `${longestLine} characters`);

  // Time of day most work is done
  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    d => {
      const hour = d.datetime.getHours();
      if (hour >= 5 && hour < 12) return 'Morning';
      if (hour >= 12 && hour < 17) return 'Afternoon';
      if (hour >= 17 && hour < 21) return 'Evening';
      return 'Night';
    }
  );
  const maxPeriod = d3.greatest(workByPeriod, d => d[1])?.[0];
  addStat('Time of day most work is done', maxPeriod);

  // Day of the week most work is done
  const workByDay = d3.rollups(
    data,
    v => v.length,
    d => d.datetime.toLocaleString('en-US', { weekday: 'long' })
  );
  const maxDay = d3.greatest(workByDay, d => d[1])?.[0];
  addStat('Day of the week most work is done', maxDay);
}




function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const usableArea = {
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Update global scales instead of creating local ones
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat('')
        .tickSize(-usableArea.width)
    );

  const xAxis = d3.axisBottom(xScale);
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');
  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('--r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('tooltip-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleDateString('en-US', { dateStyle: 'full' });
  time.textContent = commit.time;
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}
function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
  
  if (isVisible) {
    tooltip.classList.add('visible');
  } else {
    tooltip.classList.remove('visible');
  }
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}


function createBrushSelector(svg) {
  // Create brush
  svg.call(d3.brush().on('start brush end', brushed));

    // Bring dots to front
  svg.select('.dots').raise();
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }

  // Destructure the selection bounds
  const [[x0, y0], [x1, y1]] = selection;
  
  // Calculate where this commit appears on the chart
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  
  // Check if the commit's position is within the brush bounds
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <div>
        <dt>${language}</dt>
        <dd>${count} lines (${formatted})</dd>
      </div>
    `;
  }
}
let data = await loadData();
let commits = processCommits(data);
let filteredCommits = commits;
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
createBrushSelector(d3.select('svg'));

// -----------------------------
// STEP 1.1: TIME SLIDER FILTER
// -----------------------------
let commitProgress = 100;

let timeScale = d3.scaleTime()
  .domain([
    d3.min(commits, d => d.datetime),
    d3.max(commits, d => d.datetime)
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

const slider = document.getElementById("commit-progress");
const timeDisplay = document.getElementById("commit-time");

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart').select('svg');

  // --- Update x scale ---
  xScale.domain(d3.extent(commits, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  // --- update the x-axis ---
  const xAxisGroup = svg.select('.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  // --- Update dots ---
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  svg.select('g.dots')
    .selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('--r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap(d => d.lines);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  })
  .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3.select('#files')
    .selectAll('div.file-item')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div')
        .attr('class', 'file-item')
        .call(div => {
          div.append('div').attr('class', 'file-info')
            .html(d => `<dt><code>${d.name}</code></dt><div class="file-line-count">${d.lines.length} lines</div>`);
          div.append('dd').attr('class', 'file-dots');
        })
    );

  filesContainer.select('.file-info')
    .html(d => `<dt><code>${d.name}</code></dt><div class="file-line-count">${d.lines.length} lines</div>`);

  filesContainer.select('.file-dots')
    .selectAll('div.loc')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
}



function onTimeSliderChange() {
  commitProgress = +slider.value;
  commitMaxTime = timeScale.invert(commitProgress);

  timeDisplay.textContent = commitMaxTime.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // --- NEW: Filter commits ---
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  // --- NEW: Update scatter plot ---
  updateScatterPlot(data, filteredCommits);

  // --- NEW: Update file display ---
  updateFileDisplay(filteredCommits);
}


// initialize displayed time
onTimeSliderChange();

// attach listener
slider.addEventListener("input", onTimeSliderChange);


