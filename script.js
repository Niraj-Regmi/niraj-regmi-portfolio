const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const themeToggle = document.querySelector(".theme-toggle");
const projectDialog = document.querySelector("#project-dialog");
const projectList = document.querySelector("#project-list");
const photoDialog = document.querySelector("#photo-dialog");
const photoDialogImage = document.querySelector("#photo-dialog-image");
const photoOriginalLink = document.querySelector("#photo-original-link");
const portfolioData = window.PORTFOLIO_DATA;
const projectStorageKey = "niraj-portfolio-projects";
const themeStorageKey = "niraj-portfolio-theme";
const projectThemes = new Set(["water", "traffic", "compute", "drawing"]);

document.querySelector("#year").textContent = new Date().getFullYear();

function updateThemeToggle() {
  const isDark = document.documentElement.dataset.theme === "dark";
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("title", label);
  themeToggle.setAttribute("aria-pressed", String(isDark));
  document.querySelector('meta[name="theme-color"]').content = isDark ? "#0a0b0d" : "#111827";
}

updateThemeToggle();
themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme !== "dark";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const changeTheme = () => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    updateThemeToggle();
    try {
      localStorage.setItem(themeStorageKey, isDark ? "dark" : "light");
    } catch (error) {
      console.error("Could not save the selected color theme.", error);
    }
  };

  if (!reducedMotion && typeof document.startViewTransition === "function") {
    const bounds = themeToggle.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    document.documentElement.style.setProperty("--theme-transition-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-transition-y", `${y}px`);
    document.documentElement.style.setProperty("--theme-transition-radius", `${radius}px`);
    document.startViewTransition(changeTheme);
  } else {
    changeTheme();
  }

  if (!reducedMotion) {
    themeToggle.classList.remove("is-switching");
    void themeToggle.offsetWidth;
    themeToggle.classList.add("is-switching");
    window.setTimeout(() => themeToggle.classList.remove("is-switching"), 600);
  }
});

function loadPortfolioProjects() {
  const publishedProjects = Array.isArray(portfolioData.projects) ? portfolioData.projects : [];
  try {
    const savedProjects = localStorage.getItem(projectStorageKey);
    if (!savedProjects) {
      return publishedProjects;
    }

    const parsedProjects = JSON.parse(savedProjects);
    if (Array.isArray(parsedProjects)) {
      return parsedProjects;
    }
    console.error("Saved portfolio projects are not a list. Using published project data.");
  } catch (error) {
    console.error("Could not read locally saved portfolio projects. Using published project data.", error);
  }
  return publishedProjects;
}

function createProjectRow(project, index) {
  const row = document.createElement("article");
  row.className = "project-row";

  const number = document.createElement("span");
  number.className = "project-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const icon = document.createElement("div");
  const theme = projectThemes.has(project.theme) ? project.theme : "water";
  icon.className = `project-icon project-${theme}`;
  icon.setAttribute("aria-hidden", "true");
  const mark = document.createElement("span");
  mark.textContent = project.mark || String(index + 1).padStart(2, "0");
  icon.append(mark);

  const text = document.createElement("div");
  text.className = "project-text";
  const category = document.createElement("span");
  category.className = "project-type";
  category.textContent = project.category;
  const title = document.createElement("h3");
  title.textContent = project.title;
  const description = document.createElement("p");
  description.textContent = project.description;
  text.append(category, title, description);

  const button = document.createElement("button");
  button.className = "project-button";
  button.type = "button";
  button.dataset.project = project.id;
  button.setAttribute("aria-label", `View ${project.title} details`);
  button.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg>';

  row.append(number, icon, text, button);
  return row;
}

let projectItems = loadPortfolioProjects();

function renderProjectRows() {
  projectList.replaceChildren(...projectItems.map(createProjectRow));
}

renderProjectRows();

window.addEventListener("storage", (event) => {
  if (event.key === projectStorageKey || event.key === null) {
    projectItems = loadPortfolioProjects();
    renderProjectRows();
  }
});

