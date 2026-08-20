export class DeploymentHookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentHookError";
  }
}

export async function triggerDeployment(
  deployHookUrl: string,
  fetchImplementation: typeof fetch = fetch,
) {
  let response: Response;

  try {
    response = await fetchImplementation(deployHookUrl, { method: "POST" });
  } catch {
    throw new DeploymentHookError(
      "The article changed in Supabase, but the Vercel deployment could not be requested.",
    );
  }

  if (!response.ok) {
    throw new DeploymentHookError(
      "The article changed in Supabase, but Vercel rejected the deployment request.",
    );
  }
}
