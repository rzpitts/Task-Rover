[README.md](https://github.com/user-attachments/files/21703573/README.md)
# Task Rover

Task Rover is a minimalist, mobile‑first task management application inspired by classic kanban boards.  It is designed to be intuitive to use on a phone but scales gracefully to tablets and desktops.  Tasks are grouped into three columns — **To Do**, **In Progress**, and **Done** — and can be created, edited, moved between columns and marked complete with just a couple of taps or clicks.

## Features

- **Quick Add** — Add a task from the header bar.  You can inline‑specify a due date with `@YYYY‑MM‑DD` and a priority with `!` (high), `!!` (medium) or `!!!` (low).
- **Kanban Board** — Tasks are organized into three columns.  On mobile, the columns stack vertically; on tablets and desktop they appear side by side.
- **Inline Editing** — Tap/click any task card to open a bottom‑sheet editor.  You can update the title, due date, priority, or move the task to another column.  Deleting a task presents an undo option.
- **Dark & Light Themes** — Toggle between dark and light mode from the header.  Your preference and tasks persist using `localStorage`.
- **Offline Friendly** — Tasks are stored in your browser so you can access them even without a network connection.

## Running the app locally

1. Download or clone the contents of this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).  No build step is required — the app runs entirely in the browser.

If you prefer to serve the files via a local web server (useful for some browser security settings) you can run a simple HTTP server.  For example, if you have Python installed:

```bash
cd task-rover-app
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Deployment

Because Task Rover is just static files, it can be deployed to any static hosting service.  Here are two easy options:

### GitHub Pages

1. Create a new repository on GitHub (e.g. `task-rover`).
2. Copy the contents of `task-rover-app` into the repository root and commit.
3. In the repository settings, enable **GitHub Pages** for the main branch and choose the **/ (root)** folder.
4. GitHub will provision a URL like `https://yourusername.github.io/task-rover` where the app will be served.

### Netlify (Drag‑and‑Drop)

1. Create a free account at [Netlify](https://netlify.com/).
2. Drag the entire `task-rover-app` folder into the Netlify dashboard (or connect it to your Git repository).
3. Netlify will deploy your site automatically and give you a public `.netlify.app` URL.

## Customization

The UI uses CSS variables to define the colour palette, spacing scale, and typography.  You can tweak these in `style.css` to match your own branding.  The application logic lives in `app.js`; for example, you could add additional columns or task attributes by modifying the `statuses` array and the form.

## License

This project is provided without warranty; feel free to use and modify it for personal or commercial projects.  Attribution is appreciated but not required.
