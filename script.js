// Global references
let htmlEditor, cssEditor, jsEditor;
let templates = {};
let isDarkTheme = localStorage.getItem("theme") !== "light";

// DOM Elements
const runBtn = document.getElementById("run-btn");

const exportBtn = document.getElementById("export-btn");
const exportModal = document.getElementById("exportModal");
const filenameInput = document.getElementById("filenameInput");
const cancelExport = document.getElementById("cancelExport");
const confirmExport = document.getElementById("confirmExport");

const previewFrame = document.getElementById("preview");

const resetBtn = document.getElementById("reset-btn");
const resetModal = document.getElementById("reset-modal");
const confirmReset = document.getElementById("confirm-reset");
const cancelReset = document.getElementById("cancel-reset");

const templateBtn = document.getElementById("template-btn");
const templateWrapper = document.getElementById("template-wrapper");
const dropdown = document.getElementById("template-dropdown");

const themeToggleBtn = document.getElementById("theme-toggle-btn");
const icon = themeToggleBtn.querySelector("i");

const resizer = document.querySelector('.vertical-resizer');
const editorsContainer = document.querySelector('.playground-editors');

const fullscreenBtns = document.querySelectorAll('.fullscreen-btn');
const closeFullscreenBtns = document.querySelectorAll('.close-fullscreen');

let isResizing = false;

// Debounce utility
const debounce = (fn, delay = 300) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
};

// Theme
function applyTheme(isDark) {
    document.body.classList.toggle("light", !isDark);
    const theme = isDark ? "material-darker" : "default";
    [htmlEditor, cssEditor, jsEditor].forEach(editor => editor.setOption("theme", theme));
    icon.className = isDark ? "fas fa-moon" : "fas fa-sun";
}

