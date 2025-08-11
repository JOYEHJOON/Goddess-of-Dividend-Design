import AdmZip from "adm-zip";

export function readZipEntries(buffer) {
  const zip = new AdmZip(buffer);
  return zip.getEntries().map(e => ({
    name: e.entryName,
    isDir: e.isDirectory,
    getText: () => e.getData().toString("utf-8"),
    getBuffer: () => e.getData()
  }));
}

export function getTextFile(buffer, filename) {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry(filename);
  if (!entry) return null;
  return entry.getData().toString("utf-8");
}
