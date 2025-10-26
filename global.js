console.log('IT’S ALIVE!');

//function $$(selector, context = document) {
 // return Array.from(context.querySelectorAll(selector));
//}
//$$('nav a')
//let currentLink = navLinks.find(
 // (a) => a.host === location.host && a.pathname === location.pathname,
//);
//currentLink.classList.add('current');
//if (currentLink) {
  // or if (currentLink !== undefined)
  //currentLink.classList.add('current');
//}
//currentLink?.classList.add('current');

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/portfolio/";         // GitHub Pages repo name
  

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/hannahskyg', title: 'GitHub' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  if (a.host !== location.host) {
    a.target = "_blank";
  }
}


// making html button switch for color scheme
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

// figuring out the switch 4.4
const select = document.querySelector('.color-scheme select');

// 3.4.4-4.5 fx to set color scheme
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}
// finding local storge color scheme (for automatoic)
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

// 3.4.4 addeventlinkener for the select
select.addEventListener('input', function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

//4.1.2
export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

// 4.1.4
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  // validating containerElement
  if (!(containerElement instanceof HTMLElement)) {
    console.error('Invalid or missing container element.');
    return;
  }

  // validating projects
  if (!Array.isArray(projects)) {
    console.error('Invalid project data — expected an array.');
    containerElement.innerHTML = '<p>Error loading projects.</p>';
    return;
  }

  // validating headingLevel
  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadings.includes(headingLevel)) {
    console.warn(`Invalid heading level "${headingLevel}" — defaulting to h2.`);
    headingLevel = 'h2';
  }
  // Clear existing content
  containerElement.innerHTML = '';

  
  projects.forEach(project => {
    const article = document.createElement('article');

    const title = project.title;
    const image = project.image.startsWith('http') ? project.image : BASE_PATH + project.image;
    const description = project.description;

    article.innerHTML = `
    <${headingLevel}>${title}</${headingLevel}>
    <img src="${image}" alt="${title}">
    <p>${description}</p>
    `;
  containerElement.appendChild(article);
  });
  }

  export async function fetchGitHubData(username) {
  // return statement here
  return fetchJSON(`https://api.github.com/users/${username}`);
}