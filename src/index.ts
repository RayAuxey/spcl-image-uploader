import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import crypto from "crypto";
import sharp from "sharp";
const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

app.use("/uploads/*", serveStatic());

app.post("/upload", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file") as Blob;
    if (!file) return c.text("no file");
    const dateTime = new Date().toISOString();
    const buffer = crypto.randomBytes(16);
    const name = buffer.toString("hex").substring(0, 16);
    const compressedFile = file.type.includes("image")
      ? await compressFile(file)
      : file;
    const ext = file.type.includes("image")
      ? "jpg"
      : compressedFile.type.split("/")[1];
    const fileName = `${name}-${dateTime}.${ext}`;
    const destination = `./uploads/${fileName}`;
    Bun.write(destination, compressedFile);

    const url = new URL(c.req.url);

    return c.json({
      name: fileName,
      url: `${url.origin}/uploads/${fileName}`,
    });
  } catch (error) {
    console.log(error);
    return c.status(500);
  }
});

async function compressFile(file: Blob): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const sharpImage = sharp(buffer);
  const metadata = await sharpImage.metadata();
  const quality = determineQuality(metadata.size as number);
  const compressedFile = await sharpImage
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  return new Blob([compressedFile]);
}

function determineQuality(size: number) {
  // Size is in KB
  if (size < 100) return 100;
  if (size < 200) return 90;
  if (size < 300) return 80;
  if (size < 400) return 70;
  if (size < 500) return 60;
  if (size < 600) return 50;
  if (size < 700) return 40;
  if (size < 800) return 30;
}

// export default app
export default {
  fetch: app.fetch,
  port: 3000,
};
