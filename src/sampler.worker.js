// Samples models off the main thread so switching never stalls rendering.
import { findModel, sampleModel } from './models/index.js';

self.onmessage = ({ data: { id, count, seed } }) => {
  const s = sampleModel(findModel(id), count, seed);
  self.postMessage({ id, ...s }, [s.positions.buffer, s.explode.buffer, s.colors.buffer, s.partIds.buffer]);
};
