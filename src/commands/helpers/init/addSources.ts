import { outro, select, selectKey, text } from "@clack/prompts";
import type { sourceType } from "../../../types/sourcetype";

export async function AddSources(sources: sourceType[]) {
  const IsPublic = await select({
    message: "Is source a public repo",
    options: [
      { value: "false", label: "NO" },
      { value: "true", label: "YES" },
    ],
  });
  if (IsPublic == "true") {
    const source: sourceType = {
      path: (await text({
        message: "Enter the source url...",
        placeholder: "github:qamarqonlabs/qamarqonlabs-registry",
      })) as string,
      isPublic: true,
      authToken: "none",
    };
    sources.push(source);
  } else {
    const source: sourceType = {
      path: (await text({
        message: "Enter the source url...",
        placeholder: "github:qamarqonlabs/qamarqonlabs-registry",
      })) as string,
      isPublic: false,
      authToken: (await text({
        message: "Enter your Personal Access Token to repo",
        placeholder: "ghp_....",
      })) as string,
    };
    sources.push(source);
  }
  const hasMore = await select({
    message: "wanna add more repos",
    options: [
      { value: "fasle", label: "NO" },
      { value: "true", label: "YES" },
    ],
  });
  if (hasMore == "true") {
    await AddSources(sources);
    return sources;
  } else {
    console.log("in function return statement: ", sources);
    return await sources;
  }
}
