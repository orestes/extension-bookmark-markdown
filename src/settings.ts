export const SaveMode = {
  Download: "download",
  Server: "server",
} as const;

export type SaveMode = (typeof SaveMode)[keyof typeof SaveMode];
