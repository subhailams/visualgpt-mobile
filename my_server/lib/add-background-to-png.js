import { PNG } from "pngjs";
import bufferToDataUrl from "buffer-to-data-url";


export default function addBackgroundToPNG(dataUrl) {
  const options = {
    colorType: 2,
    bgColor: {
      red: 255,
      green: 255,
      blue: 255,
    },
  };

  const png = PNG.sync.read(dataUriToBuffer(dataUrl));
  const buffer = PNG.sync.write(png, options);

  return bufferToDataUrl("image/png", buffer);
}
