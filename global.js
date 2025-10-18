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

// 4.4-4.5 fx to set color scheme
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}
// finding local storge color scheme (for automatoic)
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

// 4.4 addeventlinkener for the select
select.addEventListener('input', function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});