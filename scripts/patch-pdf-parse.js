const fs = require("fs");
const path = require("path");

const targets = [
  path.join(__dirname, "..", "node_modules", "pdf-parse", "lib", "pdf.js", "v1.9.426", "build", "pdf.js"),
  path.join(__dirname, "..", "node_modules", "pdf-parse", "lib", "pdf.js", "v1.10.88", "build", "pdf.js"),
  path.join(__dirname, "..", "node_modules", "pdf-parse", "lib", "pdf.js", "v1.10.100", "build", "pdf.js"),
  path.join(__dirname, "..", "node_modules", "pdf-parse", "lib", "pdf.js", "v2.0.550", "build", "pdf.js"),
];

for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  const original = fs.readFileSync(target, "utf8");
  const patched = original.replace(/input = new Buffer\(literals\);/g, "input = Buffer.from(literals);");
  if (patched !== original) {
    fs.writeFileSync(target, patched, "utf8");
    console.log(`patched ${path.relative(process.cwd(), target)}`);
  }
}
