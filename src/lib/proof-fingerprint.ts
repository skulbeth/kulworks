// Fingerprint of a card's print file, so re-uploading a whole export only sends the
// cards that really changed. For PNGs only the image header and pixel data count:
// an exporter re-stamping the date or other metadata chunks doesn't make it "new".
// Runs in the browser (crypto.subtle) and in Node 20+, so both give the same answer.
export async function fingerprint(bytes: ArrayBuffer): Promise<string> {
  const u8 = new Uint8Array(bytes);
  const PNG = [137, 80, 78, 71, 13, 10, 26, 10];
  let data: Uint8Array = u8;
  if (u8.length > 8 && PNG.every((b, i) => u8[i] === b)) {
    const parts: Uint8Array[] = [];
    const view = new DataView(bytes);
    for (let p = 8; p + 8 <= u8.length; ) {
      const len = view.getUint32(p);
      const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
      if (type === "IHDR" || type === "PLTE" || type === "tRNS" || type === "IDAT") parts.push(u8.subarray(p + 8, p + 8 + len));
      if (type === "IEND") break;
      p += 12 + len;
    }
    if (parts.length) {
      data = new Uint8Array(parts.reduce((n, a) => n + a.length, 0));
      let o = 0;
      for (const a of parts) {
        data.set(a, o);
        o += a.length;
      }
    }
  }
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
