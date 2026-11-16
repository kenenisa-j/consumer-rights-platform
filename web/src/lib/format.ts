export const MB = 1024 * 1024;

/** 1.2 MB, 340 KB. */
export const formatSize = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
