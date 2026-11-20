const projectStorageKey = "niraj-portfolio-projects";
const portfolioData = window.PORTFOLIO_DATA;
const publishedProjects = Array.isArray(portfolioData.projects) ? portfolioData.projects : [];
const projectList = document.querySelector("#admin-project-list");
const projectForm = document.querySelector("#project-form");
const projectIdInput = document.querySelector("#project-id");
const formHeading = document.querySelector("#form-heading");
const statusMessage = document.querySelector("#admin-status");
const cancelButton = document.querySelector("#cancel-edit");
const deleteButton = document.querySelector("#delete-project");
let projects = loadProjects();

function showStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", Boolean(isError));
}

function loadProjects() {
  try {
    const savedProjects = localStorage.getItem(projectStorageKey);
    if (!savedProjects) {
      return [...publishedProjects];
    }

    const parsedProjects = JSON.parse(savedProjects);
    if (Array.isArray(parsedProjects)) {
      return parsedProjects;
    }
    throw new TypeError("Saved work data must be a list.");
  } catch (error) {
    console.error("Could not load the saved work draft.", error);
    showStatus("The saved draft could not be read. You can discard it and start from the published work.", true);
    return [...publishedProjects];
  }
}

function saveProjects(nextProjects) {
  try {
    localStorage.setItem(projectStorageKey, JSON.stringify(nextProjects));
    projects = nextProjects;
    return true;
  } catch (error) {
    console.error("Could not save the work draft in this browser.", error);
    showStatus("Could not save this draft in the browser. Export the data or check browser storage settings.", true);
    return false;
  }
}

function renderProjectList() {
  projectList.replaceChildren();
  if (!projects.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "admin-empty";
    emptyMessage.textContent = "No work items yet. Add your first project.";
    projectList.append(emptyMessage);
    return;
  }

  projects.forEach((project) => {
    const entry = document.createElement("article");
    entry.className = "admin-project-entry";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = project.title;
    const category = document.createElement("small");
    category.textContent = project.category;
    copy.append(title, category);

    const editButton = document.createElement("button");
    editButton.className = "admin-edit-button";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${project.title}`);
    editButton.addEventListener("click", () => editProject(project.id));
    entry.append(copy, editButton);
    projectList.append(entry);
  });
}

function resetForm() {
  projectForm.reset();
  projectIdInput.value = "";
  formHeading.textContent = "Add work";
  cancelButton.hidden = true;
  deleteButton.hidden = true;
}

function detailValue(project, label) {
  const detail = (project.details || []).find(([name]) => name === label);
  return detail ? detail[1] : "";
}

function editProject(id) {
  const project = projects.find((item) => item.id === id);
  if (!project) {
    showStatus("That work item is no longer available. Refresh the editor and try again.", true);
    return;
  }

  projectIdInput.value = project.id;
  projectForm.elements.title.value = project.title;
  projectForm.elements.category.value = project.category;
  projectForm.elements.mark.value = project.mark || "";
  projectForm.elements.theme.value = project.theme || "water";
  projectForm.elements.description.value = project.description;
  projectForm.elements.detailDescription.value = project.detailDescription || "";
  projectForm.elements.focus.value = detailValue(project, "Focus");
  projectForm.elements.method.value = detailValue(project, "Method");
  projectForm.elements.approach.value = detailValue(project, "Approach");
  formHeading.textContent = "Edit work";
  cancelButton.hidden = false;
  deleteButton.hidden = false;
  projectForm.elements.title.focus();
}

function createProjectId() {
  let id;
  do {
    id = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (projects.some((project) => project.id === id));
  return id;
}

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(projectForm);
  const id = projectIdInput.value || createProjectId();
  const details = [
    ["Focus", formData.get("focus").trim()],
    ["Method", formData.get("method").trim()],
    ["Approach", formData.get("approach").trim()],
    ["Status", "Academic portfolio category"],
  ].filter(([, value]) => value);
  const project = {
    id,
    category: formData.get("category").trim(),
    title: formData.get("title").trim(),
    description: formData.get("description").trim(),
    detailDescription: formData.get("detailDescription").trim(),
    mark: formData.get("mark").trim(),
    theme: formData.get("theme"),
    details,
  };
  const nextProjects = projectIdInput.value
    ? projects.map((item) => item.id === id ? project : item)
    : [...projects, project];

  if (saveProjects(nextProjects)) {
    renderProjectList();
    resetForm();
    showStatus("Saved in this browser. Use the preview link or download the data file to publish.");
  }
});

document.querySelector("#add-project").addEventListener("click", () => {
  resetForm();
  projectForm.elements.title.focus();
});

cancelButton.addEventListener("click", resetForm);

deleteButton.addEventListener("click", () => {
  const project = projects.find((item) => item.id === projectIdInput.value);
  if (!project || !window.confirm(`Delete “${project.title}” from this local draft?`)) {
    return;
  }

  const nextProjects = projects.filter((item) => item.id !== project.id);
  if (saveProjects(nextProjects)) {
    renderProjectList();
    resetForm();
    showStatus("Work item removed from this browser's draft. Export the data file to publish the change.");
  }
});

document.querySelector("#reset-projects").addEventListener("click", () => {
  if (!window.confirm("Discard this browser's work draft and restore the published work list?")) {
    return;
  }

  try {
    localStorage.removeItem(projectStorageKey);
    projects = [...publishedProjects];
    renderProjectList();
    resetForm();
    showStatus("Local draft discarded. The published work list has been restored.");
  } catch (error) {
    console.error("Could not discard the local work draft.", error);
    showStatus("Could not discard the local draft. Check browser storage settings and try again.", true);
  }
});

document.querySelector("#export-projects").addEventListener("click", () => {
  const updatedData = { ...portfolioData, projects };
  const source = `window.PORTFOLIO_DATA = ${JSON.stringify(updatedData, null, 2)};\n`;
  const file = new Blob([source], { type: "text/javascript;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = "portfolio-data.js";
  downloadLink.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  showStatus("Downloaded portfolio-data.js. Replace the existing file in your site folder, then redeploy.");
});

renderProjectList();
