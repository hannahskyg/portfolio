import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
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

  // Create SVG
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // X scale: time scale for commit dates
  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  // Y scale: hour of day
  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // Add horizontal gridlines behind dots
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat('')                // no labels
        .tickSize(-usableArea.width)   // full-width lines
    );

  // Add X axis
  const xAxis = d3.axisBottom(xScale);
  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis);

  // Add Y axis with formatted hours
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');
  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis);
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
 const rScale = d3.scaleSqrt()
  .domain([minLines, maxLines])
  .range([2, 30]);
  // Draw dots on top of gridlines and axes
  svg.append('g')
  .attr('class', 'dots')
  .selectAll('circle')
  .data(commits)
  .join('circle')
  .attr('cx', d => xScale(d.datetime))
  .attr('cy', d => yScale(d.hourFrac))
  .attr('r', d => rScale(d.totalLines))  // ← Use the scale here
  .attr('fill', 'steelblue')
  .style('fill-opacity', 0.7)  // ← Add transparency
  .on('mouseenter', (event, commit) => {
    d3.select(event.currentTarget).style('fill-opacity', 1); // ← Full opacity on hover
    renderTooltipContent(commit);
    updateTooltipVisibility(true);
    updateTooltipPosition(event);
  })
  .on('mouseleave', (event) => {
    d3.select(event.currentTarget).style('fill-opacity', 0.7); // ← Restore transparency
    updateTooltipVisibility(false);
  });
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
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

let data = await loadData();
let commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);