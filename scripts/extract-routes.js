const fs = require("fs");
const path = require("path");

const APP_DIR = path.join(process.cwd(), "src", "app");

const ROUTE_IGNORE = new Set([
    "layout.tsx",
    "loading.tsx",
    "error.tsx",
    "not-found.tsx",
]);

function walk(dir, routes = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath, routes);
        }

        if (entry.isFile() && entry.name === "page.tsx") {
            routes.push(fullPath);
        }
    }

    return routes;
}

function normalizeRoute(filePath) {
    const relative = path.relative(APP_DIR, filePath);

    const segments = relative.split(path.sep);

    const routeSegments = [];

    for (const segment of segments) {
        if (segment === "page.tsx") continue;

        // Remove route groups (e.g., (admin))
        if (segment.startsWith("(") && segment.endsWith(")")) continue;

        routeSegments.push(segment.replace(/\.tsx$/, ""));
    }

    return "/" + routeSegments.join("/");
}

function extractModule(route) {
    const parts = route.split("/").filter(Boolean);

    if (parts.length === 0) return "root";

    return parts[0];
}

function main() {
    if (!fs.existsSync(APP_DIR)) {
        console.error("❌ src/app directory not found.");
        process.exit(1);
    }

    const files = walk(APP_DIR);
    const results = [];

    for (const file of files) {
        const route = normalizeRoute(file);
        const module = extractModule(route);

        results.push({
            route,
            file: path.relative(process.cwd(), file),
            module,
        });
    }

    results.sort((a, b) => a.route.localeCompare(b.route));

    console.log("\n📦 ROUTE INVENTORY\n");

    let moduleCounts = {};

    results.forEach((r, i) => {
        moduleCounts[r.module] = (moduleCounts[r.module] || 0) + 1;

        console.log(
            `${String(i + 1).padStart(3, "0")}  ${r.route.padEnd(50)}  ${r.file}`
        );
    });

    console.log("\n📊 MODULE SUMMARY\n");

    Object.entries(moduleCounts).forEach(([module, count]) => {
        console.log(`${module.padEnd(20)} : ${count}`);
    });

    console.log(`\n✅ TOTAL ROUTES: ${results.length}\n`);
}

main();