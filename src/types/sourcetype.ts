export type sourceType = {
  path: string; // e.g. "github:owner/repo"
  isPublic: boolean;
  authToken: string; // "none" if public
  alias?: string; // optional friendly name
};

export type QnlabsConfig = {
  dir: string;
  sources: sourceType[];
  added: AddedFile[];
};

export type AddedFile = {
  path: string; // path inside repo
  source: string; // source alias or path
  localPath: string; // where it was written on disk
  addedAt: string; // ISO date
};

export type GitTreeItem = {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
};
