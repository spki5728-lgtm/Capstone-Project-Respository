// Who is calling? Every API function starts with requireUser().
import { getUser, type User } from "@netlify/identity";

// Returns the logged-in Netlify Identity user, or a 401 response to send back.
export async function requireUser(): Promise<User | Response> {
  const user = await getUser();
  return user ?? Response.json({ error: "Please log in." }, { status: 401 });
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