// Preview
function updatePreview() {
    const html = htmlEditor.getValue();
    const css = `<style>${cssEditor.getValue()}</style>`;
    const js = `<script>${jsEditor.getValue()}<\/script>`;

    previewFrame.srcdoc = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                ${css}
            </head>
            <body>
                ${html}
                ${js}
            </body>
        </html>
    `;
}

// Local Storage
function saveToLocalStorage() {
    const code = {
        htmlCode: htmlEditor.getValue(),
        cssCode: cssEditor.getValue(),
        jsCode: jsEditor.getValue()
    };

    for (const [key, value] of Object.entries(code)) {
        localStorage.setItem(key, value);
    }
}

function restoreCode() {
    htmlEditor.setValue(localStorage.getItem("htmlCode") || htmlEditor.getValue());
    cssEditor.setValue(localStorage.getItem("cssCode") || cssEditor.getValue());
    jsEditor.setValue(localStorage.getItem("jsCode") || jsEditor.getValue());
    updatePreview();
}

// Export
function exportCode(filename) {
    if (!filename.toLowerCase().endsWith(".html")) filename += ".html";

    const fullHTML = `
<!DOCTYPE html>
<html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Exported Playground</title>
    <style>
        ${cssEditor.getValue()}
    </style>
    </head>
    <body>
        ${htmlEditor.getValue()}
        <script>
        ${jsEditor.getValue()}
        <\/script>
    </body>
</html>
    `;

    const blob = new Blob([fullHTML], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Editor Setup
function initializeEditor(id, mode, value) {
    return CodeMirror(document.getElementById(id), {
        mode,
        theme: "material-darker",
        lineNumbers: true,
        styleActiveLine: true,
        value
    });
}

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
    htmlEditor = initializeEditor("html-editor", "xml", "<h1>Hello, Playground!</h1>");
    cssEditor = initializeEditor("css-editor", "css", "h1 { color: red; text-align: center; }");
    jsEditor = initializeEditor("js-editor", "javascript", "console.log('JS is working');");

    applyTheme(isDarkTheme);
    restoreCode();

    [htmlEditor, cssEditor].forEach(ed => ed.on("change", updatePreview));
    jsEditor.on("change", debounce(updatePreview, 300));
    [htmlEditor, cssEditor, jsEditor].forEach(ed => ed.on("change", saveToLocalStorage));

    const resizeObserver = new ResizeObserver(() => [htmlEditor, cssEditor, jsEditor].forEach(ed => ed.refresh()));
    document.querySelectorAll(".editor-container").forEach(container => resizeObserver.observe(container));
});

// Run Preview
runBtn.addEventListener("click", updatePreview);

// Theme Toggle
themeToggleBtn.addEventListener("click", () => {
    isDarkTheme = !isDarkTheme;
    applyTheme(isDarkTheme);
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
});

// Export Modal
exportBtn.addEventListener("click", () => exportModal.style.display = "grid");

cancelExport.addEventListener("click", () => exportModal.style.display = "none");

confirmExport.addEventListener("click", () => {
    exportCode(filenameInput.value.trim() || "untitled");
    exportModal.style.display = "none";
});

// Reset Modal
resetBtn.addEventListener("click", () => resetModal.style.display = "grid");

cancelReset.addEventListener("click", () => resetModal.style.display = "none");

confirmReset.addEventListener("click", () => {
    htmlEditor.setValue("<h1>Hello, Playground!</h1>");
    cssEditor.setValue("h1 { color: red; text-align: center; }");
    jsEditor.setValue("console.log('JS is working');");
    updatePreview();
    resetModal.style.display = "none";
});

// Click Outside to Close Modals
window.addEventListener("click", (e) => {
    if (e.target === resetModal) resetModal.style.display = "none";
    if (e.target === exportModal) exportModal.style.display = "none";
});

// Template Dropdown
fetch("templates.json")
    .then(res => res.json())
    .then(data => {
        templates = data;
        Object.entries(templates).forEach(([key, { title }]) => {
            const option = document.createElement("div");
            option.textContent = title;
            option.dataset.templateKey = key;
            dropdown.appendChild(option);
        });
    });

templateBtn.addEventListener("click", () => dropdown.classList.toggle("hidden"));

dropdown.addEventListener("click", (e) => {
    const key = e.target.dataset.templateKey;
    if (!key) return;
    const tpl = templates[key];
    htmlEditor.setValue(tpl.html);
    cssEditor.setValue(tpl.css);
    jsEditor.setValue(tpl.js);
    updatePreview();
    dropdown.classList.add("hidden");
});

// Close dropdown on outside click
document.addEventListener("click", (e) => {
    if (!templateBtn.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add("hidden");
});

// Resizing
resizer.addEventListener('mousedown', () => {
    isResizing = true;
    document.body.style.cursor = 'ew-resize';
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = e.clientX - editorsContainer.getBoundingClientRect().left;
    if (newWidth >= 300 && newWidth <= window.innerWidth - 100) {
        editorsContainer.style.width = `${newWidth}px`;
        [htmlEditor, cssEditor, jsEditor].forEach(ed => ed.refresh());
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
    }
});

// Fullscreen Toggle
fullscreenBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const wrapper = document.getElementById(btn.dataset.target).closest(".playground-editor");
        wrapper.classList.add('editor-fullscreen');
        wrapper.querySelector('.close-fullscreen').style.display = 'block';
        btn.style.display = 'none';
        setTimeout(() => {
            const editorMap = { "html-editor": htmlEditor, "css-editor": cssEditor, "js-editor": jsEditor };
            editorMap[btn.dataset.target].refresh();
        }, 200);
    });
});

closeFullscreenBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const wrapper = btn.closest(".playground-editor");
        wrapper.classList.remove('editor-fullscreen');
        btn.style.display = 'none';
        wrapper.querySelector('.fullscreen-btn').style.display = 'inline-block';
        const textarea = wrapper.querySelector('textarea');
        const editorMap = { "html-editor": htmlEditor, "css-editor": cssEditor, "js-editor": jsEditor };
        setTimeout(() => editorMap[textarea.id].refresh(), 200);
    });
});