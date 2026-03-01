import { VideoExporter } from './videoExporter';
import { GifExporter } from './gifExporter';
import type { ExportProgress } from './types';

let currentExporter: VideoExporter | GifExporter | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, config, format } = e.data;

  if (type === 'start') {
    try {
      // Re-attach progress callback to send messages back to main thread
      config.onProgress = (progress: ExportProgress) => {
        self.postMessage({ type: 'progress', progress });
      };

      if (format === 'gif') {
        currentExporter = new GifExporter(config);
      } else {
        currentExporter = new VideoExporter(config);
      }

      const result = await currentExporter.export();
      self.postMessage({ type: 'done', result });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message || String(err) });
    } finally {
      currentExporter = null;
    }
  } else if (type === 'cancel') {
    if (currentExporter) {
      currentExporter.cancel();
    }
  }
};
