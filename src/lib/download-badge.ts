import { toPng } from "html-to-image";

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `badge-${cleaned || "Participante"}.png`;
}

export async function downloadBadge(node: HTMLElement, participantName: string) {
  await document.fonts.ready;
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );

  const rect = node.getBoundingClientRect();
  const exportWidth = 1080;
  const exportHeight = 1920;
  const pixelRatio = exportWidth / rect.width;

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const dataUrl = await toPng(node, {
    width: rect.width,
    height: rect.height,
    canvasWidth: exportWidth,
    canvasHeight: exportHeight,
    pixelRatio,
    cacheBust: true,
    backgroundColor: "#100d10",
    style: {
      boxShadow: "none",
    },
  });

  const anchor = document.createElement("a");
  anchor.download = safeFileName(participantName);
  anchor.href = dataUrl;
  anchor.click();
}