function openPhotoViewer(image) {
  const imageUrl = image.currentSrc || image.src;
  photoDialogImage.src = imageUrl;
  photoDialogImage.alt = image.alt;
  photoOriginalLink.href = imageUrl;
  photoDialog.showModal();
}

const avatar = document.querySelector("[data-avatar]");
const portraitPath = portfolioData.photos.portrait;
if (portraitPath) {
  avatar.addEventListener("load", () => {
    avatar.classList.add("is-loaded");
  }, { once: true });
  avatar.addEventListener("error", () => {
    avatar.removeAttribute("src");
  }, { once: true });
  avatar.src = portraitPath;
}

document.querySelectorAll("[data-photo]").forEach((image) => {
  const photoPath = portfolioData.photos[image.dataset.photo];
  if (!photoPath) {
    return;
  }

  image.addEventListener("load", () => {
    const frame = image.closest("[data-photo-frame], .photo-placeholder");
    frame.classList.add("has-photo");

    if (image.classList.contains("gallery-image")) {
      frame.tabIndex = 0;
      frame.setAttribute("role", "button");
      frame.setAttribute("aria-label", `Open full-size photo: ${image.alt}`);
      frame.addEventListener("click", () => openPhotoViewer(image));
      frame.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPhotoViewer(image);
        }
      });
    }
  }, { once: true });

  image.addEventListener("error", () => {
    image.removeAttribute("src");
  }, { once: true });
  image.src = photoPath;
});

document.querySelectorAll("[data-profile-link]").forEach((link) => {
  const profileUrl = portfolioData.links[link.dataset.profileLink].trim();
  if (!profileUrl) {
    return;
  }
  if (/^\s*javascript:/i.test(profileUrl)) {
    throw new Error(`Invalid profile URL for ${link.dataset.profileLink}`);
  }

  link.href = profileUrl;
  link.removeAttribute("aria-disabled");
  if (/^https?:\/\//i.test(profileUrl)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  const actionLabels = {
    linkedin: "Open LinkedIn profile",
    facebook: "Open Facebook profile",
  };
  link.querySelector("small").textContent = actionLabels[link.dataset.profileLink] || "Open link";
});

function closeMenu() {
  navLinks.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  navLinks.classList.toggle("is-open", !isExpanded);
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

projectList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project]");
  if (!button) {
    return;
  }

  const project = projectItems.find((item) => item.id === button.dataset.project);
  if (!project) {
    return;
  }

  document.querySelector("#dialog-category").textContent = project.category;
  document.querySelector("#dialog-title").textContent = project.title;
  document.querySelector("#dialog-description").textContent = project.detailDescription || project.description;
  const details = document.querySelector("#dialog-details");
  details.replaceChildren(...(project.details || []).map(([label, value]) => {
    const item = document.createElement("div");
    item.className = "dialog-detail";
    const heading = document.createElement("span");
    heading.textContent = label;
    const text = document.createElement("strong");
    text.textContent = value;
    item.append(heading, text);
    return item;
  }));
  projectDialog.showModal();
});

document.querySelector(".dialog-close").addEventListener("click", () => {
  projectDialog.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (photoDialog.open) {
    photoDialog.close();
  } else if (projectDialog.open) {
    projectDialog.close();
  }
});

projectDialog.addEventListener("click", (event) => {
  if (event.target === projectDialog) {
    projectDialog.close();
  }
});

document.querySelector(".photo-dialog-close").addEventListener("click", () => {
  photoDialog.close();
});

photoDialog.addEventListener("click", (event) => {
  if (event.target === photoDialog) {
    photoDialog.close();
  }
});

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.body.classList.add("reveal-ready");
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".about-grid, .photo-slot, .project-row, .skill-card, .education-row, .contact-card").forEach((element) => {
    element.classList.add("reveal");
    observer.observe(element);
  });
}
