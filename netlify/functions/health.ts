// Confirms Functions are deployed and AI Gateway is on.
// Reports only whether the gateway variables exist, never their values.
export default async () => {
  const aiGateway = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_BASE_URL);
  return Response.json({ ok: true, aiGateway });
};
