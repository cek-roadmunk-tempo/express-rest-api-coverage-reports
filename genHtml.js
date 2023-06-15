const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const isFile = (path) => fs.existsSync(path) && !fs.statSync(path).isDirectory();
const MAX_LEVELS = 3;

function addPath(folders, basePath) {
	// Add path info to each folder object
	for (let folder of folders) {
		folder.path = path.join(basePath, folder.name);
	}
}

const BASE_PATH = path.join(__dirname, "public");
const LIST_TEMPLATE = path.join(__dirname, "templates", "dir_listing.ejs");
let hasReport = false;

let entries = fs.readdirSync(BASE_PATH, { withFileTypes: true });
addPath(entries, BASE_PATH);
let subFolders = [entries];

// Only descend three levels of hierarcy
for (let idx = 1; idx <= MAX_LEVELS; idx++) {
	let next = []; // next level of file/subfolders
	for (let folder of subFolders) {
		// Omit any extraneous files
		let folderDirs = folder.filter((entry) => entry.isDirectory());
		if (folderDirs.length === 0) {
			continue;
		}

		// Check if we're at the report level
		hasReport = folderDirs.every((entry) =>
			isFile(path.join(entry.path, "lcov-report", "index.html"))
		);
		if (!hasReport) {
			if (idx === MAX_LEVELS) {
				console.log(`Warning! ${MAX_LEVELS} levels reached, but no report found at ${folderDirs[0].path}`);
			}
			else {
				// Get next level of hierarchy
				const nextLevel = folderDirs.reduce((acc, entry) => {
					const list = fs.readdirSync(entry.path, { withFileTypes: true });
					addPath(list, entry.path);
					acc.push(list);
					return acc;
				}, []);
				next.push(...nextLevel);
			}
		}
		ejs.renderFile(LIST_TEMPLATE, { hasReport, folders: folderDirs }, null, (err, str) => {
			if (err) {
				throw err;
			}
			fs.writeFileSync(
				path.join(folderDirs[0].path, "..", "index.html"),
				str,
				{ encoding: "utf8" }
			);
		});
	}
	// Process next level of folders in next round of loop
	subFolders = next;
}
